import { EXCEPTION_JOURNEY_STATUSES, journeyStatusNamesForOutcome } from './claimStatusV2';
import { getClaimOutcome, isCancelledClaim } from './claimOutcome';
import { withTotalLossMarker } from './totalLoss';

// Outcome / closed statuses — journey values that stop the 48hr update timer.
// 'Returned to Customer' is the v2 equivalent of the legacy 'Completed'.
export const CLOSED_STATUSES = ['Completed', 'Cancelled', 'Total Loss', 'Returned to Customer'];

export function isClosedJourney(journey) {
  if (!journey) return false;
  return CLOSED_STATUSES.includes(journey) || EXCEPTION_JOURNEY_STATUSES.includes(journey);
}

// 48-hour update tracking is only "closed" once the claim has been invoiced
// (invoice_status 'Invoiced' or 'Invoice Paid') or cancelled. Total Loss and
// Completed/Returned repairs are NOT closed — they still require update
// tracking until invoiced.
export function isUpdateTrackingClosed(claim) {
  if (!claim) return false;
  if (isCancelledClaim(claim)) return true;
  // Rectification journey: tracking stays active until the vehicle is handed
  // back after rectification work (rectification_hand_over_date set).
  if ((claim.journey_status === 'Rectification' || claim.job_status === 'Rectification') && claim.rectification_hand_over_date) return true;
  return ['Invoiced', 'Invoice Paid'].includes(claim.invoice_status);
}

// Dynamically compute the update_status_flag from timestamps so the badge
// never shows "On Track" when the 48-hour window has actually expired.
// The stored update_status_flag field can go stale because there is no
// backend decay job for it (unlike client_comm_status_flag).
export function computeUpdateStatusFlag(claim) {
  if (!claim) return null;

  // Snoozed — override active and not yet expired
  if (claim.override_active) {
    const expiry = claim.override_expiry_at ? new Date(claim.override_expiry_at) : null;
    if (!expiry || expiry > new Date()) return 'Blue';
    // Override expired — fall through to time-based calculation
  }

  if (isUpdateTrackingClosed(claim)) return 'Gray';

  const nextDue = claim.next_update_due_at ? new Date(claim.next_update_due_at) : null;
  if (!nextDue) return claim.update_status_flag || null;

  const hoursRemaining = (nextDue.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursRemaining <= 0) return 'Red';
  if (hoursRemaining <= 12) return 'Amber';
  return 'Green';
}

// Dynamically compute the client_comm_status_flag from timestamps so the badge
// never shows "On Track" when the 48-hour client comm window has expired.
// Mirrors computeUpdateStatusFlag but uses client_comm fields.
export function computeClientCommStatusFlag(claim) {
  if (!claim) return null;

  // Snoozed — client comm override active and not yet expired
  if (claim.client_comm_override_active) {
    const expiry = claim.client_comm_override_expiry_at ? new Date(claim.client_comm_override_expiry_at) : null;
    if (!expiry || expiry > new Date()) return 'Blue';
    // Override expired — fall through to time-based calculation
  }

  // Rectification: once the vehicle is handed back after rectification work,
  // client communication tracking is complete.
  if ((claim.journey_status === 'Rectification' || claim.job_status === 'Rectification') && claim.rectification_hand_over_date) return 'Complete';

  // Once the vehicle has been handed back to the customer, client 48h
  // communication tracking is complete — show "Complete" (Blue) regardless of timers.
  if (claim.hand_over_date) return 'Complete';

  if (isUpdateTrackingClosed(claim)) return 'Gray';

  const nextDue = claim.next_client_comm_due_at ? new Date(claim.next_client_comm_due_at) : null;
  if (!nextDue) return claim.client_comm_status_flag || null;

  const hoursRemaining = (nextDue.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursRemaining <= 0) return 'Red';
  if (hoursRemaining <= 12) return 'Amber';
  return 'Green';
}

// Build the claim-field payload written for an explicit Status Change update.
// journey / secondary / tertiary are the v2 single-select values from the form.
// job_status is kept in sync with journey so legacy readers (closed detection,
// existing reports) keep working during the v2 transition.
export function buildStatusChangeClaimUpdate(claim, { outcome, journey, secondary, tertiary, on_site_date, hand_over_date, completion_date, claim_complete_date, salvage_collected_date, rectification_booking_in_date, rectification_completion_date, rectification_hand_over_date }, updateType) {
  const updateData = {};
  if (updateType !== 'Status Change') return updateData;

  const nextOutcome = outcome || getClaimOutcome(claim);
  const today = new Date().toISOString().split('T')[0];

  // The outcome decides which journey the claim is on, so a stage from the other
  // journey is never left behind: a write-off starts at Total Loss, and a claim
  // switched back to a repair drops its salvage stage rather than keeping a stage
  // its journey no longer has (the stage is cleared for the user to set again).
  const stages = journeyStatusNamesForOutcome(nextOutcome);
  let effectiveJourney = journey || claim?.journey_status || claim?.job_status;
  if (nextOutcome === 'Total Loss') {
    if (!stages.includes(effectiveJourney)) effectiveJourney = 'Total Loss';
  } else if (!stages.includes(effectiveJourney)) {
    effectiveJourney = null;
  }

  updateData.outcome = nextOutcome;
  if (effectiveJourney) {
    updateData.journey_status = effectiveJourney;
    updateData.job_status = effectiveJourney; // backward compat for legacy readers
  } else if (claim?.journey_status || claim?.job_status) {
    // The stage the claim held belongs to the other journey — clear it.
    updateData.journey_status = null;
    updateData.job_status = null;
  }
  updateData.secondary_status = secondary || null;
  updateData.tertiary_status = tertiary || null;

  // On-Site is driven by the journey status (single source of truth). Entering
  // "On-Site" sets the on-site date (clearing any prior hand-over — the vehicle
  // is back on site). "Repairs Complete" sets the completion date; "Returned to
  // Customer" sets the hand-over date. Each milestone only writes its own date.
  if (effectiveJourney === 'On-Site') {
    updateData.on_site_date = on_site_date || claim?.on_site_date || today;
    updateData.hand_over_date = null;
  }
  if (effectiveJourney === 'Repairs Complete') {
    updateData.completion_date = completion_date || claim?.completion_date || today;
  }
  // Salvage Collected is the total loss journey's own date milestone, the way
  // On-Site and Repairs Complete are the repair journey's.
  if (effectiveJourney === 'Salvage Collected') {
    updateData.salvage_collected_date = salvage_collected_date || claim?.salvage_collected_date || today;
  }
  if (effectiveJourney === 'Returned to Customer') {
    updateData.hand_over_date = hand_over_date || claim?.hand_over_date || today;
  }
  if (effectiveJourney === 'Claim Complete') {
    updateData.claim_complete_date = claim_complete_date || claim?.claim_complete_date || today;
  }
  // Rectification milestone dates are managed in the Key Dates section of the
  // claim record (greyed out until the Rectification journey is applied), so a
  // status change to Rectification does not write any dates here. The 48hr
  // update & client communication timers are reactivated (the job is back in),
  // and stay active until a rectification_hand_over_date is entered — handled
  // by isUpdateTrackingClosed / computeClientCommStatusFlag.
  if (effectiveJourney === 'Rectification') {
    updateData.on_site_date = null;
    updateData.hand_over_date = null;
    updateData.completion_date = null;
    updateData.claim_complete_date = null;
    const nowMs = Date.now();
    const due = new Date(nowMs + 48 * 60 * 60 * 1000).toISOString();
    updateData.last_updated_at = new Date(nowMs).toISOString();
    updateData.next_update_due_at = due;
    updateData.update_status_flag = 'Green';
    updateData.last_client_comm_at = new Date(nowMs).toISOString();
    updateData.next_client_comm_due_at = due;
    updateData.client_comm_status_flag = 'Green';
  }

  // Note: the general 48hr update timer is no longer reset by a status change.
  // It only resets when an Incoming update is logged (any type) — see
  // handleClaimUpdateCreated / handleUpdateCreated in the update UI.
  // Setting the outcome to Total Loss stamps the day that happened (and leaving
  // Total Loss clears it again), so a salvage collection date that is still
  // missing can be chased from the job's own marker.
  return withTotalLossMarker(claim, updateData);
}