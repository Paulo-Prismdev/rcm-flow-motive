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

    // Try to load the linked Client entity for richer company details
    let linkedClient = null;
    if (claim.client_id) {
      try {
        const clients = await base44.asServiceRole.entities.Client.filter({ id: claim.client_id });
        if (clients && clients.length > 0) linkedClient = clients[0];
      } catch { /* ignore — fall back to claim fields */ }
    }

    // Build a full address string from available components
    const addressParts = [
      claim.client_address_line_1,
      claim.client_address_line_2,
      claim.client_town,
      claim.client_county,
      claim.client_postcode,
    ].filter(Boolean);
    const clientAddress = addressParts.join(', ');

    // Prefer company contact details from linked Client (Company type), fall back to claim
    const isCompanyClient = linkedClient?.client_type === 'Company';
    const contactName = isCompanyClient
      ? (linkedClient.company_contact_name || claim.driver_name || claim.client_name || '')
      : (claim.driver_name || claim.client_name || '');
    const contactEmail = isCompanyClient
      ? (linkedClient.company_contact_email || claim.client_email || claim.driver_email || '')
      : (claim.driver_email || claim.client_email || '');
    const contactPhone = isCompanyClient
      ? (linkedClient.company_contact_phone || claim.client_phone || claim.driver_phone || '')
      : (claim.driver_phone || claim.client_phone || '');

    // Map claim vehicle_type to form vehicle_type
    const vehicleTypeMap = {
      'Car': 'Car',
      'Van': 'Panel Van',
      'HGV': 'HGV',
      'Other': 'Other',
      'Motorcycle': 'Other',
    };
    const mappedVehicleType = vehicleTypeMap[claim.vehicle_type] || '';

    return Response.json({
      valid: true,
      signed: !!claim.declaration_of_need_signed,
      // Display fields
      job_number: claim.job_number || '',
      claim_ref: claim.claim_ref || '',
      loss_date: claim.loss_date || '',
      // Company pre-fill
      client_name: claim.client_name || (linkedClient?.name || ''),
      client_address: clientAddress,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      // Vehicle pre-fill
      reg: claim.reg || '',
      vehicle_make: claim.vehicle_make || claim.make_model || '',
      vehicle_model: claim.vehicle_model || '',
      vehicle_type: mappedVehicleType,
      driver_name: claim.driver_name || '',
      unroadworthy: claim.unroadworthy,
      vehicle_use: claim.vehicle_use || '',
    });
  } catch (error) {
    console.error('getDeclarationOfNeedClaim error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});