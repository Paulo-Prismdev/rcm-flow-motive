import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireInternalUser } from '../../shared/internalAccess.ts';
import { LINK_TTL_DAYS, signClaimLink } from '../../shared/publicLinks.ts';

/**
 * Staff only: a signed backordered-parts link for one claim, for a repairer to fill
 * in without signing in. It opens that claim's form only and runs out after
 * LINK_TTL_DAYS days. The screen builds the full address from the token.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const gate = await requireInternalUser(base44);
    if (gate.response) return gate.response;

    const { claim_id } = await req.json().catch(() => ({}));
    if (!claim_id || typeof claim_id !== 'string') {
      return Response.json({ error: 'claim_id is required' }, { status: 400 });
    }
    const claim = await base44.asServiceRole.entities.Claim.get(claim_id).catch(() => null);
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

    const token = await signClaimLink('backorder', claim.id);
    const expiresAt = new Date(Date.now() + LINK_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    return Response.json({ token, expires_at: expiresAt });
  } catch (error: any) {
    console.error('issueBackorderLink error:', error?.message);
    return Response.json({ error: 'Could not create the link' }, { status: 500 });
  }
});
