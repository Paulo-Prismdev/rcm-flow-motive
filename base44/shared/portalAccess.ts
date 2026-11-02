/**
 * Who a portal user is, and which claims are theirs.
 *
 * Portal users (repairers, referrers, clients) never read claim records directly: the
 * claim tables are internal-only. Everything a portal shows comes through a server
 * function that uses these helpers, so each portal only ever sees its own claims.
 *
 *   repairer  — user type "bodyshop", linked to a Bodyshop: claims sent to that bodyshop
 *   referrer  — user type "referrer" (or linked to a referrer): claims they referred,
 *               matched on their linked referrer or their company
 *   client    — user type "client": claims for their company in the shared directory
 *
 * A role never makes anyone internal, and a user with none of these links sees nothing.
 */
import { isInternalUser } from './internalAccess.ts';

export type PortalKind = 'internal' | 'bodyshop' | 'referrer' | 'client';

export interface PortalScope {
  kind: PortalKind;
  bodyshopId?: string;
  referrerIds?: string[];
  clientIds?: string[];
}

const ids = (...values: unknown[]) =>
  values.filter((v): v is string => typeof v === 'string' && v.trim() !== '');

/** The portal a user belongs to, or null when they have no portal access at all. */
export function portalScope(user: any): PortalScope | null {
  if (!user) return null;
  if (isInternalUser(user)) return { kind: 'internal' };
  if (user.user_type === 'bodyshop') {
    return user.linked_bodyshop_id ? { kind: 'bodyshop', bodyshopId: user.linked_bodyshop_id } : null;
  }
  if (user.user_type === 'client') {
    const clientIds = ids(user.company_id, user.linked_client_id);
    return clientIds.length ? { kind: 'client', clientIds } : null;
  }
  if (user.user_type === 'referrer' || (user.linked_referrer_id && !user.user_type)) {
    const referrerIds = ids(user.linked_referrer_id, user.company_id);
    return referrerIds.length ? { kind: 'referrer', referrerIds } : null;
  }
  return null;
}

/** Whether a claim belongs to this portal user (internal staff can see every claim). */
export function ownsClaim(scope: PortalScope | null, claim: any): boolean {
  if (!scope || !claim) return false;
  switch (scope.kind) {
    case 'internal': return true;
    case 'bodyshop': return !!claim.bodyshop_id && claim.bodyshop_id === scope.bodyshopId;
    case 'referrer': return !!claim.referrer_id && (scope.referrerIds || []).includes(claim.referrer_id);
    case 'client': return !!claim.client_id && (scope.clientIds || []).includes(claim.client_id);
    default: return false;
  }
}

/** The filter that lists a portal user's own claims. */
export function claimFilterFor(scope: PortalScope): Record<string, unknown> | null {
  switch (scope.kind) {
    case 'bodyshop': return { bodyshop_id: scope.bodyshopId };
    case 'referrer': return { referrer_id: { $in: scope.referrerIds } };
    case 'client': return { client_id: { $in: scope.clientIds } };
    default: return null;
  }
}

/**
 * Fields a portal never receives, whoever owns the claim: the public form link tokens
 * (anyone holding one can sign on the client's behalf) and the internal invoicing
 * tracker. The full per-portal field list is settled in the portals round.
 */
const NEVER_TO_PORTALS = /(_token$|^invoice_tracker$)/;

export function claimForPortal(claim: any): any {
  if (!claim) return claim;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(claim)) {
    if (!NEVER_TO_PORTALS.test(key)) out[key] = value;
  }
  return out;
}

/** The parts of a repairer record a referrer or client may see for their own claim. */
export function repairerForPortal(bodyshop: any): any {
  if (!bodyshop) return null;
  const pick = ['id', 'name', 'address', 'address_line_1', 'address_line_2', 'town', 'city', 'county',
    'postcode', 'phone', 'email', 'contact_name', 'website', 'latitude', 'longitude', 'logo_url'];
  const out: Record<string, unknown> = {};
  for (const key of pick) if (bodyshop[key] !== undefined) out[key] = bodyshop[key];
  return out;
}

/** Signed-in user, or null when the request has no session. */
export async function currentUser(base44: any): Promise<any> {
  try {
    return await base44.auth.me();
  } catch {
    return null;
  }
}
