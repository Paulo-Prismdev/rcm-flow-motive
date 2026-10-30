import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { signingLinkExpired } from '../../shared/publicLinks.ts';

// Public endpoint: returns just enough claim info to render the public
// Statement of Repair Preference form (vehicle confirmation + signed status).
// Security: repair_preference_token must match a claim's stored token, and the link
// runs out 14 days after it was generated (see shared/publicLinks.ts). No sign-in.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const repair_preference_token = typeof body?.repair_preference_token === 'string' ? body.repair_preference_token : '';
    if (!repair_preference_token) {
      return Response.json({ valid: false, reason: 'invalid' }, { status: 200 });
    }

    const claims = await base44.asServiceRole.entities.Claim.filter({ repair_preference_token });
    if (!claims || claims.length === 0) {
      return Response.json({ valid: false, reason: 'invalid' }, { status: 200 });
    }
    const claim = claims[0];
    // A signed form says so whatever its age; an unsigned one stops opening once its link runs out.
    if (!claim.repair_preference_signed && signingLinkExpired(claim.repair_preference_link_sent_at)) {
      return Response.json({ valid: false, reason: 'expired' }, { status: 200 });
    }

    // Only expose the minimal display fields — never the full claim record.
    return Response.json({
      valid: true,
      job_number: claim.job_number || '',
      reg: claim.reg || '',
      vehicle_make: claim.vehicle_make || claim.make_model || '',
      vehicle_model: claim.vehicle_model || '',
      signed: !!claim.repair_preference_signed,
    });
  } catch (error) {
    console.error('getRepairPreferenceClaim error:', error?.message, error?.stack);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
});