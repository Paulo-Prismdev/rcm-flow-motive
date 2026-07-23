// ── Claim Status v2: two-field system (Client Journey Status + Secondary Statuses) ──
// Everything here is gated behind CLAIM_STATUS_V2_ENABLED. With the flag off, the app
// continues to use the legacy single flat status list (job_status / secondary_status).
// Flip this const to true to enable the new UI and migration tool against live data.
// Rollback = flip back to false. Old fields are never overwritten by the v2 logic.

export const CLAIM_STATUS_V2_ENABLED = false;

// Client Journey Statuses — single-select, in display order.
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

// Secondary Statuses — multi-select, internal detail.
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

// Best-guess mapping from legacy flat status values to the new two-field structure.
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

const MAP_SECONDARY = {
  'Awaiting Private Estimate': ['Awaiting Private Estimate'],
  'Waiting Indemnity Details': ['Waiting Indemnity Details'],
  'Waiting Repairer Allocation': ['Waiting Repairer Allocation'],
  'Placed With Repairer': ['Placed With Repairer'],
  'Awaiting Images': ['Awaiting Images from Client'],
  'Awaiting Recovery': ['Awaiting Recovery'],
  'Placed, Awaiting Images': ['Placed, Awaiting Images'],
  'Awaiting Claim Number': ['Awaiting Claim Number'],
  'Awaiting Estimate': ['Awaiting Estimate'],
  'Awaiting Authority': ['Awaiting Authority'],
  'Authorised': ['Authorised'],
  'Awaiting Sup Authority': ['Awaiting Sup Authority'],
  'Awaiting Engineer': ['Awaiting Engineer'],
  'Parts Ordered': ['Parts Ordered'],
  'Parts Delay': ['Parts Delay'],
  'Quality Check': ['Quality Check'],
  'Awaiting BLD Invoice': ['Awaiting BLD Invoice'],
  'Invoice Pending': ['Invoice Pending'],
  'Invoiced': ['Invoiced'],
  'Awaiting Parts': ['Parts Delay'],
  'In Progress': ['In Repair'],
  'In Repair': ['In Repair'],
  'Completed': ['Completed'],
};

// Returns a suggested { journey_status, secondary_statuses } for a legacy claim.
export function suggestMapping(claim) {
  const oldPrimary = (claim?.job_status || '').trim();
  const oldSecondary = (claim?.secondary_status || '').trim();

  const journey = MAP_JOURNEY[oldPrimary] || (oldPrimary && JOURNEY_STATUSES.some(s => s.name === oldPrimary) ? oldPrimary : 'Awaiting BID');
  let secondary = MAP_SECONDARY[oldSecondary] || (oldSecondary && SECONDARY_STATUSES.includes(oldSecondary) ? [oldSecondary] : []);

  // If the mapped journey is an exception, secondary statuses don't apply.
  if (isExceptionJourney(journey)) secondary = [];

  return { journey_status: journey, secondary_statuses: secondary };
}