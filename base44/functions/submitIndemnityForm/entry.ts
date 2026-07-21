import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Public endpoint: receives a client's indemnity questionnaire submission.
// Security: two layers —
//   1. _form_secret must match PUBLIC_FORM_SECRET (prevents arbitrary external calls)
//   2. indemnity_token must match a claim's stored token (binds the submission to one claim)
// No user auth — the form sits externally to the app. Service role is used to look up
// and update the claim (bypasses RLS), gated entirely by the unguessable per-claim token.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const secret = body._form_secret;
    if (!secret || secret !== Deno.env.get('PUBLIC_FORM_SECRET')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { indemnity_token, formData } = body;
    if (!indemnity_token) {
      return Response.json({ error: 'Missing indemnity token' }, { status: 400 });
    }
    if (!formData) {
      return Response.json({ error: 'Missing form data' }, { status: 400 });
    }

    // Look up the claim by its unique indemnity token (service role).
    const claims = await base44.asServiceRole.entities.Claim.filter({ indemnity_token });
    if (!claims || claims.length === 0) {
      return Response.json({ error: 'Invalid or expired link' }, { status: 404 });
    }
    const claim = claims[0];

    // Calculate driver age from DOB.
    const calcAge = (dob) => {
      if (!dob) return null;
      const d = new Date(dob);
      if (isNaN(d.getTime())) return null;
      const now = new Date();
      let age = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
      return age;
    };

    const update = {
      requires_indemnity: true,
      indemnity_driver_dob: formData.indemnity_driver_dob || '',
      indemnity_driver_age: calcAge(formData.indemnity_driver_dob),
      indemnity_registered_owner: formData.indemnity_registered_owner || '',
      indemnity_pending_prosecutions: formData.indemnity_pending_prosecutions || '',
      indemnity_dvla_medical_restrictions: formData.indemnity_dvla_medical_restrictions || '',
      indemnity_full_license_12_months: formData.indemnity_full_license_12_months || '',
      indemnity_convictions_last_5_years: formData.indemnity_convictions_last_5_years || '',
      indemnity_incidents_last_5_years: formData.indemnity_incidents_last_5_years || '',
      indemnity_vehicle_use_at_incident: formData.indemnity_vehicle_use_at_incident || '',
      indemnity_vehicle_modifications: formData.indemnity_vehicle_modifications || '',
      indemnity_modification_details: formData.indemnity_modification_details || '',
      indemnity_pre_existing_damage: formData.indemnity_pre_existing_damage || '',
      indemnity_cctv_dashcam: formData.indemnity_cctv_dashcam || '',
      indemnity_property_damaged: formData.indemnity_property_damaged || '',
      indemnity_more_photos: formData.indemnity_more_photos || '',
      indemnity_other_info: formData.indemnity_other_info || '',
      indemnity_completed_at: new Date().toISOString(),
    };

    await base44.asServiceRole.entities.Claim.update(claim.id, update);

    return Response.json({ success: true, claim_id: claim.id });
  } catch (error) {
    console.error('submitIndemnityForm error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});