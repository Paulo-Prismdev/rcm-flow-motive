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

  const logoUrl = 'https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg';
  const innerHtml = textBody
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Linkify bare URLs (after HTML-escaping so the href stays safe)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#2563eb;text-decoration:underline;">click here</a>')
    .replace(/\n/g, '<br>');

  const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f5fa;font-family:Inter,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5fa;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <!-- Header -->
        <tr>
          <td style="background-color:#131d47;padding:24px 32px;text-align:center;">
            <img src="${logoUrl}" alt="RCM Automotive" style="max-height:48px;width:auto;display:inline-block;" />
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;color:#1B2A3B;font-size:15px;line-height:1.6;">
            ${innerHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#131d47;padding:20px 32px;text-align:center;">
            <p style="margin:0 0 4px;color:#ffffff;font-size:14px;font-weight:600;">RCM Automotive</p>
            <p style="margin:0;color:#9aa7c7;font-size:12px;line-height:1.5;">
              info@rcmautomotive.co.uk &nbsp;|&nbsp; www.rcmautomotive.co.uk
            </p>
            <p style="margin:8px 0 0;color:#5d6b8c;font-size:11px;">This is an automated message — please do not reply directly.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

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
    // App public URL for building external form links. Prefer the configured
    // APP_PUBLIC_URL secret, then the request Origin header (frontend-triggered
    // runs), then the request's own host as a last resort.
    const baseUrl = (Deno.env.get('APP_PUBLIC_URL') || req.headers.get('origin') || `${url.protocol}//${url.host}`).replace(/\/+$/, '');
    const formSecret = Deno.env.get('PUBLIC_FORM_SECRET');

    // ── Dry-run mode: preview who WOULD be emailed without sending anything ──
    let dryRun = false;
    let testEmail: string | null = null;
    let testClaimId: string | null = null;
    let ruleId: string | null = null;
    try {
      if (req.method === 'POST') {
        const body = await req.json();
        if (body && body.dry_run === true) dryRun = true;
        if (body && typeof body.rule_id === 'string' && body.rule_id) ruleId = body.rule_id;
        if (body && typeof body.test_email === 'string' && body.test_email.trim()) testEmail = body.test_email.trim();
        if (body && typeof body.test_claim_id === 'string' && body.test_claim_id.trim()) testClaimId = body.test_claim_id.trim();
      }
    } catch { /* no body or invalid JSON — not a dry run */ }
    const isTestMode = !!testEmail;
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

    // Fetch rules — a specific rule when rule_id is supplied (per-rule run/preview),
    // otherwise all active rules (automated / global run).
    let rules: any[];
    if (ruleId) {
      try {
        const single = await base44.asServiceRole.entities.ChaserEmailRule.get(ruleId);
        rules = single ? [single] : [];
      } catch {
        rules = [];
      }
    } else {
      rules = await base44.asServiceRole.entities.ChaserEmailRule.filter({ is_active: true }, 'sort_order');
    }
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

    // ── TEST MODE: send one real email to a chosen address, bypassing all
    // overdue / frequency / max-sends checks. Uses a real claim's data so the
    // bodyshop update link and placeholders render exactly as they would live.
    // Nothing is logged to ChaserEmailLog or ClaimUpdate (it's a test). ──
    if (isTestMode) {
      const rule = rules[0];
      if (!rule) {
        return Response.json({ success: false, error: 'Rule not found' }, { status: 404 });
      }
      // Pick the claim to render: specified one, else first non-closed claim that
      // has a recipient email for this rule type (so placeholders look real).
      let testClaim: any = null;
      if (testClaimId) {
        testClaim = claims.find((c) => c.id === testClaimId) || null;
      }
      if (!testClaim) {
        testClaim = claims.find((c) => !isUpdateTrackingClosed(c) && getRecipientEmail(c, rule));
      }
      if (!testClaim) {
        testClaim = claims.find((c) => !isUpdateTrackingClosed(c)) || claims[0] || null;
      }
      if (!testClaim) {
        return Response.json({ success: false, error: 'No non-archived claim found to render the test with' }, { status: 404 });
      }

      const claimForTemplate = { ...testClaim };
      if (rule.recipient_type === 'Bodyshop' && formSecret) {
        const token = await generateBodyshopToken(testClaim.id, formSecret);
        claimForTemplate.bodyshop_update_link = `${baseUrl}/bodyshop-update?token=${token}`;
      }
      const emailSubject = replacePlaceholders(rule.email_subject_template, claimForTemplate);
      const emailBody = replacePlaceholders(rule.email_body_template, claimForTemplate);

      try {
        await sendViaSendGrid(testEmail!, rule.cc_emails || '', emailSubject, emailBody);
        return Response.json({
          success: true,
          message: `Test email sent to ${testEmail}`,
          test_mode: true,
          test_email: testEmail,
          rule_name: rule.rule_name,
          claim_used: { id: testClaim.id, job_number: testClaim.job_number, reg: testClaim.reg },
          email_subject: emailSubject,
          bodyshop_update_link: claimForTemplate.bodyshop_update_link || null
        });
      } catch (e: any) {
        return Response.json({ success: false, error: e?.message || String(e) }, { status: 500 });
      }
    }

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
          // Inject the secure bodyshop update link as a placeholder value so admins
          // can place it anywhere in the template via {{claim.bodyshop_update_link}}.
          const claimForTemplate = { ...claim };
          if (rule.recipient_type === 'Bodyshop' && formSecret) {
            const token = await generateBodyshopToken(claim.id, formSecret);
            claimForTemplate.bodyshop_update_link = `${baseUrl}/bodyshop-update?token=${token}`;
          }
          const emailSubject = replacePlaceholders(rule.email_subject_template, claimForTemplate);
          const emailBody = replacePlaceholders(rule.email_body_template, claimForTemplate);

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