import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ── Token helpers (stateless, HMAC-style) ──
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
  return template.replace(/\{\{claim\.(\w+)\}\}/g, (_match, fieldName) => claim[fieldName] ?? '');
}

// ── Closed-claim check ──
// Update tracking is closed once invoiced or cancelled. Such claims are never chased.
function isUpdateTrackingClosed(claim: any): boolean {
  if (!claim) return true;
  if (claim.job_status === 'Cancelled') return true;
  return ['Invoiced', 'Invoice Paid'].includes(claim.invoice_status);
}

// ── 48-hour timer computations ──
// Returns how many hours the timer has been overdue (Red), or null if not overdue.
function getCaseOverdueHours(claim: any): number | null {
  // Snoozed (override active & not expired) → Blue, not overdue
  if (claim.override_active) {
    const expiry = claim.override_expiry_at ? new Date(claim.override_expiry_at) : null;
    if (!expiry || expiry > new Date()) return null;
  }
  if (isUpdateTrackingClosed(claim)) return null; // Gray
  const nextDue = claim.next_update_due_at ? new Date(claim.next_update_due_at) : null;
  if (!nextDue) return null;
  const hours = (Date.now() - nextDue.getTime()) / (1000 * 60 * 60);
  return hours > 0 ? hours : null;
}

function getClientOverdueHours(claim: any): number | null {
  if (claim.client_comm_override_active) {
    const expiry = claim.client_comm_override_expiry_at ? new Date(claim.client_comm_override_expiry_at) : null;
    if (!expiry || expiry > new Date()) return null;
  }
  if (isUpdateTrackingClosed(claim)) return null;
  const nextDue = claim.next_client_comm_due_at ? new Date(claim.next_client_comm_due_at) : null;
  if (!nextDue) return null;
  const hours = (Date.now() - nextDue.getTime()) / (1000 * 60 * 60);
  return hours > 0 ? hours : null;
}

// ── Recipient email resolution ──
function getRecipientEmail(claim: any, rule: any): string | null {
  switch (rule.recipient_type) {
    case 'Bodyshop': return claim.bodyshop_email || null;
    case 'Client': return claim.client_email || null;
    case 'Referrer': return claim.referrer_email || null;
    case 'Custom Email': return rule.custom_email || null;
    default: return null; // Insurer / File Handler — no email stored on the claim
  }
}

const FREQUENCY_HOURS: Record<string, number> = {
  'Once': Infinity,
  'Daily': 24,
  'Every 3 Days': 72,
  'Weekly': 168,
};

// ── Send email via SendGrid API ──
async function sendViaSendGrid(to: string, cc: string, subject: string, textBody: string): Promise<void> {
  const apiKey = Deno.env.get('SENDGRID_API_KEY');
  const fromEmail = 'info@rcmautomotive.co.uk';
  if (!apiKey) throw new Error('SENDGRID_API_KEY secret is not set');

  const htmlBody = textBody
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  const personalization: any = { to: [{ email: to }] };
  if (cc) {
    const ccList = cc.split(',').map((e) => e.trim()).filter(Boolean).map((e) => ({ email: e }));
    if (ccList.length) personalization.cc = ccList;
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [personalization],
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

    // Fetch all active rules (sorted by sort_order)
    const rules = await base44.asServiceRole.entities.ChaserEmailRule.filter({ is_active: true }, 'sort_order');
    if (!rules || rules.length === 0) {
      return Response.json({
        success: true,
        message: 'No active chaser rules found',
        claims_evaluated: 0,
        emails_sent: 0,
        emails_skipped: 0
      });
    }

    // Fetch all non-archived claims once (reused across rules)
    const claims = await base44.asServiceRole.entities.Claim.filter({ archived: false });

    let totalProcessed = 0;
    let totalSent = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let firstError = '';

    for (const rule of rules) {
      for (const claim of claims) {
        totalProcessed++;
        try {
          // Closed claims — never chase
          if (isUpdateTrackingClosed(claim)) { totalSkipped++; continue; }

          // Recipient email must be available
          const recipientEmail = getRecipientEmail(claim, rule);
          if (!recipientEmail) { totalSkipped++; continue; }

          // Journey status filter (empty = all statuses eligible)
          if (rule.trigger_journey_statuses && rule.trigger_journey_statuses.length > 0) {
            if (!rule.trigger_journey_statuses.includes(claim.journey_status)) { totalSkipped++; continue; }
          }

          // ── Timer check (fully configurable per rule) ──
          const threshold = rule.hours_overdue_before_send || 0;
          const caseHours = getCaseOverdueHours(claim);
          const clientHours = getClientOverdueHours(claim);
          const caseOverdue = caseHours != null && caseHours >= threshold;
          const clientOverdue = clientHours != null && clientHours >= threshold;

          let triggered = false;
          let referenceForCounting: Date | null = null;
          const refs: Date[] = [];
          if (caseOverdue && claim.last_updated_at) refs.push(new Date(claim.last_updated_at));
          if (clientOverdue && claim.last_client_comm_at) refs.push(new Date(claim.last_client_comm_at));

          switch (rule.trigger_timer) {
            case 'Case 48hrs':
              triggered = caseOverdue;
              referenceForCounting = claim.last_updated_at ? new Date(claim.last_updated_at) : null;
              break;
            case 'Client 48hrs':
              triggered = clientOverdue;
              referenceForCounting = claim.last_client_comm_at ? new Date(claim.last_client_comm_at) : null;
              break;
            case 'Either':
              triggered = caseOverdue || clientOverdue;
              referenceForCounting = refs.length ? new Date(Math.max(...refs.map(r => r.getTime()))) : null;
              break;
            case 'Both':
              triggered = caseOverdue && clientOverdue;
              referenceForCounting = refs.length ? new Date(Math.max(...refs.map(r => r.getTime()))) : null;
              break;
            default:
              triggered = false;
          }
          if (!triggered) { totalSkipped++; continue; }

          const hoursOverdue = Math.max(caseHours ?? 0, clientHours ?? 0);

          // ── Chaser logs since the reference (current overdue episode) ──
          const allLogs = await base44.asServiceRole.entities.ChaserEmailLog.filter(
            { claim_id: claim.id, rule_id: rule.id, status: 'Sent' },
            '-sent_at',
            50
          );
          const logsSinceRef = referenceForCounting
            ? (allLogs || []).filter((l) => new Date(l.sent_at) > referenceForCounting)
            : (allLogs || []);

          const maxSends = rule.max_sends || 3;
          if (logsSinceRef.length >= maxSends) { totalSkipped++; continue; }

          // Frequency gap between repeat chasers
          const freqHours = FREQUENCY_HOURS[rule.send_frequency] ?? 24;
          if (logsSinceRef.length > 0) {
            const lastSent = new Date(logsSinceRef[0].sent_at);
            if ((Date.now() - lastSent.getTime()) / (1000 * 60 * 60) < freqHours) { totalSkipped++; continue; }
          }

          // ── Build email content ──
          const emailSubject = replacePlaceholders(rule.email_subject_template, claim);
          let emailBody = replacePlaceholders(rule.email_body_template, claim);

          // Append the secure bodyshop update link for bodyshop recipients
          if (rule.recipient_type === 'Bodyshop' && formSecret) {
            const token = await generateBodyshopToken(claim.id, formSecret);
            const updateLink = `${baseUrl}/bodyshop-update?token=${token}`;
            emailBody += `\n\n---\n\nYou can log your update directly via this link:\n${updateLink}\n\nAlternatively, you can reply to this email with your update.\n\nKind regards,\nRCM Flow-motive Team`;
          }

          // ── Dry-run: record who would be emailed, skip actual send ──
          if (dryRun) {
            preview.push({
              rule_name: rule.rule_name,
              job_number: claim.job_number,
              reg: claim.reg,
              client_name: claim.client_name,
              journey_status: claim.journey_status,
              recipient_type: rule.recipient_type,
              recipient_email: recipientEmail,
              bodyshop: claim.bodyshop,
              trigger_timer: rule.trigger_timer,
              hours_overdue: Math.round(hoursOverdue),
              email_subject: emailSubject
            });
            totalSent++;
            continue;
          }

          // ── Send the email via SendGrid ──
          try {
            await sendViaSendGrid(recipientEmail, rule.cc_emails || '', emailSubject, emailBody);
            console.log(`✅ Sent chaser "${rule.rule_name}" for claim ${claim.job_number} to ${recipientEmail}`);

            await base44.asServiceRole.entities.ChaserEmailLog.create({
              claim_id: claim.id,
              rule_id: rule.id,
              rule_name: rule.rule_name,
              recipient_email: recipientEmail,
              recipient_type: rule.recipient_type,
              email_subject: emailSubject,
              email_body: emailBody,
              sent_at: new Date().toISOString(),
              status: 'Sent',
              claim_status_at_send: claim.journey_status || claim.job_status,
              days_in_status_at_send: Math.round(hoursOverdue)
            });

            // Log an Outgoing Bodyshop Communication on the claim for bodyshop chasers
            if (rule.recipient_type === 'Bodyshop') {
              await base44.asServiceRole.entities.ClaimUpdate.create({
                claim_id: claim.id,
                update_type: 'Bodyshop Communication',
                direction: 'Outgoing',
                platform: 'E-Mail',
                description: `[Automated Chaser: ${rule.rule_name}] Sent to ${recipientEmail}`,
                next_steps: 'Awaiting bodyshop response'
              });
            }

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
              recipient_email: recipientEmail,
              recipient_type: rule.recipient_type,
              email_subject: emailSubject,
              email_body: emailBody,
              sent_at: new Date().toISOString(),
              status: 'Failed',
              error_message: errMsg,
              claim_status_at_send: claim.journey_status || claim.job_status,
              days_in_status_at_send: Math.round(hoursOverdue)
            });
          }
        } catch (claimError: any) {
          const errMsg = claimError?.message || String(claimError);
          console.error(`Error processing claim ${claim.job_number}:`, errMsg);
          if (!firstError) firstError = errMsg;
          totalErrors++;
        }
      }
    }

    return Response.json({
      success: true,
      message: dryRun ? 'Dry run complete — no emails sent' : 'Chaser email processing complete',
      dry_run: dryRun,
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