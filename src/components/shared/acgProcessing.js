/**
 * ACG (Accident Credit Group) processing payment on a claim.
 *
 * ACG settle the repairer's invoice (the insurer's share of the repair) and collect
 * our referral fee on our behalf. Everything about the job is set up as normal; only
 * two things change when a claim is ticked as ACG:
 *
 *  - our referral fee drops by ACG's charge (3.25 percentage points: 20% becomes
 *    16.75%), still charged on the repair cost ex VAT, with VAT on top as usual;
 *  - the Referral Invoice Out is raised to ACG, not to the repairer.
 *
 * ACG can only be used on a job charged as a percentage, never a fixed £ fee. The
 * referrer's own fee is unchanged: RCM absorbs ACG's charge. The rate is stamped on the
 * claim when it is ticked, so a later change of ACG's rate never alters old jobs.
 */
export const ACG_FEE_PERCENT = 3.25;

export const ACG_PARTY = {
  name: 'Accident Credit Group Limited',
  addressLines: ['ACG House', '620 Birchwood Boulevard', 'Birchwood, Warrington', 'WA3 7QU'],
};

const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));

/** Whether the job's repairer referral fee is a fixed £ figure (which ACG can't take). */
export const hasFixedReferralFee = (claim) => num(claim?.referral_fee_repairer_gbp) > 0;

/** Whether ACG are processing payment on this claim (and can: percentage fee only). */
export const isAcgClaim = (claim) => !!claim?.acg_processing && !hasFixedReferralFee(claim);

/** ACG's charge on this claim, in percentage points. */
export const acgFeePercent = (claim) => {
  const stamped = num(claim?.acg_fee_percent);
  return Number.isFinite(stamped) && stamped >= 0 ? stamped : ACG_FEE_PERCENT;
};

/** Our referral fee % on this claim once ACG's charge is taken off (never below 0). */
export const referralPercentAfterAcg = (claim) =>
  Math.max(0, Math.round((num(claim?.referral_fee_repairer) - acgFeePercent(claim)) * 100) / 100);
