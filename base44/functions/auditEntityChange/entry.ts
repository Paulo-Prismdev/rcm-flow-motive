import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Discovery build: records the shape of the entity-event payload so the audit can be
// written against it. Replaced by the full audit straight after.
Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  const shape = (o: any, depth = 0): any => {
    if (!o || typeof o !== 'object' || depth > 2) return typeof o;
    return Object.fromEntries(Object.entries(o).slice(0, 40).map(([k, v]) => [k, shape(v, depth + 1)]));
  };
  console.log('AUDIT_PAYLOAD_SHAPE', JSON.stringify(shape(body)));
  console.log('AUDIT_PAYLOAD_META', JSON.stringify({
    event: body?.event, keys: Object.keys(body || {}),
    actor: body?.user || body?.actor || body?.triggered_by || null,
    updated_by: body?.data?.updated_by ?? null, created_by: body?.data?.created_by ?? null,
    changed: body?.changed_fields || body?.changes || null,
  }));
  return Response.json({ ok: true });
});
