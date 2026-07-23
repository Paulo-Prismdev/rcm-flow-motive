import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Public endpoint: returns just enough claim info to render the public
// Statement of Repair Preference form (vehicle confirmation + signed status).
// Security: same two layers as submitRepairPreferenceForm —
//   1. _form_secret must match PUBLIC_FORM_SECRET
//   2. repair_preference_token must match a claim's stored token
// No user auth — service role is used to look the claim up.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const secret = body._form_secret;
    if (!secret || secret !== Deno.env.get('PUBLIC_FORM_SECRET')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { repair_preference_token } = body;
    if (!repair_preference_token) {
      return Response.json({ error: 'Missing repair preference token' }, { status: 400 });
    }

    const claims = await base44.asServiceRole.entities.Claim.filter({ repair_preference_token });
    if (!claims || claims.length === 0) {
      return Response.json({ valid: false }, { status: 200 });
    }
    const claim = claims[0];

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
    console.error('getRepairPreferenceClaim error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});