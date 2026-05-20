import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const data = await req.json();

    const secret = data._form_secret;
    if (!secret || secret !== Deno.env.get('PUBLIC_FORM_SECRET')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    delete data._form_secret;

    if (!data.claim_id || !data.parts || !Array.isArray(data.parts) || data.parts.length === 0) {
      return Response.json({ error: 'Missing required fields: claim_id and parts array' }, { status: 400 });
    }

    const claim = await base44.asServiceRole.entities.Claim.get(data.claim_id);
    if (!claim) {
      return Response.json({ error: 'Claim not found' }, { status: 404 });
    }

    const created = [];
    for (const part of data.parts) {
      if (!part.part_description) continue;
      const record = await base44.asServiceRole.entities.BackorderedPart.create({
        claim_id: data.claim_id,
        claim_job_number: claim.job_number || '',
        claim_reg: claim.reg || '',
        part_description: part.part_description,
        part_number: part.part_number || '',
        supplier_name: part.supplier_name || '',
        expected_arrival_date: part.expected_arrival_date || '',
        additional_notes: part.additional_notes || '',
        submitted_by_name: data.submitted_by_name || '',
        submitted_by_phone: data.submitted_by_phone || '',
        received_by_repairer: false,
      });
      created.push(record);
    }

    return Response.json({ success: true, count: created.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});