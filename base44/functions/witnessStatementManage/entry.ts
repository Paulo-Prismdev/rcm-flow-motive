import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireInternalUser } from '../../shared/internalAccess.ts';
import { appPublicUrl, clip, signingLinkExpired, LINK_TTL_DAYS } from '../../shared/publicLinks.ts';
import { parseEmails, sendBrandedEmail } from '../../shared/brandedEmail.ts';

/**
 * Staff side of witness statements. Witness statements can only be created and changed
 * here (the record itself is read-only from the app), so a signed statement can't be
 * edited afterwards.
 *
 *   list        { claim_id }                                  the claim's requests
 *   create      { claim_id, witness_name, witness_email?, witness_phone? }
 *   regenerate  { id }   a fresh 14-day link (only while unsigned)
 *   send_email  { id }   email the link to the witness
 *   remove      { id }   delete an unsigned request
 */
const newToken = () => `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
const fmtDate = (d: unknown) => {
  if (!d) return '';
  const t = new Date(String(d));
  return Number.isNaN(t.getTime()) ? String(d) : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

// What the staff screen gets: never the token itself, only the link built from it.
function forStaff(rec: any, origin: string) {
  const { token, answers, ...rest } = rec;
  return {
    ...rest,
    link: token && rec.status !== 'Signed' ? `${origin}/witness-statement-form?token=${token}` : '',
    link_expired: rec.status !== 'Signed' && signingLinkExpired(rec.link_sent_at),
  };
}

async function log(base44: any, user: any, claimId: string, action: string, description: string) {
  await base44.asServiceRole.entities.ActivityLog.create({
    parent_id: claimId, parent_type: 'Claim', action, description,
    user_email: user.email || '', user_name: user.display_name || user.full_name || user.email || '',
  }).catch(() => {});
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const gate = await requireInternalUser(base44);
    if (gate.response) return gate.response;
    const user = gate.user;
    const origin = appPublicUrl(req);
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const W = base44.asServiceRole.entities.WitnessStatement;

    if (action === 'list' || action === 'create') {
      const claimId = typeof body?.claim_id === 'string' ? body.claim_id : '';
      const claim = claimId ? await base44.asServiceRole.entities.Claim.get(claimId).catch(() => null) : null;
      if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

      if (action === 'create') {
        const witnessName = clip(body?.witness_name, 150);
        if (!witnessName) return Response.json({ error: "Enter the witness's name." }, { status: 400 });
        const email = clip(body?.witness_email, 200);
        if (email && !parseEmails(email).length) return Response.json({ error: 'Check the email address.' }, { status: 400 });
        await W.create({
          claim_id: claim.id,
          witness_name: witnessName,
          witness_email: email,
          witness_phone: clip(body?.witness_phone, 40),
          token: newToken(),
          link_sent_at: new Date().toISOString(),
          status: 'Requested',
          requested_by: user.email || '',
        });
        await log(base44, user, claim.id, 'Witness Statement Requested', `Witness statement link created for ${witnessName}`);
      }

      const page = await W.filter({ claim_id: claim.id }, '-created_date', 50);
      const list = Array.isArray(page) ? page : (page?.items || []);
      return Response.json({ statements: list.map((r: any) => forStaff(r, origin)) });
    }

    const id = typeof body?.id === 'string' ? body.id : '';
    const rec = id ? await W.get(id).catch(() => null) : null;
    if (!rec) return Response.json({ error: 'Witness statement not found' }, { status: 404 });

    if (action === 'regenerate') {
      if (rec.status === 'Signed') return Response.json({ error: 'This statement has already been signed.' }, { status: 409 });
      await W.update(rec.id, { token: newToken(), link_sent_at: new Date().toISOString(), link_emailed_at: null });
      await log(base44, user, rec.claim_id, 'Witness Statement Link Renewed', `New witness statement link for ${rec.witness_name} (the old one no longer works)`);
      return Response.json({ statement: forStaff(await W.get(rec.id), origin) });
    }

    if (action === 'remove') {
      if (rec.status === 'Signed') return Response.json({ error: 'A signed statement is kept on the claim and can’t be removed.' }, { status: 409 });
      await W.delete(rec.id);
      await log(base44, user, rec.claim_id, 'Witness Statement Request Removed', `Witness statement request for ${rec.witness_name} removed`);
      return Response.json({ removed: true });
    }

    if (action === 'send_email') {
      if (rec.status === 'Signed') return Response.json({ error: 'This statement has already been signed.' }, { status: 409 });
      const to = parseEmails(rec.witness_email || '')[0];
      if (!to) return Response.json({ error: 'Add an email address for the witness first, or copy the link and send it yourself.' }, { status: 400 });
      let current = rec;
      if (signingLinkExpired(rec.link_sent_at)) {
        await W.update(rec.id, { token: newToken(), link_sent_at: new Date().toISOString() });
        current = await W.get(rec.id);
      }
      const claim = await base44.asServiceRole.entities.Claim.get(rec.claim_id).catch(() => null);
      const link = `${origin}/witness-statement-form?token=${current.token}`;
      const when = claim?.loss_date ? ` on ${fmtDate(claim.loss_date)}` : '';
      const where = claim?.incident_location ? ` at ${claim.incident_location}` : '';
      const content = `<p>Dear ${esc(rec.witness_name)},</p>
<p>We understand you may have witnessed a road traffic accident${esc(when)}${esc(where)}. We are handling the claim and would be very grateful if you could tell us what you saw.</p>
<p>It takes about five minutes on your phone or computer. You'll be asked to describe what happened and sign at the end. Your statement may be shared with the insurers dealing with the claim.</p>
<p style="text-align:center;margin:24px 0;"><a href="${link}" style="background:#131d47;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Give my witness statement</a></p>
<p style="color:#65758b;font-size:13px;">This link is just for you and works for ${LINK_TTL_DAYS} days. If you weren't a witness to this accident, please ignore this email or let us know.</p>
<p>Thank you for your help.</p>`;
      const sent = await sendBrandedEmail({
        base44, to, subject: `Witness statement request${claim?.reg ? ` – vehicle ${String(claim.reg).toUpperCase()}` : ''}`,
        content, fromName: 'RCM Automotive', replyTo: user.email,
      });
      if (!sent.ok) return Response.json({ error: sent.error || 'The email could not be sent.' }, { status: 502 });
      await W.update(rec.id, { link_emailed_at: new Date().toISOString() });
      await log(base44, user, rec.claim_id, 'Witness Statement Link Emailed', `Witness statement link emailed to ${rec.witness_name} (${to})`);
      return Response.json({ statement: forStaff(await W.get(rec.id), origin) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('witnessStatementManage error:', error?.message);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
});
