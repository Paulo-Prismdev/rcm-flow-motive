import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { LINK_MESSAGES, clip, signingLinkExpired } from '../../shared/publicLinks.ts';

// Public endpoint: receives a client's indemnity questionnaire submission.
// Security: the link's indemnity_token must match a claim's stored token. The link
// runs out 14 days after it was generated and can be completed once (see
// shared/publicLinks.ts). No sign-in. Only the questionnaire's own fields are saved.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const indemnity_token = typeof body?.indemnity_token === 'string' ? body.indemnity_token : '';
    const formData = body?.formData && typeof body.formData === 'object' ? body.formData : null;
    if (!indemnity_token) {
      return Response.json({ error: LINK_MESSAGES.invalid, reason: 'invalid' }, { status: 404 });
    }
    if (!formData) {
      return Response.json({ error: 'Missing form data' }, { status: 400 });
    }

    // Look up the claim by its unique indemnity token (service role).
    const claims = await base44.asServiceRole.entities.Claim.filter({ indemnity_token });
    if (!claims || claims.length === 0) {
      return Response.json({ error: LINK_MESSAGES.invalid, reason: 'invalid' }, { status: 404 });
    }
    const claim = claims[0];
    if (claim.indemnity_completed_at) {
      return Response.json({ error: LINK_MESSAGES.used, reason: 'used' }, { status: 409 });
    }
    if (signingLinkExpired(claim.indemnity_link_sent_at)) {
      return Response.json({ error: LINK_MESSAGES.expired, reason: 'expired' }, { status: 410 });
    }

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
      indemnity_driver_dob: clip(formData.indemnity_driver_dob, 2000),
      indemnity_driver_age: calcAge(formData.indemnity_driver_dob),
      indemnity_registered_owner: clip(formData.indemnity_registered_owner, 2000),
      indemnity_pending_prosecutions: clip(formData.indemnity_pending_prosecutions, 2000),
      indemnity_dvla_medical_restrictions: clip(formData.indemnity_dvla_medical_restrictions, 2000),
      indemnity_full_license_12_months: clip(formData.indemnity_full_license_12_months, 2000),
      indemnity_convictions_last_5_years: clip(formData.indemnity_convictions_last_5_years, 2000),
      indemnity_incidents_last_5_years: clip(formData.indemnity_incidents_last_5_years, 2000),
      indemnity_vehicle_use_at_incident: clip(formData.indemnity_vehicle_use_at_incident, 2000),
      indemnity_vehicle_modifications: clip(formData.indemnity_vehicle_modifications, 2000),
      indemnity_modification_details: clip(formData.indemnity_modification_details, 2000),
      indemnity_pre_existing_damage: clip(formData.indemnity_pre_existing_damage, 2000),
      indemnity_cctv_dashcam: clip(formData.indemnity_cctv_dashcam, 2000),
      indemnity_property_damaged: clip(formData.indemnity_property_damaged, 2000),
      indemnity_more_photos: clip(formData.indemnity_more_photos, 2000),
      indemnity_other_info: clip(formData.indemnity_other_info, 2000),
      indemnity_completed_at: new Date().toISOString(),
    };

    await base44.asServiceRole.entities.Claim.update(claim.id, update);

    return Response.json({ success: true, claim_id: claim.id });
  } catch (error) {
    console.error('submitIndemnityForm error:', error?.message, error?.stack);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
});