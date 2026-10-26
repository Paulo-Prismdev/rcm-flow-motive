import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * The directory record attached to one claim, for a portal user who owns that claim.
 *
 * The directory itself is internal-only, so a referrer can never list it. What the
 * referrer portal still needs is the client behind a claim it is allowed to see, so
 * this returns that one linked record and nothing else: the claim must be one of the
 * caller's own (their linked referrer or company), otherwise the call is refused.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { claim_id } = await req.json().catch(() => ({}));
    if (!claim_id) return Response.json({ error: 'claim_id is required' }, { status: 400 });

    const claim = await base44.asServiceRole.entities.Claim
      .get(claim_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

    const ownReferrerIds = [user.linked_referrer_id, user.company_id].filter(Boolean);
    const ownsClaim = ownReferrerIds.length > 0 && ownReferrerIds.includes(claim.referrer_id);
    const isInternal = user.user_type === 'internal';
    if (!isInternal && !ownsClaim) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!claim.client_id) return Response.json({ client: null });

    const client = await base44.asServiceRole.entities.Client
      .get(claim.client_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));

    return Response.json({ client: client || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}