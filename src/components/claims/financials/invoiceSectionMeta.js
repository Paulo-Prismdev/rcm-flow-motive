/**
 * Why a step holds nothing, in the claim's own terms — so a step with no
 * invoices of that kind reads as checked and complete rather than missing.
 * Presentation only: nothing here is stored.
 */

const capitalise = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

/**
 * Why a panel holds nothing, in the claim's own terms — so an empty section
 * reads as checked and complete rather than missing.
 */
export function emptySectionMessage(section, ctx) {
  // Every job carries close-out paperwork of its own — a repaired job's final
  // invoice and authority, a total loss job's salvage invoice and confirmation — so
  // this only stands where none of them applies to the claim at all.
  if (section === 'closeout') {
    return { title: 'Nothing to close out on this job', reasons: ['No close-out paperwork applies'] };
  }

  const collect = section === 'out';
  const reasons = [];

  if (collect) {
    if (ctx.totalLoss) {
      // A total loss job's own invoice out is our share of the storage charge the
      // repairer ran up, so the repairer it went to is what it needs.
      if (!ctx.hasRepairer) reasons.push('no repairer on the job');
    } else {
      const referralApplies = !ctx.creditRepair
        && (ctx.hasReferralFee || (!ctx.privatePaying && ctx.hasRepairer));
      if (!referralApplies) {
        reasons.push(ctx.privatePaying ? 'the customer is paying privately' : 'no repairer referral fee');
      }
    }
  } else {
    if (!ctx.hasReferrer) reasons.push('no referrer');
    if (!ctx.secondReferrerEnabled) reasons.push('no second referrer');
  }

  return {
    title: collect ? 'Nothing to collect on this job' : 'Nothing to pay on this job',
    reasons: [capitalise(reasons[0] || 'nothing applies to this job'), ...reasons.slice(1)],
  };
}