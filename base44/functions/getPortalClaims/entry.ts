import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { claimFilterFor, claimForPortal, currentUser, portalScope } from '../../shared/portalAccess.ts';

/**
 * A portal user's own claims: a repairer's jobs, a referrer's referrals, a client's
 * claims. Never anyone else's, and never the fields portals must not hold (see
 * shared/portalAccess.ts).
 *
 * Repairers pass `view`: 'accepted' (their jobs, the default) or 'pending' (jobs sent
 * to them that they have not yet accepted, excluding closed ones).
 */
const CLOSED = ['Completed', 'Cancelled', 'Total Loss'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await currentUser(base44);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const scope = portalScope(user);
    const filter = scope ? claimFilterFor(scope) : null;
    if (!scope || !filter) return Response.json({ claims: [] });

    const { view } = await req.json().catch(() => ({}));
    if (scope.kind === 'bodyshop') {
      filter.repairer_accepted = view === 'pending' ? false : true;
    }

    let claims = await base44.asServiceRole.entities.Claim.filter(filter, '-created_date', 5000);
    if (scope.kind === 'bodyshop' && view === 'pending') {
      claims = (claims || []).filter((c: any) => !CLOSED.includes(c.job_status));
    }

    return Response.json({ claims: (claims || []).map(claimForPortal) });
  } catch (error: any) {
    console.error('getPortalClaims error:', error?.message);
    return Response.json({ error: 'Could not load claims' }, { status: 500 });
  }
});
