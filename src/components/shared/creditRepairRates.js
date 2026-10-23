/**
 * Credit repair rates.
 *
 * On a credit repair claim the credit repair company pays the repairer and
 * processes the job; our income is two invoices to that company — an upfront
 * hire fee (set by the hire category) and a commission on the final repair cost.
 *
 * The partner's agreed rates live on their CreditRepairCompany directory entry.
 * When a claim selects a partner and a hire category those rates are LOCKED onto
 * the claim, so later changes to the partner's rates never move a claim that is
 * already under way. Staff can still adjust the locked rates on a single claim,
 * which flags the claim as adjusted.
 */

export const CREDIT_REPAIR_CLAIM_TYPE = 'Credit Repair';

export const HIRE_CATEGORIES = ['Standard', 'Prestige', 'Super Prestige'];

export const COMMISSION_BASES = ['Net (ex VAT)', 'Gross (inc VAT)'];

export const VAT_RATE = 0.2;

const HIRE_FEE_FIELD = {
  Standard: 'hire_fee_standard',
  Prestige: 'hire_fee_prestige',
  'Super Prestige': 'hire_fee_super_prestige',
};

export const hireFeeField = (category) => HIRE_FEE_FIELD[category] || null;

export const hasValue = (v) => v !== undefined && v !== null && v !== '';

export const toNum = (v) => {
  if (!hasValue(v)) return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

export const fmtGBP = (value) =>
  `£${toNum(value).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const isCreditRepairClaim = (claim) => claim?.claim_type === CREDIT_REPAIR_CLAIM_TYPE;

/** The rates a partner has on file for one hire category (null where unset). */
export function partnerRates(company, category) {
  if (!company || !category) return null;
  const field = hireFeeField(category);
  return {
    hire_fee: field && hasValue(company[field]) ? toNum(company[field]) : null,
    commission_percent: hasValue(company.commission_percent) ? toNum(company.commission_percent) : null,
    commission_basis: company.commission_basis || null,
  };
}

/** Which of a partner's agreed rates are still blank — drives the directory flag. */
export function missingPartnerRates(company) {
  const missing = [];
  for (const category of HIRE_CATEGORIES) {
    if (!hasValue(company?.[hireFeeField(category)])) missing.push(`${category} hire fee`);
  }
  if (!hasValue(company?.commission_percent)) missing.push('Commission %');
  if (!hasValue(company?.commission_basis)) missing.push('Commission basis');
  return missing;
}

export const hasCompleteRates = (company) => missingPartnerRates(company).length === 0;

/** Snapshot a partner's rates for one category, ready to lock onto a claim. */
export function buildLockedRates(company, category) {
  const rates = partnerRates(company, category);
  if (!rates) return null;
  return {
    category,
    hire_fee: rates.hire_fee,
    commission_percent: rates.commission_percent,
    commission_basis: rates.commission_basis || null,
    locked_at: new Date().toISOString(),
  };
}

/** The rates locked onto this claim, or null when none have been locked yet. */
export function claimLockedRates(claim) {
  const locked = claim?.credit_repair_rates_locked;
  if (!locked || !locked.locked_at) return null;
  return {
    category: locked.category || '',
    hireFee: hasValue(locked.hire_fee) ? toNum(locked.hire_fee) : null,
    commissionPercent: hasValue(locked.commission_percent) ? toNum(locked.commission_percent) : null,
    commissionBasis: hasValue(locked.commission_basis) ? locked.commission_basis : null,
    overridden: claim?.credit_repair_rates_overridden === true,
  };
}

/** The upfront hire fee due on this claim. */
export function creditRepairHireFee(claim) {
  const rates = claimLockedRates(claim);
  if (!rates) return { amount: 0, awaiting: true, hint: 'Set the hire category on this claim' };
  if (rates.hireFee === null) {
    return { amount: 0, awaiting: true, hint: `Awaiting partner rates — no ${rates.category || 'hire category'} hire fee set` };
  }
  return { amount: rates.hireFee, awaiting: false, hint: `${rates.category} hire fee` };
}

/** The repair cost the partner's commission is calculated on. */
export function commissionBase(claim, basis) {
  const gross = toNum(claim?.final_repair_cost);
  if (gross <= 0) return 0;
  return basis === COMMISSION_BASES[0] ? gross / (1 + VAT_RATE) : gross;
}

/** Our commission on the final repair cost, or why it can't be worked out yet. */
export function creditRepairCommission(claim) {
  const rates = claimLockedRates(claim);
  if (!rates) return { amount: 0, awaiting: true, hint: 'Set the hire category on this claim' };
  if (rates.commissionPercent === null) {
    return { amount: 0, awaiting: true, hint: 'Awaiting partner rates — no commission % set' };
  }
  // Without a net/gross basis the commission is unknowable, so it waits for the
  // partner's rate rather than assuming gross.
  if (!rates.commissionBasis) {
    return { amount: 0, awaiting: true, hint: 'Awaiting partner rates — commission basis not set' };
  }
  const base = commissionBase(claim, rates.commissionBasis);
  // The final repair cost comes off the repairer's final invoice, filed on the
  // close-out step, so that is where this figure is read from.
  if (base <= 0) return { amount: 0, awaiting: true, hint: 'Awaiting the final repair cost — read off the Final Repair Invoice' };
  return {
    amount: Math.round(base * rates.commissionPercent) / 100,
    awaiting: false,
    hint: `${rates.commissionPercent}% of ${rates.commissionBasis} repair cost`,
  };
}

/** Short form of a commission basis, for tight table cells. */
export const basisShort = (basis) => (basis === COMMISSION_BASES[0] ? 'net' : 'gross');

/** Coerce a partner rate form's values into what the entity expects. */
export function normaliseRates(data) {
  const out = { ...data };
  for (const category of HIRE_CATEGORIES) {
    const field = hireFeeField(category);
    out[field] = hasValue(out[field]) ? toNum(out[field]) : null;
  }
  out.commission_percent = hasValue(out.commission_percent) ? toNum(out.commission_percent) : null;
  out.commission_basis = out.commission_basis || null;
  return out;
}