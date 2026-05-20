import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-form-secret',
      },
    });
  }

  const base44 = createClientFromRequest(req);

  const data = await req.json();

  const secret = data._form_secret;
  if (!secret || secret !== Deno.env.get('PUBLIC_FORM_SECRET')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  delete data._form_secret;

  if (!data.vehicle_ref || !data.manufacturer || !data.part_description || !data.contact_name || !data.contact_number) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const part = await base44.asServiceRole.entities.Part.create({
    vehicle_ref: data.vehicle_ref,
    manufacturer: data.manufacturer,
    part_description: data.part_description,
    part_number: data.part_number || '',
    part_type: data.part_type || '',
    bodyshop_company: data.bodyshop_company || '',
    contact_name: data.contact_name,
    contact_number: data.contact_number,
    contact_email: data.contact_email || '',
    delivery_address: data.delivery_address || '',
    additional_comments: data.additional_comments || '',
    sourcing_status: 'New Request',
    date_requested: new Date().toISOString().split('T')[0],
  });

  return Response.json({ success: true, id: part.id });
});