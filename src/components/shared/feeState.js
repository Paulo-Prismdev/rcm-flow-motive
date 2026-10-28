/**
 * A fee on a claim — the referrer's, a second referrer's, or the repairer's referral —
 * in one of three states:
 *
 *  - 'set'     a fee is agreed: a % or a fixed £ figure, either of which counts.
 *  - 'none'    no fee on this job, chosen deliberately and recorded as a 0% or a £0.
 *  - 'missing' nothing recorded at all: still to be set, so it is flagged.
 *
 * The difference between the last two is the whole point. A blank fee is still asked
 * for, so it is never quietly forgotten; a fee deliberately waived is accepted exactly
 * as an agreed fee is — no warning, the job figures can be confirmed, and the invoice
 * it would have produced is marked not applicable rather than chased.
 *
 * A stored zero IS the record of that choice, so it needs no flag of its own: 0% or £0
 * means no fee on this job, and clearing the field back to blank asks for it again.
 */

const isStored = (value) => value !== null && value !== undefined && value !== '';
const num = (value) => (isStored(value) ? Number(value) : NaN);

const trackerOf = (claim) => claim?.invoice_tracker || {};

/** Where each fee's two forms live, and what it is called. */
export const FEE_SLOTS = {
  referrer: {
    label: 'Referrer fee',
    percent: (claim) => claim?.percent_to_referrer,
    fixed: (claim) => trackerOf(claim).referrer_fee_gbp,
  },
  second_referrer: {
    label: 'Second referrer fee',
    percent: (claim) => trackerOf(claim).second_referrer_percent,
    fixed: (claim) => trackerOf(claim).second_referrer_fee_gbp,
  },
  repairer_referral: {
    label: 'Repairer referral fee',
    percent: (claim) => claim?.referral_fee_repairer,
    fixed: (claim) => claim?.referral_fee_repairer_gbp,
  },
};

/** 'set' | 'none' | 'missing' for one of the slots above. */
export function feeState(claim, slotKey) {
  const slot = FEE_SLOTS[slotKey];
  if (!slot) return 'missing';
  const percent = num(slot.percent(claim));
  const fixed = num(slot.fixed(claim));
  // Either form counts as the fee, and a figure in either one wins over a zero in
  // the other: £300 agreed is a fee however the percentage reads.
  if (percent > 0 || fixed > 0) return 'set';
  if (percent === 0 || fixed === 0) return 'none';
  return 'missing';
}

/** Whether the fee was deliberately waived on this job. */
export const noFeeOnJob = (claim, slotKey) => feeState(claim, slotKey) === 'none';

/** The words the job figures, the check and the invoice card all use for it. */
export const NO_FEE_LABEL = 'No fee on this job';
export const NO_FEE_DISPLAY = 'No fee';
export const NO_FEE_REASON = 'no fee on this job';