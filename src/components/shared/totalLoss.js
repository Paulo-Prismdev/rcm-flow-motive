/**
 * Total loss, in one place.
 *
 * A total loss job runs the same claim flow as any other, with its own paperwork:
 * the vehicle is never handed back to the customer, so "Salvage Collected" takes
 * the place of the return date as the point its invoice pack is chased from, and
 * the Salvage Agent Invoice and Total Loss Confirmation stand where the Final
 * Insurer Invoice and Final Authority would.
 *
 * What a claim is lives in its outcome (see claimOutcome.js): a Total Loss
 * outcome runs the short total loss journey, and everything here reads that,
 * never the stage the claim has reached. So a total loss can now be closed out
 * at Claim Complete without turning back into a repair, and a potential total
 * loss that turns out repairable is a repair again the moment its outcome says so.
 *
 * `withTotalLossMarker` keeps the marking date itself, so a total loss with no
 * salvage collection date can be chased from the day the claim became one.
 */

import { getClaimOutcome, TOTAL_LOSS_OUTCOME } from './claimOutcome';

export { TOTAL_LOSS_OUTCOME as TOTAL_LOSS_STATUS, isTotalLossClaim } from './claimOutcome';

/** The claim's outcome is Total Loss. */
export const isTotalLossOutcome = (outcome) => outcome === TOTAL_LOSS_OUTCOME;

/**
 * The day the claim's outcome became Total Loss, stamped the first time it is set
 * and cleared when it leaves Total Loss again — so the date follows the outcome
 * the way the other milestone dates follow their stage (On-Site sets the on-site
 * date, Repairs Complete the completion date). Applied to the patch a status
 * change is already writing.
 */
export function withTotalLossMarker(claim, patch = {}) {
  const next = { ...claim, ...patch };
  const isTotalLoss = getClaimOutcome(next) === TOTAL_LOSS_OUTCOME;
  if (isTotalLoss) {
    if (claim?.total_loss_marked_date) return patch;
    return { ...patch, total_loss_marked_date: new Date().toISOString().split('T')[0] };
  }
  if (claim?.total_loss_marked_date) return { ...patch, total_loss_marked_date: null };
  return patch;
}