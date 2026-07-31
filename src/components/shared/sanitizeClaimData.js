// Hardcoded set of numeric fields on the Claim entity (from base44/entities/Claim.jsonc).
// The server rejects string values (e.g. "" or "0") for these fields with a 422,
// so any save payload must coerce them to real numbers (or null).
const CLAIM_NUMBER_FIELDS = new Set([
  "policy_excess",
  "excess_contribution_amount",
  "percent_to_referrer",
  "client_lat",
  "client_lng",
  "vehicle_year_of_manufacture",
  "vehicle_engine_capacity",
  "vehicle_co2_emissions",
  "vehicle_revenue_weight",
  "est_fee",
  "referral_fee_repairer",
  "referral_fee_repairer_gbp",
  "percent_bld_instruction",
  "estimate_cost_net",
  "authority_cost_net",
  "estimate_cost_gross",
  "authority_cost_gross",
  "final_repair_cost",
  "total_invoice_repairer",
  "percent_fee_optima",
  "percent_taken_factor",
  "percent_bld_invoice",
  "artura_percent",
  "storage_amount_net",
  "storage_amount_vat",
  "storage_invoice_repairer",
  "invoice_amount",
  "indemnity_driver_age",
]);

/**
 * Coerce a single value into a valid number-field payload:
 * - "" / null / undefined  -> null
 * - numeric string / number -> Number (NaN -> null)
 */
function toNumberOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  if (typeof v === "number") return isNaN(v) ? null : v;
  if (typeof v === "string") {
    const n = Number(v);
    return isNaN(n) ? null : n;
  }
  return null;
}

/**
 * Returns a shallow copy of `data` where every known Claim number field
 * is coerced to a real number (or null). Non-number fields are passed through.
 */
export function sanitizeClaimData(data) {
  if (!data || typeof data !== "object") return data;
  const out = { ...data };
  for (const key of CLAIM_NUMBER_FIELDS) {
    if (key in out) {
      out[key] = toNumberOrNull(out[key]);
    }
  }
  return out;
}