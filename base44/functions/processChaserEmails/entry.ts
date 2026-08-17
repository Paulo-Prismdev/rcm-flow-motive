import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ── Token helpers (stateless, HMAC-style) ──
// Token = base64(claimId) + "." + first 24 hex chars of SHA-256(claimId:secret)
async function generateBodyshopToken(claimId: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(claimId + ':' + secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(claimId) + '.' + hashHex.substring(0, 24);
}

// ── Template placeholder replacement ──
function replacePlaceholders(template: string, claim: any): string {
  if (!template) return '';
  return template.replace(/\{\{claim\.(\w+)\}\}/g, (_match, fieldName) => claim[fieldName] || '');
}

// ── Closed-claim check (don't chase closed/invoiced claims) ──
function isClaimClosed(claim: any): boolean {
  if (claim.job_status === 'Cancelled') return true;
  return ['Invoiced', 'Invoice Paid'].includes(claim.invoice_status);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const formSecret = Deno.env.get('PUBLIC_FORM_SECRET');

    // Allow both admin manual runs and automated (no-user) scheduled runs
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'company_admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch {
      // No user context — automated/scheduled call, proceed
    }

    console.log('Starting bodyshop chaser email processing...');

    // Find the active bodyshop chaser rule (use first active rule with recipient_type = Bodyshop)
    const rules = await base44.asServiceRole.entities.ChaserEmailRule.filter(
      { is_active: true, recipient_type: 'Bodyshop' },
      'sort_order'
    );

    if (!rules || rules.length === 0) {
      return Response.json({
        success: true,
        message: 'No active bodyshop chaser rule found',
        claims_evaluated: 0,
        emails_sent: 0,
        emails_skipped: 0
      });
    }

    const rule = rules[0];
    console.log(`Using rule: ${rule.rule_name}`);

    // Fetch all non-archived claims that have a bodyshop allocated
    const claims = await base44.asServiceRole.entities.Claim.filter({ archived: false });

    let totalProcessed = 0;
    let totalSent = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let firstError = '';
    const debugSteps: string[] = [];

    for (const claim of claims) {
      totalProcessed++;

      try {
        if (totalProcessed <= 10) debugSteps.push(`claim${totalProcessed}:start bs=${!!claim.bodyshop_email}`);

        // Skip if no bodyshop email to send to
        if (!claim.bodyshop_email) {
          totalSkipped++;
          continue;
        }

        // Skip closed claims
        if (isClaimClosed(claim)) {
          totalSkipped++;
          continue;
        }

        // ── Find the last INCOMING Bodyshop Communication update ──
        if (totalProcessed <= 10) debugSteps.push(`claim${totalProcessed}:beforeFilter`);
        const incomingUpdates = await base44.asServiceRole.entities.ClaimUpdate.filter(
          { claim_id: claim.id, update_type: 'Bodyshop Communication', direction: 'Incoming' },
          '-created_date',
          1
        );
        if (totalProcessed <= 10) debugSteps.push(`claim${totalProcessed}:afterFilter count=${incomingUpdates?.length || 0}`);

        // Reference time = last incoming update, or bodyshop instruction date, or claim creation
        let referenceTime: Date;
        if (incomingUpdates && incomingUpdates.length > 0) {
          referenceTime = new Date(incomingUpdates[0].created_date);
        } else if (claim.bs_instructed) {
          referenceTime = new Date(claim.bs_instructed);
        } else {
          referenceTime = new Date(claim.created_date);
        }

        const hoursSinceReference = (Date.now() - referenceTime.getTime()) / (1000 * 60 * 60);

        // If less than 48 hours since last incoming update / instruction → on track, skip
        if (hoursSinceReference < 48) {
          totalSkipped++;
          continue;
        }

        // ── Find chaser logs sent since the reference time ──
        if (totalProcessed <= 10) debugSteps.push(`claim${totalProcessed}:beforeLogFilter hrs=${hoursSinceReference.toFixed(1)}`);
        const allChaserLogs = await base44.asServiceRole.entities.ChaserEmailLog.filter(
          { claim_id: claim.id, rule_id: rule.id, status: 'Sent' },
          '-sent_at',
          20
        );
        if (totalProcessed <= 10) debugSteps.push(`claim${totalProcessed}:afterLogFilter count=${allChaserLogs?.length || 0}`);

        const logsSinceReference = (allChaserLogs || []).filter(
          (log) => new Date(log.sent_at) > referenceTime
        );

        // Check max sends
        const maxSends = rule.max_sends || 5;
        if (logsSinceReference.length >= maxSends) {
          totalSkipped++;
          continue;
        }

        // Determine if we should send now:
        // - No chaser sent since reference → send first chaser
        // - Last chaser > 24h ago → send another
        if (logsSinceReference.length > 0) {
          const lastChaserTime = new Date(logsSinceReference[0].sent_at);
          const hoursSinceLastChaser = (Date.now() - lastChaserTime.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastChaser < 24) {
            totalSkipped++;
            continue;
          }
        }

        // ── Generate the bodyshop update link ──
        if (totalProcessed <= 10) debugSteps.push(`claim${totalProcessed}:beforeToken`);
        const token = await generateBodyshopToken(claim.id, formSecret);
        if (totalProcessed <= 10) debugSteps.push(`claim${totalProcessed}:afterToken`);
        const updateLink = `${baseUrl}/bodyshop-update?token=${token}`;

        // ── Build email content ──
        const emailSubject = replacePlaceholders(rule.email_subject_template, claim);
        let emailBody = replacePlaceholders(rule.email_body_template, claim);

        // Append the update link
        emailBody += `\n\n---\n\nYou can log your update directly via this link:\n${updateLink}\n\nAlternatively, you can reply to this email with your update.\n\nKind regards,\nRCM Flow-motive Team`;

        // ── Send the email ──
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: claim.bodyshop_email,
            subject: emailSubject,
            body: emailBody
          });

          console.log(`✅ Sent chaser for claim ${claim.job_number} to ${claim.bodyshop_email}`);

          // Log to ChaserEmailLog
          await base44.asServiceRole.entities.ChaserEmailLog.create({
            claim_id: claim.id,
            rule_id: rule.id,
            rule_name: rule.rule_name,
            recipient_email: claim.bodyshop_email,
            recipient_type: 'Bodyshop',
            email_subject: emailSubject,
            email_body: emailBody,
            sent_at: new Date().toISOString(),
            status: 'Sent',
            claim_status_at_send: claim.job_status,
            days_in_status_at_send: Math.floor(hoursSinceReference / 24)
          });

          // Also create a ClaimUpdate for tracking (Outgoing Bodyshop Communication)
          await base44.asServiceRole.entities.ClaimUpdate.create({
            claim_id: claim.id,
            update_type: 'Bodyshop Communication',
            direction: 'Outgoing',
            platform: 'E-Mail',
            description: `[Automated Chaser] Sent to ${claim.bodyshop_email}`,
            next_steps: 'Awaiting bodyshop response'
          });

          totalSent++;
        } catch (emailError: any) {
          console.error(`❌ Failed to send chaser for claim ${claim.job_number}:`, emailError);
          totalErrors++;

          await base44.asServiceRole.entities.ChaserEmailLog.create({
            claim_id: claim.id,
            rule_id: rule.id,
            rule_name: rule.rule_name,
            recipient_email: claim.bodyshop_email,
            recipient_type: 'Bodyshop',
            email_subject: emailSubject,
            email_body: emailBody,
            sent_at: new Date().toISOString(),
            status: 'Failed',
            error_message: emailError?.message || 'Unknown error',
            claim_status_at_send: claim.job_status,
            days_in_status_at_send: Math.floor(hoursSinceReference / 24)
          });
        }
      } catch (claimError: any) {
        const errMsg = claimError?.message || claimError?.toString?.() || JSON.stringify(claimError) || 'Unknown';
        console.error(`Error processing claim ${claim.job_number}:`, errMsg);
        if (!firstError) firstError = errMsg;
        totalErrors++;
      }
    }

    const summary = {
      success: true,
      message: 'Bodyshop chaser email processing complete',
      rule_used: rule.rule_name,
      claims_evaluated: totalProcessed,
      emails_sent: totalSent,
      emails_skipped: totalSkipped,
      errors: totalErrors,
      first_error: firstError,
      debug: debugSteps
    };

    console.log('Summary:', summary);
    return Response.json(summary);
  } catch (error: any) {
    console.error('Error processing chaser emails:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});