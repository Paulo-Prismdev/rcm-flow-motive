import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const referrerId = user.linked_referrer_id;
    const companyId = user.company_id;

    if (!referrerId && !companyId) {
      return Response.json({ claims: [] });
    }

    const claims = await base44.asServiceRole.entities.Claim.filter({
      $or: [
        ...(referrerId ? [{ referrer_id: referrerId }] : []),
        ...(companyId ? [{ referrer_id: companyId }] : [])
      ]
    }, '-created_date', 5000);

    return Response.json({ claims: claims || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});