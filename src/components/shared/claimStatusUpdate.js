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