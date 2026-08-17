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

// ── Closed-claim check (don't chase closed/invoiced/completed claims) ──
// These job statuses mean the vehicle is gone / repair done — no point chasing.
const CLOSED_JOB_STATUSES = [
  'Cancelled',
  'Returned to Customer',
  'Hand Over',
  'Completed',
  'Complete',
  'Collection Only',
  'Vehicle Collected'
];

function isClaimClosed(claim: any): boolean {
  if (CLOSED_JOB_STATUSES.includes(claim.job_status)) return true;
  return ['Invoiced', 'Invoice Paid'].includes(claim.invoice_status);
}

// ── Send email via SendGrid API ──
async function sendViaSendGrid(to: string, subject: string, textBody: string): Promise<void> {
  const apiKey = Deno.env.get('SENDGRID_API_KEY');
  const fromEmail = 'info@rcmautomotive.co.uk';

  if (!apiKey) throw new Error('SENDGRID_API_KEY secret is not set');

  // Convert plain-text body to simple HTML
  const htmlBody = textBody
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: 'RCM Flow-motive' },
      subject,
      content: [{ type: 'text/plain', value: textBody }, { type: 'text/html', value: htmlBody }]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`SendGrid API error (${res.status}): ${errText}`);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const formSecret = Deno.env.get('PUBLIC_FORM_SECRET');

    // ── Dry-run mode: preview who WOULD be emailed without sending anything ──
    let dryRun = false;
    try {
      if (req.method === 'POST') {
        const body = await req.json();
        if (body && body.dry_run === true) dryRun = true;
      }
    } catch { /* no body or invalid JSON — not a dry run */ }
    const preview: any[] = [];

    // Allow both admin manual runs and automated (no-user) scheduled runs
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'company_admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch {
      // No user context — automated/scheduled call, proceed
    }

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

    // Fetch all non-archived claims that have a bodyshop allocated
    const claims = await base44.asServiceRole.entities.Claim.filter({ archived: false });

    let totalProcessed = 0;
    let totalSent = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let firstError = '';

    for (const claim of claims) {
      totalProcessed++;

      try {
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
        const incomingUpdates = await base44.asServiceRole.entities.ClaimUpdate.filter(
          { claim_id: claim.id, update_type: 'Bodyshop Communication', direction: 'Incoming' },
          '-created_date',
          1
        );

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
        const allChaserLogs = await base44.asServiceRole.entities.ChaserEmailLog.filter(
          { claim_id: claim.id, rule_id: rule.id, status: 'Sent' },
          '-sent_at',
          20
        );

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
        const token = await generateBodyshopToken(claim.id, formSecret);
        const updateLink = `${baseUrl}/bodyshop-update?token=${token}`;

        // ── Build email content ──
        const emailSubject = replacePlaceholders(rule.email_subject_template, claim);
        let emailBody = replacePlaceholders(rule.email_body_template, claim);

        // Append the update link
        emailBody += `\n\n---\n\nYou can log your update directly via this link:\n${updateLink}\n\nAlternatively, you can reply to this email with your update.\n\nKind regards,\nRCM Flow-motive Team`;

        // ── Dry-run: record who would be emailed, skip actual send ──
        if (dryRun) {
          preview.push({
            job_number: claim.job_number,
            reg: claim.reg,
            client_name: claim.client_name,
            bodyshop: claim.bodyshop,
            bodyshop_email: claim.bodyshop_email,
            job_status: claim.job_status,
            days_since_reference: Math.floor(hoursSinceReference / 24),
            email_subject: emailSubject
          });
          totalSent++;
          continue;
        }

        // ── Send the email via SendGrid ──
        try {
          await sendViaSendGrid(claim.bodyshop_email, emailSubject, emailBody);

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
          const errMsg = emailError?.message || String(emailError);
          console.error(`❌ Failed to send chaser for claim ${claim.job_number}:`, errMsg);
          if (!firstError) firstError = errMsg;
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
            error_message: errMsg,
            claim_status_at_send: claim.job_status,
            days_in_status_at_send: Math.floor(hoursSinceReference / 24)
          });
        }
      } catch (claimError: any) {
        const errMsg = claimError?.message || String(claimError);
        console.error(`Error processing claim ${claim.job_number}:`, errMsg);
        if (!firstError) firstError = errMsg;
        totalErrors++;
      }
    }

    return Response.json({
      success: true,
      message: dryRun ? 'Dry run complete — no emails sent' : 'Bodyshop chaser email processing complete',
      dry_run: dryRun,
      rule_used: rule.rule_name,
      claims_evaluated: totalProcessed,
      emails_sent: totalSent,
      emails_skipped: totalSkipped,
      errors: totalErrors,
      first_error: firstError,
      preview: dryRun ? preview : undefined
    });
  } catch (error: any) {
    console.error('Error processing chaser emails:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});