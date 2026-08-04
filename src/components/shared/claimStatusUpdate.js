import { EXCEPTION_JOURNEY_STATUSES } from './claimStatusV2';

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
  if (claim.job_status === 'Cancelled') return true;
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
export function buildStatusChangeClaimUpdate(claim, { journey, secondary, tertiary }, updateType) {
  const updateData = {};
  if (updateType !== 'Status Change') return updateData;

  const now = new Date();
  const effectiveJourney = journey || claim?.journey_status;
  const closed = isUpdateTrackingClosed({ job_status: effectiveJourney, invoice_status: claim?.invoice_status });

  if (effectiveJourney) {
    updateData.journey_status = effectiveJourney;
    updateData.job_status = effectiveJourney; // backward compat for legacy readers
  }
  updateData.secondary_status = secondary || null;
  updateData.tertiary_status = tertiary || null;

  if (!closed) {
    updateData.last_updated_at = now.toISOString();
    updateData.next_update_due_at = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    updateData.update_status_flag = 'Green';
  } else {
    updateData.update_status_flag = 'Gray';
  }
  return updateData;
}