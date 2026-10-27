import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { parseEmails, sendBrandedEmail } from '../../shared/brandedEmail.ts';
import { requireInternalUser } from '../../shared/internalAccess.ts';
import { accountsRequestBlocked } from '../../shared/accountsRequestGate.ts';

/**
 * Ask a referrer to send in their own invoice for one job — or chase it with a
 * reminder where nothing has come back.
 *
 * Only that invoice is touched: it is flagged as requested (or reminded) in the
 * claim's invoice_tracker. The claim's own invoice status, the Final Insurer Invoice
 * and every other item are left exactly as they were.
 *
 * The request is held under the same rule as an accounts request: every figure in it
 * is worked out from the job figures, so nothing is asked for until those have been
 * checked on the claim.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    // Internal-only: requesting an invoice from a referring company.
    const gate = await requireInternalUser(base44);
    if (gate.response) return gate.response;
    const user = gate.user;

    const { claim_id, item_key, item_label, to, cc, subject, body, reminder, referrer_name } = await req.json();

    if (!claim_id || !item_key || !subject || !body) {
      return Response.json({ error: 'Missing required fields: claim_id, item_key, subject, body' }, { status: 400 });
    }

    const recipients = parseEmails(to);
    if (recipients.length === 0) {
      return Response.json({ error: "A valid referrer email address is required" }, { status: 400 });
    }

    const claim = await base44.asServiceRole.entities.Claim.get(claim_id).catch((e: any) => (e.status === 404 ? null : Promise.reject(e)));
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

    const blocked = accountsRequestBlocked(claim);
    if (blocked) return Response.json({ error: blocked }, { status: 400 });

    const fromName = user.full_name ? `${user.full_name} — RCM Automotive` : 'RCM Automotive';
    const sent = await sendBrandedEmail({
      base44,
      to: recipients[0],
      cc: parseEmails(cc).join(', '),
      subject,
      content: body,
      fromName,
    });
    if (!sent.ok) return Response.json({ error: sent.error }, { status: 502 });

    const at = new Date().toISOString();
    const tracker = claim.invoice_tracker || {};
    const items = { ...(tracker.items || {}) };
    const entry = { ...(items[item_key] || {}) };
    if (reminder) {
      entry.reminder_sent_at = at;
      entry.reminder_by = user.email || '';
    } else {
      entry.requested = true;
      entry.requested_at = at;
      entry.requested_by = user.email || '';
      // The invoice was asked for from the referrer themselves rather than from
      // accounts, which is what every screen words the request and the chase from.
      entry.requested_from = 'referrer';
    }
    items[item_key] = entry;

    await base44.asServiceRole.entities.Claim.update(claim_id, {
      invoice_tracker: { ...tracker, items },
    });

    const who = referrer_name || 'the referrer';
    try {
      await base44.asServiceRole.entities.ActivityLog.create({
        parent_id: claim_id,
        parent_type: 'Claim',
        action: reminder ? 'Invoice Reminder Sent' : 'Invoice Requested',
        description: reminder
          ? `Chased ${who} (${recipients.join(', ')}) for "${item_label || item_key}" on job ${claim.job_number || '—'}: ${subject}`
          : `Asked ${who} (${recipients.join(', ')}) to send their "${item_label || item_key}" for job ${claim.job_number || '—'}: ${subject}`,
        user_email: user.email || '',
        user_name: user.full_name || '',
      });
    } catch (logErr: any) {
      console.error('Failed to log the referrer invoice request:', logErr.message);
    }

    return Response.json({
      success: true,
      requested_at: reminder ? null : at,
      reminder_sent_at: reminder ? at : null,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}