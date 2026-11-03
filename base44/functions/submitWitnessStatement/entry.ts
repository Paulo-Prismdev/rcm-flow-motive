import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { LINK_MESSAGES, appPublicUrl, signingLinkExpired, validSignature } from '../../shared/publicLinks.ts';
import { buildPdf, cleanAnswers, esc, logoDataUrl } from '../../shared/witnessStatement.ts';
import { STAFF_ALERTS_EMAIL, buildBrandedHtml, deliverEmail } from '../../shared/brandedEmail.ts';

/**
 * Public: a witness submits and signs their statement. The link's token must match an
 * unsigned request less than 14 days old, and can be used once. A signed PDF is made,
 * kept in private storage on the request, and the office is told.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === 'string' && body.token.length <= 200 ? body.token : '';
    if (!token) return Response.json({ error: LINK_MESSAGES.invalid, reason: 'invalid' }, { status: 404 });

    const ans = cleanAnswers(body?.answers || {});
    const missing = [
      !ans.full_name && 'your full name',
      !ans.address && 'your address',
      !ans.phone && 'a phone number',
      !ans.account && 'what you saw',
      !ans.contact_ok && 'whether you are happy to be contacted',
    ].filter(Boolean);
    if (missing.length) return Response.json({ error: `Please add ${missing.join(', ')}.` }, { status: 400 });
    if (body?.truth !== true) return Response.json({ error: 'Please tick the statement of truth.' }, { status: 400 });
    if (!validSignature(body?.signatureDataUrl)) return Response.json({ error: 'Please sign the statement before submitting.' }, { status: 400 });

    const W = base44.asServiceRole.entities.WitnessStatement;
    const page = await W.filter({ token });
    const rec = (Array.isArray(page) ? page : ((page as any)?.items || []))[0];
    if (!rec) return Response.json({ error: LINK_MESSAGES.invalid, reason: 'invalid' }, { status: 404 });
    if (rec.status === 'Signed') return Response.json({ error: LINK_MESSAGES.used, reason: 'used' }, { status: 409 });
    if (signingLinkExpired(rec.link_sent_at)) return Response.json({ error: LINK_MESSAGES.expired, reason: 'expired' }, { status: 410 });
    const claim = await base44.asServiceRole.entities.Claim.get(rec.claim_id).catch(() => null);
    if (!claim) return Response.json({ error: LINK_MESSAGES.invalid, reason: 'invalid' }, { status: 404 });

    const signedAt = new Date();
    const pdfBytes = buildPdf(ans, claim, body.signatureDataUrl, signedAt, await logoDataUrl());
    const safeName = ans.full_name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || 'witness';
    const filename = `${claim.job_number || 'claim'}-witness-statement-${safeName}.pdf`;
    const file = new File([new Blob([pdfBytes], { type: 'application/pdf' })], filename, { type: 'application/pdf' });
    const uploaded = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
    const pdfRef = `private-file:${uploaded.file_uri}#${encodeURIComponent(filename)}`;

    // Claim the link first so a double tap can't sign twice, then record the rest.
    await W.update(rec.id, {
      status: 'Signed', signed_at: signedAt.toISOString(), signer_name: ans.full_name,
      pdf_ref: pdfRef, answers: ans, token: null,
    });

    const description = `Witness statement signed by ${ans.full_name}. The signed PDF is in the claim's Witness Statements section.`;
    await Promise.all([
      // "Other" updates stay internal: portals don't see witness details.
      base44.asServiceRole.entities.ClaimUpdate.create({ claim_id: claim.id, update_type: 'Other', direction: 'Incoming', description }).catch(() => {}),
      base44.asServiceRole.entities.ActivityLog.create({
        parent_id: claim.id, parent_type: 'Claim', action: 'Witness Statement Signed', description,
        user_email: ans.email || '', user_name: `${ans.full_name} (witness)`,
      }).catch(() => {}),
      deliverEmail({
        base44,
        to: STAFF_ALERTS_EMAIL,
        subject: `Witness statement signed – ${claim.job_number || ''}${claim.reg ? ` [${String(claim.reg).toUpperCase()}]` : ''}`,
        html: buildBrandedHtml(`<p><strong>${esc(ans.full_name)}</strong> has signed a witness statement for job <strong>${esc(claim.job_number || '')}</strong> (${esc((claim.reg || '').toUpperCase())}).</p>
<p style="background:#f5f6fa;padding:12px;border-radius:8px;white-space:pre-wrap;">${esc(ans.account.slice(0, 600))}${ans.account.length > 600 ? '…' : ''}</p>
<p><a href="${appPublicUrl(req)}/Claims?id=${encodeURIComponent(claim.id)}" style="background:#131d47;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Open the claim</a></p>`),
      }).catch(() => {}),
    ]);

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('submitWitnessStatement error:', error?.message);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
});
