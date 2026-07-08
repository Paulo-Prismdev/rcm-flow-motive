import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Public endpoint: validates token and either returns claim context (GET-like)
// or submits indemnity form data (POST).
// Uses PUBLIC_FORM_SECRET for access control, same as other public forms.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Public form: validate _form_secret to bypass platform auth gate
    const secret = body._form_secret;
    if (!secret || secret !== Deno.env.get('PUBLIC_FORM_SECRET')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    delete body._form_secret;

    // Security is provided by the indemnity_token (32-byte crypto-random, stored on claim).
    const { claimId, token, formData, action } = body;
    if (!claimId || !token) {
      return Response.json({ error: 'Missing claimId or token' }, { status: 400 });
    }

    // Fetch the claim via service role (no user auth on public form)
    const claim = await base44.asServiceRole.entities.Claim.get(claimId);
    if (!claim) {
      return Response.json({ error: 'Claim not found' }, { status: 404 });
    }

    // Validate token
    if (!claim.indemnity_token || claim.indemnity_token !== token) {
      return Response.json({ error: 'Invalid or expired link' }, { status: 403 });
    }

    // If already completed, don't allow re-submission
    if (claim.indemnity_completed_at) {
      return Response.json({ error: 'This form has already been submitted.', alreadyCompleted: true }, { status: 409 });
    }

    // Action: validate only (return claim context for the form)
    if (action === 'validate') {
      return Response.json({
        success: true,
        claim: {
          job_number: claim.job_number,
          client_name: claim.client_name,
          reg: claim.reg,
          make_model: claim.make_model,
        },
      });
    }

    // Action: submit form data
    if (!formData) {
      return Response.json({ error: 'Missing form data' }, { status: 400 });
    }

    // Update only the indemnity fields on the claim
    const updateData = {
      indemnity_driver_dob: formData.indemnity_driver_dob || '',
      indemnity_registered_owner: formData.indemnity_registered_owner || '',
      indemnity_pending_prosecutions: formData.indemnity_pending_prosecutions || '',
      indemnity_dvla_medical_restrictions: formData.indemnity_dvla_medical_restrictions || '',
      indemnity_full_license_12_months: formData.indemnity_full_license_12_months || '',
      indemnity_convictions_last_5_years: formData.indemnity_convictions_last_5_years || '',
      indemnity_vehicle_use_at_incident: formData.indemnity_vehicle_use_at_incident || '',
      indemnity_vehicle_modifications: formData.indemnity_vehicle_modifications || '',
      indemnity_completed_at: new Date().toISOString(),
      requires_indemnity: true,
    };

    await base44.asServiceRole.entities.Claim.update(claimId, updateData);

    return Response.json({ success: true });
  } catch (error) {
    console.error('submitIndemnityForm error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});