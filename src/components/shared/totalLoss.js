/**
 * Total loss, in one place.
 *
 * A total loss job runs the same claim flow as any other, with its own paperwork:
 * the vehicle is never handed back to the customer, so "Salvage Collected" takes
 * the place of the return date as the point its invoice pack is chased from, and
 * the Salvage Agent Invoice and Total Loss Confirmation stand where the Final
 * Insurer Invoice and Final Authority would.
 *
 * A claim reads as a total loss from its current status alone — the journey status
 * (the v2 single-select), or the legacy job status it is kept in step with. The
 * total loss dates record when it happened; they never decide what it is. So a job
 * that comes off Total Loss, a potential total loss that turns out repairable for
 * instance, is back on the normal flow straight away, whatever dates it carries.
 *
 * `withTotalLossMarker` keeps the marking date itself, so a total loss with no
 * salvage collection date can be chased from the day the claim became one.
 */

export const TOTAL_LOSS_STATUS = 'Total Loss';

/** Whether this claim is a total loss job — decided by its current status. */
export const isTotalLossClaim = (claim) =>
  claim?.journey_status === TOTAL_LOSS_STATUS
  || claim?.job_status === TOTAL_LOSS_STATUS;

/**
 * The day the claim was marked Total Loss, stamped the first time it is marked and
 * cleared when it comes off Total Loss again — so the date follows the status the
 * way the other milestone dates do (On-Site sets the on-site date, Repairs
 * Complete the completion date). Applied to the patch a status change is already
 * writing.
 */
export function withTotalLossMarker(claim, patch = {}) {
  const next = { ...claim, ...patch };
  if (isTotalLossClaim(next)) {
    if (claim?.total_loss_marked_date) return patch;
    return { ...patch, total_loss_marked_date: new Date().toISOString().split('T')[0] };
  }
  if (claim?.total_loss_marked_date) return { ...patch, total_loss_marked_date: null };
  return patch;
}