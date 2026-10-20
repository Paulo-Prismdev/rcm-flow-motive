import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { parseEmails, sendBrandedEmail } from '../../shared/brandedEmail.ts';

/**
 * Ask the repairer for a corrected invoice.
 *
 * The repairer's invoices can't stand as they are: either they ask for more than
 * the job was authorised at, which a repairer may never do, or they ask for less
 * than the authority and the team has chosen to have them re-invoiced. The request
 * is recorded against the Final Insurer Invoice — which is what leaves that
 * invoice amber on the claim until a corrected copy is uploaded — and the email is
 * sent.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.user_type !== 'internal' && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { claim_id, to, cc, subject, body, invoice_total, authority_amount } = await req.json();

    if (!claim_id || !subject || !body) {
      return Response.json({ error: 'Missing required fields: claim_id, subject, body' }, { status: 400 });
    }

    const recipients = parseEmails(to);
    if (recipients.length === 0) {
      return Response.json({ error: "A valid repairer email address is required" }, { status: 400 });
    }

    const claim = await base44.asServiceRole.entities.Claim.get(claim_id);
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

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
    const invoice = { ...(items.final_invoice || {}) };
    invoice.reinvoice_requested = {
      at: requestedAt,
      by: user.email || '',
      invoice_total: invoice_total ?? null,
      authority_amount: authority_amount ?? null,
    };
    items.final_invoice = invoice;

    await base44.asServiceRole.entities.Claim.update(claim_id, {
      invoice_tracker: { ...tracker, items },
    });

    try {
      await base44.asServiceRole.entities.ActivityLog.create({
        parent_id: claim_id,
        parent_type: 'Claim',
        action: 'Re-invoice Requested',
        description: `Asked ${claim.bodyshop || 'the repairer'} (${recipients.join(', ')}) to send a corrected invoice for job ${claim.job_number || '—'} — invoiced ${invoice_total ?? '—'} against the authorised ${authority_amount ?? '—'}: ${subject}`,
        user_email: user.email || '',
        user_name: user.full_name || '',
      });
    } catch (logErr) {
      console.error('Failed to log the re-invoice request:', logErr.message);
    }

    return Response.json({ success: true, requested_at: requestedAt });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}