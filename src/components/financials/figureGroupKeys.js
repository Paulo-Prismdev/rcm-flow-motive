/**
 * Which titled group of the job figures a figure lives in, so the step's own "go to
 * the figure that still has to be set" opens the group that holds it.
 */
const GROUP_OF = {
  final_repair_cost: 'repair',
  client_vat_status: 'customer',
  policy_excess: 'customer',
  percent_to_referrer: 'referrer',
  referrer_fee_gbp: 'referrer',
  second_referrer: 'second_referrer',
  second_referrer_percent: 'second_referrer',
  second_referrer_fee_gbp: 'second_referrer',
  referral_fee: 'repairer_referral',
  referral_fee_repairer: 'repairer_referral',
  referral_fee_repairer_gbp: 'repairer_referral',
  hire_category: 'credit_repair',
  hire_fee: 'credit_repair',
  commission_percent: 'credit_repair',
  commission_basis: 'credit_repair',
  storage_charge: 'storage',
  storage_fee_percent: 'storage',
  external_invoice_ref: 'notes',
  invoice_notes: 'notes',
};

export const figureGroupKey = (key) => GROUP_OF[key] || null;