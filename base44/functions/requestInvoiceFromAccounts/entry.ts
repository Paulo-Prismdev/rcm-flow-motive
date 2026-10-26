import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { parseEmails, sendBrandedEmail } from '../../shared/brandedEmail.ts';
import { requireInternalUser } from '../../shared/internalAccess.ts';

/**
 * Ask accounts to raise ONE invoice on the claim.
 *
 * Only that invoice is touched: it is flagged as requested in the claim's
 * invoice_tracker. The claim's own invoice status, the Final Insurer Invoice and
 * every other item are left exactly as they were.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    // Internal-only: requesting an invoice from the repairer's accounts.
    const gate = await requireInternalUser(base44);
    if (gate.response) return gate.response;
    const user = gate.user;

    const { claim_id, item_key, item_label, to, cc, subject, body } = await req.json();

    if (!claim_id || !item_key || !subject || !body) {
      return Response.json({ error: 'Missing required fields: claim_id, item_key, subject, body' }, { status: 400 });
    }

    const recipients = parseEmails(to);
    if (recipients.length === 0) {
      return Response.json({ error: 'A valid accounts email address is required' }, { status: 400 });
    }

    const claim = await base44.asServiceRole.entities.Claim.get(claim_id);
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

    // Every amount on the invoice is worked out from the job figures, so nothing is
    // asked for until they have been checked and confirmed on the claim. A job whose
    // invoices were already going out before the check existed is left as it is.
    const checked = (claim as any).invoice_tracker?.figures_checked;
    const alreadyGoingOut = Object.values(((claim as any).invoice_tracker?.items || {}) as Record<string, any>)
      .some((entry) => entry?.requested || entry?.date);
    if (!checked && !alreadyGoingOut) {
      return Response.json(
        { error: 'Check the job figures first — every amount on this invoice is worked out from them' },
        { status: 400 }
      );
    }

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

    const requestedAt = new Date().toISOString();
    const tracker = claim.invoice_tracker || {};
    const items = { ...(tracker.items || {}) };
    const entry = { ...(items[item_key] || {}) };
    entry.requested = true;
    entry.requested_at = requestedAt;
    entry.requested_by = user.email || '';
    items[item_key] = entry;

    await base44.asServiceRole.entities.Claim.update(claim_id, {
      invoice_tracker: { ...tracker, items },
    });

    try {
      await base44.asServiceRole.entities.ActivityLog.create({
        parent_id: claim_id,
        parent_type: 'Claim',
        action: 'Invoice Requested',
        description: `Asked accounts (${recipients.join(', ')}) to raise "${item_label || item_key}" for job ${claim.job_number || '—'}: ${subject}`,
        user_email: user.email || '',
        user_name: user.full_name || '',
      });
    } catch (logErr) {
      console.error('Failed to log the invoice request:', logErr.message);
    }

    return Response.json({ success: true, requested_at: requestedAt });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}