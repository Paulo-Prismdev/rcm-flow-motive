/**
 * Claim Outcome - the backend's read of what a claim is.
 * Mirrors src/components/shared/claimOutcome.js on the app side.
 *
 * A claim is a total loss, a repair or cancelled on its outcome alone, never on
 * the stage it has reached, so a total loss can be closed out at Claim Complete
 * without turning back into a repair.
 */

export const TOTAL_LOSS_OUTCOME = 'Total Loss';
export const CANCELLED_OUTCOME = 'Cancelled';

// Claims written before the outcome existed are read from the stage they were
// parked at, so no claim is ever left without one.
const LEGACY_OUTCOME_STAGES: Record<string, string> = {
  [CANCELLED_OUTCOME]: CANCELLED_OUTCOME,
  'Potential Total Loss': 'Potential Total Loss',
  [TOTAL_LOSS_OUTCOME]: TOTAL_LOSS_OUTCOME,
};

export function getClaimOutcome(claim: any): string {
  if (!claim) return 'Repair';
  return claim.outcome
    || LEGACY_OUTCOME_STAGES[claim.journey_status]
    || LEGACY_OUTCOME_STAGES[claim.job_status]
    || 'Repair';
}

export const isTotalLossClaim = (claim: any): boolean => getClaimOutcome(claim) === TOTAL_LOSS_OUTCOME;

export const isCancelledClaim = (claim: any): boolean => getClaimOutcome(claim) === CANCELLED_OUTCOME;