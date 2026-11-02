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
 * What each portal is sent from a claim. This is a list of what IS shown, not of what
 * is hidden, so a field added to claims later stays internal until it is added here.
 * Nobody outside RCM gets the internal secondary and tertiary statuses, money owed
 * between RCM and others, notes, link tokens or the invoicing tracker.
 */
const COMMON_FIELDS = [
  'id', 'created_date', 'updated_date', 'archived',
  'job_number', 'reg', 'claim_type', 'journey_status', 'job_status', 'outcome',
  // vehicle
  'make_model', 'vehicle_make', 'vehicle_model', 'vehicle_colour', 'vehicle_fuel_type', 'vehicle_year_of_manufacture',
  'vehicle_type', 'vehicle_mot_status', 'vehicle_mot_expiry_date', 'vehicle_tax_status', 'vehicle_tax_due_date',
  'vehicle_use', 'vehicle_location', 'vehicle_damage', 'unroadworthy', 'courtesy_car_required',
  // incident
  'loss_date', 'loss_time', 'incident_location', 'circumstances',
  // client and driver
  'client_id', 'client_name', 'client_phone', 'client_email', 'client_address_line_1', 'client_address_line_2',
  'client_town', 'client_county', 'client_postcode', 'client_vat_status',
  'driver_contact_name', 'driver_contact_phone', 'driver_contact_email', 'driver_contact_address_line_1',
  'driver_contact_address_line_2', 'driver_contact_town', 'driver_contact_county', 'driver_contact_postcode',
  // insurance
  'insurer', 'claim_ref', 'policy_number', 'policy_excess', 'excess_tbc', 'authorising_party',
  // repairer and key dates
  'bodyshop', 'bodyshop_id', 'bodyshop_email', 'date_received', 'estimate_completed', 'authority_received',
  'bs_instructed', 'booking_in_date', 'on_site_date', 'ecd', 'completion_date', 'hand_over_date', 'salvage_collected_date',
  // files
  'file_urls', 'image_urls',
];

const PORTAL_FIELDS: Record<string, string[]> = {
  client: [
    ...COMMON_FIELDS,
    'client_ref', 'business_division', 'broker_name', 'cancellation_reason',
    'authority_cost_gross', 'final_repair_cost',
    'has_third_party', 'tp_name', 'tp_phone', 'tp_email', 'tp_make_model', 'tp_reg', 'tp_insurer', 'tp_claim_ref', 'tp_policy_number',
  ],
  referrer: [
    ...COMMON_FIELDS,
    'referrer', 'referrer_id', 'referrer_ref', 'client_ref', 'business_division', 'broker_name', 'cancellation_reason',
    'authority_cost_gross', 'final_repair_cost',
    'has_third_party', 'tp_name', 'tp_phone', 'tp_email', 'tp_make_model', 'tp_reg', 'tp_insurer', 'tp_claim_ref', 'tp_policy_number',
  ],
  // The repairer gets what they need to book in, repair and invoice the job: no third
  // party, referrer or broker details, and no internal reasons.
  bodyshop: [
    ...COMMON_FIELDS,
    'repairer_accepted', 'repairer_accepted_date', 'instruction_pdf_url', 'referral_fee_repairer',
    'authority_cost_gross',
  ],
};

export function claimForPortal(claim: any, kind: PortalKind = 'client'): any {
  if (!claim) return claim;
  if (kind === 'internal') return claim;
  const allowed = PORTAL_FIELDS[kind] || COMMON_FIELDS;
  const out: Record<string, unknown> = {};
  for (const key of allowed) if (claim[key] !== undefined) out[key] = claim[key];
  return out;
}

/**
 * Which shared updates each portal sees. Status changes show the journey status only
 * (the internal secondary/tertiary part of the line is removed), and replies follow
 * the update they reply to. A repairer only sees repairer messages from after they
 * were instructed, so a job passed on from another repairer doesn't show that one's
 * messages.
 */
const UPDATE_TYPES_FOR: Record<string, string[]> = {
  client: ['Status Change', 'Client Communication', 'General Update'],
  referrer: ['Status Change', 'Referrer Communication', 'Client Communication', 'General Update'],
  bodyshop: ['Status Change', 'Bodyshop Communication', 'Parts'],
};

function journeyOnly(description: string): string | null {
  const parts = String(description || '').split(' · ').filter((p) => /^Status changed from /.test(p.trim()));
  return parts.length ? parts.join(' · ') : null;
}

export function updatesForPortal(updates: any[], claim: any, kind: PortalKind): any[] {
  const types = UPDATE_TYPES_FOR[kind];
  if (!types) return kind === 'internal' ? updates : [];
  const since = kind === 'bodyshop' && claim?.bs_instructed ? String(claim.bs_instructed).slice(0, 10) : null;
  const shown = new Map<string, any>();
  const all = updates || [];
  const tops = all.filter((u: any) => !u.parent_update_id);
  for (const u of tops) {
    if (!types.includes(u.update_type)) continue;
    if (since && u.update_type !== 'Status Change' && String(u.created_date || '').slice(0, 10) < since) continue;
    let description = u.description;
    if (u.update_type === 'Status Change') {
      description = journeyOnly(u.description);
      if (!description) continue;
    }
    const { tagged_user_ids, liked_by, starred, company_id, ...rest } = u;
    shown.set(u.id, { ...rest, description });
  }
  const replies = all
    .filter((u: any) => u.parent_update_id && shown.has(u.parent_update_id))
    .map((u: any) => {
      const { tagged_user_ids, liked_by, starred, company_id, ...rest } = u;
      return rest;
    });
  return [...shown.values(), ...replies];
}

/** The parts of a repairer record a referrer or client may see for their own claim. */
export function repairerForPortal(bodyshop: any): any {
  if (!bodyshop) return null;
  const pick = ['id', 'name', 'logo_url', 'contact_name', 'phone', 'mobile_phone', 'email', 'web_address',
    'full_address', 'address_line_1', 'address_line_2', 'town', 'county', 'postcode', 'latitude', 'longitude'];
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
