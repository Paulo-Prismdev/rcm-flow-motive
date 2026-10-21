/**
 * Claim Outcome, in one place.
 *
 * The journey status says how far along a claim is; the outcome says what it is.
 * They were mixed together before, which is why a total loss could never reach
 * Claim Complete without dropping back into the repair flow. Now:
 *
 *   - Repair (the default) runs the normal journey through to Claim Complete.
 *   - Total Loss runs its own short journey: Total Loss -> Salvage Collected ->
 *     Claim Complete, with the salvage paperwork in place of the repair invoices.
 *   - Potential Total Loss is still a repair, with the write-off decision open.
 *   - Cancelled stops the journey where it is.
 *
 * Everything that asks "is this a total loss?" - the invoicing flow, the chaser
 * rules, the closed-claim filters, the exception banner - reads the outcome,
 * never a stage.
 */

export const REPAIR_OUTCOME = 'Repair';
export const POTENTIAL_TOTAL_LOSS_OUTCOME = 'Potential Total Loss';
export const TOTAL_LOSS_OUTCOME = 'Total Loss';
export const CANCELLED_OUTCOME = 'Cancelled';

// Single-select options, in the order they are offered. `description` is the
// one-line meaning shown beside the picker.
export const OUTCOMES = [
  {
    value: REPAIR_OUTCOME,
    color: 'blue',
    description: 'The vehicle is being repaired: the claim follows the normal journey through to Claim Complete.',
  },
  {
    value: POTENTIAL_TOTAL_LOSS_OUTCOME,
    color: 'orange',
    description: 'May be written off - a repair for now, while the decision is still open.',
  },
  {
    value: TOTAL_LOSS_OUTCOME,
    color: 'gray',
    description: 'A write-off: its own journey (Total Loss, then Salvage Collected, then Claim Complete), with the salvage paperwork in place of the repair invoices.',
  },
  {
    value: CANCELLED_OUTCOME,
    color: 'red',
    description: 'The job was cancelled - the journey stops at the stage it had reached.',
  },
];

const OUTCOME_COLOR_MAP = Object.fromEntries(OUTCOMES.map((o) => [o.value, o.color]));

export const getOutcomeColor = (name) => OUTCOME_COLOR_MAP[name];

export function getOutcomeDescription(name) {
  return OUTCOMES.find((o) => o.value === name)?.description || '';
}

export function getOutcomeLabel(name) {
  return OUTCOMES.find((o) => o.value === name)?.value || name || '';
}

// A claim written before the outcome existed is read from the stage it was parked
// at, so no claim is ever left without one.
const LEGACY_OUTCOME_STAGES = {
  [CANCELLED_OUTCOME]: CANCELLED_OUTCOME,
  [POTENTIAL_TOTAL_LOSS_OUTCOME]: POTENTIAL_TOTAL_LOSS_OUTCOME,
  [TOTAL_LOSS_OUTCOME]: TOTAL_LOSS_OUTCOME,
};

/** The claim's outcome - what it is, never where it has got to. */
export const getClaimOutcome = (claim) =>
  claim?.outcome
  || LEGACY_OUTCOME_STAGES[claim?.journey_status]
  || LEGACY_OUTCOME_STAGES[claim?.job_status]
  || REPAIR_OUTCOME;

/** Whether the claim is off the normal repair journey - cancelled, or a write-off. */
export const isExceptionOutcome = (outcome) => !!outcome && outcome !== REPAIR_OUTCOME;

export const isTotalLossClaim = (claim) => getClaimOutcome(claim) === TOTAL_LOSS_OUTCOME;
export const isPotentialTotalLossClaim = (claim) => getClaimOutcome(claim) === POTENTIAL_TOTAL_LOSS_OUTCOME;
export const isCancelledClaim = (claim) => getClaimOutcome(claim) === CANCELLED_OUTCOME;

const isClosedStage = (claim) => ['Claim Complete', 'Completed'].includes(claim?.journey_status || claim?.job_status);

/** Whether the claim is finished: cancelled, or closed out at Claim Complete. */
export const isClaimClosed = (claim) => isCancelledClaim(claim) || isClosedStage(claim);

/**
 * The same question as the lists have always asked - "is this job still one we
 * work on?" - with a total loss counted as finished alongside a cancelled claim,
 * because a written-off vehicle is never repaired. Kept apart from isClaimClosed
 * so the lists keep behaving exactly as they did.
 */
export const isClaimClosedForLists = (claim) => isClaimClosed(claim) || isTotalLossClaim(claim);