import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { clip, looksAutomated } from '../../shared/publicLinks.ts';

// Public endpoint: the open parts request form anyone can fill in (no link or sign-in).
// Protection: a hidden field and a minimum time on the page screen out automated
// submissions, and only the form's own fields are saved, each trimmed to length.
// A request always starts as New Request and is checked by staff.
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
    const data = await req.json().catch(() => ({}));

    if (looksAutomated(data)) {
      return Response.json({ error: 'We could not accept this request. Please try again.' }, { status: 400 });
    }

    const f = {
      vehicle_ref: clip(data?.vehicle_ref, 50),
      manufacturer: clip(data?.manufacturer, 100),
      part_description: clip(data?.part_description, 2000),
      part_number: clip(data?.part_number, 100),
      part_type: clip(data?.part_type, 100),
      bodyshop_company: clip(data?.bodyshop_company, 200),
      contact_name: clip(data?.contact_name, 200),
      contact_number: clip(data?.contact_number, 50),
      contact_email: clip(data?.contact_email, 200),
      delivery_address: clip(data?.delivery_address, 500),
      additional_comments: clip(data?.additional_comments, 2000),
    };

    if (!f.vehicle_ref || !f.manufacturer || !f.part_description || !f.contact_name || !f.contact_number) {
      return Response.json({ error: 'Please fill in all the required fields.' }, { status: 400 });
    }

    const part = await base44.asServiceRole.entities.Part.create({
      ...f,
      sourcing_status: 'New Request',
      date_requested: new Date().toISOString().split('T')[0],
    });

    return Response.json({ success: true, id: part.id });
  } catch (error: any) {
    console.error('submitPublicPartsRequest error:', error?.message, error?.stack);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
});
