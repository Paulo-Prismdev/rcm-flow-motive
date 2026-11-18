/**
 * Our contribution towards the client's policy excess, and how it reaches them.
 *
 * - Direct to Client: we pay the client the contribution ourselves. It is money we
 *   owe, tracked on its own item in the invoicing flow ("Excess Contribution to
 *   Client"), with the client's bank details shown there as the reminder.
 * - Via Repairer: the repairer collects that much less excess from the client. Who
 *   bears that cost is chosen on the claim:
 *     Repairer — the repairer absorbs it; nothing changes on our invoices.
 *     RCM      — we cover it in full; it comes off the referral fee invoice.
 *     Split    — we cover part of it (excess_contribution_rcm_amount), the repairer
 *                the rest; our part comes off the referral fee invoice.
 *   The excess is the client's contribution, not a supply: the deduction is taken
 *   off the referral invoice after VAT, and never changes the VAT on the fee.
 *
 * The client always pays the repairer their excess (less any contribution the
 * repairer allows them), so nothing here touches the insurer's share or ACG.
 */

const toNum = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const COVERED_BY_OPTIONS = [
  { value: 'Repairer', label: 'The repairer covers it in full', short: 'Repairer in full' },
  { value: 'RCM', label: 'We cover it in full — taken off our referral fee invoice', short: 'RCM in full (off the referral fee)' },
  { value: 'Split', label: 'Shared — we cover part, the repairer the rest', short: 'Shared' },
];

/** 'none' | 'direct' | 'via_repairer' — 'Waived' is an older value meaning none. */
export function contributionRoute(claim) {
  const method = claim?.excess_contribution_method;
  if (method === 'Direct to Client') return 'direct';
  if (method === 'Via Repairer') return 'via_repairer';
  return 'none';
}

export const contributionAmount = (claim) =>
  contributionRoute(claim) === 'none' ? 0 : round2(Math.max(0, toNum(claim?.excess_contribution_amount)));

export const contributionApplies = (claim) => contributionAmount(claim) > 0;

export const paysClientDirectly = (claim) => contributionRoute(claim) === 'direct' && contributionApplies(claim);

/**
 * Via the repairer: our part of the contribution, which comes off the referral fee.
 *   { applies, decided, ours, repairers, amount, coveredBy, hint }
 * `decided` is false while who covers it has not been chosen (or a share has not
 * been entered) — the referral invoice waits for that rather than guess.
 */
export function viaRepairerShare(claim) {
  const amount = contributionAmount(claim);
  const coveredBy = claim?.excess_contribution_covered_by || '';
  const base = { applies: false, decided: true, ours: 0, repairers: 0, amount, coveredBy, hint: '' };
  if (contributionRoute(claim) !== 'via_repairer' || amount <= 0) return base;
  if (coveredBy === 'Repairer') return { ...base, applies: true, repairers: amount };
  if (coveredBy === 'RCM') return { ...base, applies: true, ours: amount };
  if (coveredBy === 'Split') {
    const raw = claim?.excess_contribution_rcm_amount;
    if (raw === null || raw === undefined || raw === '') {
      return { ...base, applies: true, decided: false, hint: `Enter our share of the ${fmt(amount)} excess contribution` };
    }
    const ours = round2(Math.min(amount, Math.max(0, toNum(raw))));
    return { ...base, applies: true, ours, repairers: round2(amount - ours) };
  }
  return { ...base, applies: true, decided: false, hint: `Choose who covers the ${fmt(amount)} excess contribution` };
}

/** What comes off the referral fee invoice for our part of the contribution. */
export const referralDeduction = (claim) => {
  const share = viaRepairerShare(claim);
  return share.applies && share.decided ? share.ours : 0;
};

/** The client's bank details for a direct payment, and whether any are missing. */
export function payeeDetails(claim) {
  const details = {
    name: (claim?.excess_contribution_payee_name || '').trim(),
    sortCode: (claim?.excess_contribution_sort_code || '').trim(),
    accountNumber: (claim?.excess_contribution_account_number || '').trim(),
    reference: (claim?.excess_contribution_payment_reference || '').trim(),
  };
  return { ...details, complete: !!(details.name && details.sortCode && details.accountNumber) };
}

/** A one-line description of the arrangement, for the claim screen. */
export function contributionSummary(claim) {
  const amount = contributionAmount(claim);
  if (amount <= 0) return '';
  const route = contributionRoute(claim);
  if (route === 'direct') return `${fmt(amount)} paid to the client by us`;
  const share = viaRepairerShare(claim);
  if (!share.decided) return `${fmt(amount)} via the repairer — who covers it still to choose`;
  if (share.coveredBy === 'Repairer') return `${fmt(amount)} via the repairer — the repairer covers it`;
  if (share.coveredBy === 'RCM') return `${fmt(amount)} via the repairer — we cover it, off the referral fee`;
  return `${fmt(amount)} via the repairer — we cover ${fmt(share.ours)} (off the referral fee), the repairer ${fmt(share.repairers)}`;
}

function fmt(n) {
  return `£${round2(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
