import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { signingLinkExpired } from '../../shared/publicLinks.ts';

/**
 * Public: what the witness statement form shows for a link. Only enough to identify
 * the accident (date, place, our customer's vehicle) and the witness's own name; never
 * the customer's name, contact details or anything else on the claim.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === 'string' && body.token.length <= 200 ? body.token : '';
    if (!token) return Response.json({ valid: false, reason: 'invalid' });

    const page = await base44.asServiceRole.entities.WitnessStatement.filter({ token });
    const rec = (Array.isArray(page) ? page : (page?.items || []))[0];
    if (!rec) return Response.json({ valid: false, reason: 'invalid' });
    if (rec.status === 'Signed') return Response.json({ valid: true, signed: true });
    if (signingLinkExpired(rec.link_sent_at)) return Response.json({ valid: false, reason: 'expired' });

    const claim = await base44.asServiceRole.entities.Claim.get(rec.claim_id).catch(() => null);
    if (!claim) return Response.json({ valid: false, reason: 'invalid' });

    return Response.json({
      valid: true,
      signed: false,
      witness_name: rec.witness_name || '',
      witness_email: rec.witness_email || '',
      witness_phone: rec.witness_phone || '',
      incident_date: claim.loss_date || '',
      incident_time: claim.loss_time || '',
      incident_location: claim.incident_location || '',
      vehicle_reg: claim.reg ? String(claim.reg).toUpperCase() : '',
      vehicle: claim.make_model || [claim.vehicle_make, claim.vehicle_model].filter(Boolean).join(' ') || '',
      other_vehicle_reg: claim.tp_reg ? String(claim.tp_reg).toUpperCase() : '',
    });
  } catch (error: any) {
    console.error('getWitnessStatementForm error:', error?.message);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
});
