import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  claimForPortal, currentUser, ownsClaim, portalScope, repairerForPortal, updatesForPortal,
} from '../../shared/portalAccess.ts';

/**
 * Everything a portal's claim screen shows for one claim the caller owns: the claim,
 * its shared update feed, its backordered parts and the repairer's contact details.
 * Any claim that isn't the caller's is refused.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await currentUser(base44);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { claim_id } = await req.json().catch(() => ({}));
    if (!claim_id || typeof claim_id !== 'string') {
      return Response.json({ error: 'claim_id is required' }, { status: 400 });
    }

    const claim = await base44.asServiceRole.entities.Claim.get(claim_id).catch(() => null);
    const scope = portalScope(user);
    if (!claim || !ownsClaim(scope, claim)) {
      return Response.json({ error: 'Claim not found' }, { status: 404 });
    }

    const [updates, parts, bodyshop] = await Promise.all([
      base44.asServiceRole.entities.ClaimUpdate.filter({ claim_id }, '-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.BackorderedPart.filter({ claim_id }, '-created_date', 200).catch(() => []),
      claim.bodyshop_id
        ? base44.asServiceRole.entities.Bodyshop.get(claim.bodyshop_id).catch(() => null)
        : Promise.resolve(null),
    ]);

    // Only the updates meant for this portal (see shared/portalAccess.ts).
    const sharedUpdates = updatesForPortal(updates || [], claim, scope!.kind);

    return Response.json({
      claim: claimForPortal(claim, scope!.kind),
      updates: sharedUpdates,
      backordered_parts: (parts || []).map((p: any) => {
        const { submitted_by_phone, ...rest } = p;
        return rest;
      }),
      repairer: repairerForPortal(bodyshop),
    });
  } catch (error: any) {
    console.error('getPortalClaimDetail error:', error?.message);
    return Response.json({ error: 'Could not load the claim' }, { status: 500 });
  }
});
