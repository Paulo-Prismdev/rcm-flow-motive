// ── Claim Status v2: three-field system ──
// 1. Client Journey Status (journey_status) — single-select, dictates timeline position.
// 2. Secondary Status (secondary_status) — single-select, dictates the group the job sits in on the table view.
// 3. Tertiary Status (tertiary_status) — single-select, extra information only.
//
// Everything here is gated behind CLAIM_STATUS_V2_ENABLED. With the flag off, the app
// continues to use the legacy single flat status list (job_status / secondary_status).
// Flip this const to true to enable the new UI and migration tool against live data.
// Rollback = flip back to false. Legacy job_status is never overwritten by the v2 logic.
// Note: secondary_status is reused from the legacy schema (it was already a single string),
// so existing values carry over naturally as the v2 group status.

export const CLAIM_STATUS_V2_ENABLED = false;

// 1. Client Journey Statuses — single-select, in display order.
// Indexes 8–10 are exception/outcome states that trigger the override banner behaviour.
export const JOURNEY_STATUSES = [
  { name: 'Awaiting BID', color: 'blue' },
  { name: 'Booked In', color: 'indigo' },
  { name: 'On Site', color: 'cyan' },
  { name: 'Awaiting Parts', color: 'amber' },
  { name: 'In Progress', color: 'blue' },
  { name: 'Repairs Complete', color: 'green' },
  { name: 'Returned to Customer', color: 'green' },
  { name: 'Cancelled', color: 'red' },          // exception
  { name: 'Potential Total Loss', color: 'orange' }, // exception
  { name: 'Total Loss', color: 'gray' },        // exception
];

// Exception statuses replace the journey timeline with a coloured banner.
export const EXCEPTION_JOURNEY_STATUSES = ['Cancelled', 'Potential Total Loss', 'Total Loss'];

export const isExceptionJourney = (status) => EXCEPTION_JOURNEY_STATUSES.includes(status);

// 2. Secondary Statuses — single-select. Determines the group the job sits in on the table view.
export const SECONDARY_STATUSES = [
  'Awaiting Private Estimate',
  'Waiting Indemnity Details',
  'Waiting Repairer Allocation',
  'Placed With Repairer',
  'Awaiting Images from Client',
  'Awaiting Recovery',
  'Placed, Awaiting Images',
  'Awaiting Claim Number',
  'Awaiting Estimate',
  'Awaiting Authority',
  'Authorised',
  'Awaiting Sup Authority',
  'Awaiting Engineer',
  'Parts Ordered',
  'Parts Delay',
  'In Repair',
  'Quality Check',
  'Completed',
  'Awaiting BLD Invoice',
  'Invoice Pending',
  'Invoiced',
];

// 3. Tertiary Statuses — single-select. Extra information only (no grouping/timeline effect).
// Edit this list freely; it is purely informational.
export const TERTIARY_STATUSES = [
  'VIP Client',
  'Complaint',
  'Escalated',
  'Awaiting Docs',
  'Supplementary Authority',
  'Total Loss Review',
  'Reinspection',
  'Warranty Work',
];

// Best-guess mapping from legacy flat status values to the new three-field structure.
// Used to pre-fill the Migration Review tool. Admins correct per-claim before applying.
// Note: "Credit Hire" is removed entirely and is intentionally not mapped.
const MAP_JOURNEY = {
  'New': 'Awaiting BID',
  'Awaiting BID': 'Awaiting BID',
  'Booked In': 'Booked In',
  'On Site': 'On Site',
  'Awaiting Parts': 'Awaiting Parts',
  'In Progress': 'In Progress',
  'In Repair': 'In Progress',
  'Repairs Complete': 'Repairs Complete',
  'Completed': 'Returned to Customer',
  'Returned to Customer': 'Returned to Customer',
  'Cancelled': 'Cancelled',
  'Potential Total Loss': 'Potential Total Loss',
  'Total Loss': 'Total Loss',
  'Write Off': 'Total Loss',
  'Total Loss Only': 'Total Loss',
};

// Legacy secondary_status values that are valid v2 group statuses carry over directly.
// Unknown legacy values fall back to null (admin picks during review).
const MAP_SECONDARY = {
  'Awaiting Private Estimate': 'Awaiting Private Estimate',
  'Waiting Indemnity Details': 'Waiting Indemnity Details',
  'Waiting Repairer Allocation': 'Waiting Repairer Allocation',
  'Placed With Repairer': 'Placed With Repairer',
  'Awaiting Images': 'Awaiting Images from Client',
  'Awaiting Recovery': 'Awaiting Recovery',
  'Placed, Awaiting Images': 'Placed, Awaiting Images',
  'Awaiting Claim Number': 'Awaiting Claim Number',
  'Awaiting Estimate': 'Awaiting Estimate',
  'Awaiting Authority': 'Awaiting Authority',
  'Authorised': 'Authorised',
  'Awaiting Sup Authority': 'Awaiting Sup Authority',
  'Awaiting Engineer': 'Awaiting Engineer',
  'Parts Ordered': 'Parts Ordered',
  'Parts Delay': 'Parts Delay',
  'Quality Check': 'Quality Check',
  'Awaiting BLD Invoice': 'Awaiting BLD Invoice',
  'Invoice Pending': 'Invoice Pending',
  'Invoiced': 'Invoiced',
};

// Returns a suggested { journey_status, secondary_status, tertiary_status } for a legacy claim.
export function suggestMapping(claim) {
  const oldPrimary = (claim?.job_status || '').trim();
  const oldSecondary = (claim?.secondary_status || '').trim();

  const journey = MAP_JOURNEY[oldPrimary] || (oldPrimary && JOURNEY_STATUSES.some(s => s.name === oldPrimary) ? oldPrimary : 'Awaiting BID');
  const secondary = MAP_SECONDARY[oldSecondary] || (oldSecondary && SECONDARY_STATUSES.includes(oldSecondary) ? oldSecondary : null);

  // If the mapped journey is an exception, the group/tertiary statuses don't apply.
  const tertiary = null;

  return {
    journey_status: isExceptionJourney(journey) ? journey : journey,
    secondary_status: isExceptionJourney(journey) ? null : secondary,
    tertiary_status: isExceptionJourney(journey) ? null : tertiary,
  };
}