/**
 * Central claim-type-driven logic.
 *
 * Single source of truth for:
 *  - which party we liaise with for "Insurer Communication" on a given claim type
 *  - which Update Types are relevant for a given claim
 *
 * Consumed by the Updates modal (UpdateContactSelector + ClaimUpdateForm) and
 * available for instructions / emails / chasers to reuse so every claim-facing
 * surface is driven by the same rules.
 */

export const CLAIM_TYPES = [
  "Fault Claim",
  "Non-Fault - Own Insurer",
  "3rd Party Insurer Direct",
  "3rd Party Paying Privately",
  "Credit Repair",
  "Glass Claim",
  "Paying Privately",
];

// Mirrors the ClaimUpdate.update_type enum.
export const ALL_UPDATE_TYPES = [
  "Status Change",
  "Client Communication",
  "Bodyshop Communication",
  "Insurer Communication",
  "Referrer Communication",
  "Credit Repair Communication",
  "Parts",
  "General Update",
  "Other",
];

/**
 * The party we liaise with for "Insurer Communication" on this claim.
 * Returns a normalised descriptor; the selector fetches the related entity
 * (Insurer / CreditRepairCompany) based on `kind` when one exists.
 *
 * kind values:
 *  - 'client_insurer'  → Insurer entity matched by claim.insurer
 *  - 'tp_insurer'      → Insurer entity matched by claim.tp_insurer
 *  - 'tp_person'       → raw TP person/company fields on the claim (no entity)
 *  - 'credit_repair'   → CreditRepairCompany entity
 *  - 'client'          → raw client fields on the claim (Paying Privately)
 */
export function getLiaiseTarget(claim) {
  if (!claim) return null;
  const ct = claim.claim_type;
  switch (ct) {
    case "3rd Party Insurer Direct":
      return {
        kind: "tp_insurer",
        name: claim.tp_insurer,
        hasContacts: !!claim.tp_insurer,
      };
    case "3rd Party Paying Privately":
      return {
        kind: "tp_person",
        name: claim.tp_name,
        phone: claim.tp_phone,
        email: claim.tp_email,
        hasContacts: !!(claim.tp_name || claim.tp_phone || claim.tp_email),
      };
    case "Credit Repair":
      return {
        kind: "credit_repair",
        name: claim.credit_repair_company_name,
        entityId: claim.credit_repair_company_id,
        hasContacts: !!(claim.credit_repair_company_id || claim.credit_repair_company_name),
      };
    case "Paying Privately":
      return {
        kind: "client",
        name: claim.client_name,
        phone: claim.client_phone,
        email: claim.client_email,
        hasContacts: !!claim.client_name,
      };
    case "Fault Claim":
    case "Non-Fault - Own Insurer":
    case "Glass Claim":
    default:
      return {
        kind: "client_insurer",
        name: claim.insurer,
        hasContacts: !!claim.insurer,
      };
  }
}

/**
 * Update Types relevant to this claim, in display order.
 * Always includes Status Change, Client Communication, General Update, Other, Parts.
 * Conditionally includes Bodyshop / Insurer / Referrer / Credit Repair communication.
 */
export function getAvailableUpdateTypes(claim) {
  if (!claim) return ALL_UPDATE_TYPES;
  const relevant = new Set(["Status Change", "Client Communication", "General Update", "Other", "Parts"]);

  if (claim.bodyshop_id || claim.bodyshop) relevant.add("Bodyshop Communication");

  const liaise = getLiaiseTarget(claim);
  if (liaise?.hasContacts) relevant.add("Insurer Communication");

  if (claim.referrer_id || claim.referrer) relevant.add("Referrer Communication");

  if (claim.claim_type === "Credit Repair" || claim.credit_repair_company_id) {
    relevant.add("Credit Repair Communication");
  }

  return ALL_UPDATE_TYPES.filter((t) => relevant.has(t));
}