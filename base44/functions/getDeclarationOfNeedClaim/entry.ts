import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Public endpoint: returns just enough claim info to render the public
// Declaration of Need – Replacement Vehicle form (pre-fill fields + signed status).
// Security: same two layers as the other public forms —
//   1. _form_secret must match PUBLIC_FORM_SECRET
//   2. declaration_of_need_token must match a claim's stored token
// No user auth — service role is used to look the claim up.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const secret = body._form_secret;
    if (!secret || secret !== Deno.env.get('PUBLIC_FORM_SECRET')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { declaration_of_need_token } = body;
    if (!declaration_of_need_token) {
      return Response.json({ error: 'Missing declaration of need token' }, { status: 400 });
    }

    const claims = await base44.asServiceRole.entities.Claim.filter({ declaration_of_need_token });
    if (!claims || claims.length === 0) {
      return Response.json({ valid: false }, { status: 200 });
    }
    const claim = claims[0];

    // Only expose the minimal pre-fill / display fields — never the full claim record.
    return Response.json({
      valid: true,
      signed: !!claim.declaration_of_need_signed,
      // Pre-fill fields
      client_name: claim.client_name || '',
      reg: claim.reg || '',
      vehicle_make: claim.vehicle_make || claim.make_model || '',
      vehicle_model: claim.vehicle_model || '',
      loss_date: claim.loss_date || '',
      claim_ref: claim.claim_ref || '',
      job_number: claim.job_number || '',
    });
  } catch (error) {
    console.error('getDeclarationOfNeedClaim error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});