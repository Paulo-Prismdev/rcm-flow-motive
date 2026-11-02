import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { ownsClaim, portalScope } from '../../shared/portalAccess.ts';

/**
 * The directory record attached to one claim, for a portal user who owns that claim.
 *
 * The directory itself is internal-only, so a referrer can never list it. What the
 * referrer portal still needs is the client behind a claim it is allowed to see, so
 * this returns that one linked record and nothing else: the claim must be one of the
 * caller's own (their linked referrer or company), otherwise the call is refused.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { claim_id } = await req.json().catch(() => ({}));
    if (!claim_id) return Response.json({ error: 'claim_id is required' }, { status: 400 });

    const claim = await base44.asServiceRole.entities.Claim
      .get(claim_id)
      .catch((e: any) => (e.status === 404 ? null : Promise.reject(e)));
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

    // Any portal (repairer, referrer, client) may read this for a claim of its own.
    const owns = ownsClaim(portalScope(user), claim);
    if (!owns) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!claim.client_id) return Response.json({ client: null });

    const client = await base44.asServiceRole.entities.Client
      .get(claim.client_id)
      .catch((e: any) => (e.status === 404 ? null : Promise.reject(e)));

    if (!client) return Response.json({ client: null });
    // Only the contact details the portal shows, never the rest of the directory record.
    const contacts = Array.isArray(client.contacts)
      ? client.contacts.map((c: any) => ({ name: c?.name, position: c?.position, phone: c?.phone, email: c?.email, is_primary: !!c?.is_primary }))
      : [];
    return Response.json({
      client: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
        company_contact_phone: client.company_contact_phone,
        company_contact_email: client.company_contact_email,
        contacts,
      },
    });
  } catch (error: any) {
    console.error('getReferrerClaimClient error:', error?.message);
    return Response.json({ error: 'Could not load the client details' }, { status: 500 });
  }
}