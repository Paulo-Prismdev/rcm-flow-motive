// ── Claim Status v2: three fields, plus the outcome ──
// 1. Claim Outcome (outcome) — single-select: Repair, Potential Total Loss, Total
//    Loss or Cancelled. What the claim IS, and the only thing that decides which
//    journey it runs. See claimOutcome.js.
// 2. Client Journey Status (journey_status) — single-select, dictates timeline
//    position. The STAGE the claim has reached, never an outcome.
// 3. Main internal status (secondary_status) — single-select, dictates the group
//    the job sits in on the table view. Internal only.
// 4. Additional internal status (tertiary_status) — single-select, extra
//    information only (no grouping/timeline effect). Internal only.
//
// Everything here is gated behind CLAIM_STATUS_V2_ENABLED. With the flag off, the app
// continues to use the legacy single flat status list (job_status / secondary_status).
// Flip this const to true to enable the new UI and migration tool against live data.
// Rollback = flip back to false. Legacy job_status is never overwritten by the v2 logic.
// Note: secondary_status is reused from the legacy schema (it was already a single string),
// so existing values carry over naturally as the v2 group status.

export const CLAIM_STATUS_V2_ENABLED = false;

// 1a. The repair journey — the stages a repair passes through, in display order.
export const REPAIR_JOURNEY_STATUSES = [
  { name: 'Awaiting BID', color: 'blue', description: 'Received, waiting to be booked in with a repairer.' },
  { name: 'Booked In', color: 'indigo', description: 'A booking date is agreed with the repairer.' },
  { name: 'On-Site', color: 'cyan', description: 'The vehicle is with the repairer.' },
  { name: 'Awaiting Parts', color: 'amber', description: 'On site, held up waiting for parts.' },
  { name: 'Repairs Complete', color: 'green', description: 'The work is finished and the vehicle is ready to go back.' },
  { name: 'Returned to Customer', color: 'green', description: 'The vehicle is back with the customer.' },
  { name: 'Rectification', color: 'orange', description: 'Back in for rectification work on the original repair.' },
  { name: 'Claim Complete', color: 'green', description: 'Everything closed out: paperwork and invoicing done.' },
];

// 1b. The total loss journey — its own short run, never the repair stages.
export const TOTAL_LOSS_JOURNEY_STATUSES = [
  { name: 'Total Loss', color: 'gray', description: 'Write-off confirmed, with the salvage still to be collected.' },
  { name: 'Salvage Collected', color: 'purple', description: 'The salvage has been taken away. This is the day the job goes on the invoicing radar.' },
  { name: 'Claim Complete', color: 'green', description: 'Everything closed out: salvage paperwork and invoicing done.' },
];

// Every journey stage, either journey. Use journeyStatusesForOutcome when the
// list depends on what the claim is.
export const JOURNEY_STATUSES = [...REPAIR_JOURNEY_STATUSES, ...TOTAL_LOSS_JOURNEY_STATUSES];

/** The stages available for an outcome: the total loss run, or the repair run. */
export const journeyStatusesForOutcome = (outcome) =>
  (outcome === 'Total Loss' ? TOTAL_LOSS_JOURNEY_STATUSES : REPAIR_JOURNEY_STATUSES);

export const journeyStatusNamesForOutcome = (outcome) =>
  journeyStatusesForOutcome(outcome).map((s) => s.name);

const JOURNEY_BY_NAME = Object.fromEntries(JOURNEY_STATUSES.map((s) => [s.name, s]));

/** The one-line meaning of a journey stage, for the picker and the tooltips. */
export const getJourneyDescription = (name) => JOURNEY_BY_NAME[name]?.description || '';

// Colour lookup for journey statuses (reused by StatusBadge / table dots).
export const JOURNEY_COLOR_MAP = Object.fromEntries(JOURNEY_STATUSES.map((s) => [s.name, s.color]));
export const getJourneyColor = (name) => JOURNEY_COLOR_MAP[name];

// ── Next step ──
// The logical next stage from wherever the claim is. Where the job genuinely
// branches (a repair may need parts or may finish, a returned vehicle may need
// rectification) both readings are offered, primary one first.
const REPAIR_NEXT_STEPS = {
  'Awaiting BID': ['Booked In'],
  'Booked In': ['On-Site'],
  'On-Site': ['Awaiting Parts', 'Repairs Complete'],
  'Awaiting Parts': ['Repairs Complete'],
  'Repairs Complete': ['Returned to Customer'],
  'Returned to Customer': ['Claim Complete', 'Rectification'],
  'Rectification': ['Claim Complete'],
};

const TOTAL_LOSS_NEXT_STEPS = {
  'Total Loss': ['Salvage Collected'],
  'Salvage Collected': ['Claim Complete'],
};

/**
 * The stage(s) that logically follow the claim's current stage. Empty when the
 * journey has nowhere left to go (Claim Complete), or when the claim is
 * cancelled — there is no next step from a cancelled job.
 */
export function nextJourneySteps(journey, outcome) {
  if (outcome === 'Cancelled') return [];
  const steps = outcome === 'Total Loss' ? TOTAL_LOSS_NEXT_STEPS : REPAIR_NEXT_STEPS;
  if (!journey) {
    // Nothing recorded yet: offer the first stage of the claim's own journey.
    const first = journeyStatusesForOutcome(outcome)[0];
    return first ? [first.name] : [];
  }
  return steps[journey] || [];
}

// ── Internal statuses ──
// Main internal status (secondary_status) — single-select. Determines the group
// the job sits in on the table view.
export const SECONDARY_STATUSES = [
  'New',
  'Awaiting Private Estimate',
  'Waiting Indemnity Details',
  'Waiting Repairer Allocation',
  'Placed With Repairer',
  'Booked In',
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
  'File Complete',
];

// Additional internal status (tertiary_status) — single-select. Extra information
// only. Uses the same option set as the main internal status so any of them can
// also be flagged as extra information.
export const TERTIARY_STATUSES = [...SECONDARY_STATUSES];

// One-line meaning of each internal status, used as the fallback when a status
// carries no description of its own in Settings → Status Management.
export const INTERNAL_STATUS_DESCRIPTIONS = {
  'New': 'Just received, nothing started yet.',
  'Awaiting Private Estimate': 'Waiting on the customer’s own estimate before we can move.',
  'Waiting Indemnity Details': 'Waiting on the customer to complete the indemnity form.',
  'Waiting Repairer Allocation': 'An approved repairer still has to be chosen.',
  'Placed With Repairer': 'Allocated to a repairer, booking not agreed yet.',
  'Booked In': 'A booking date is agreed with the repairer.',
  'Awaiting Images from Client': 'Waiting on photos from the customer before we can value the damage.',
  'Awaiting Recovery': 'Waiting for the vehicle to be recovered.',
  'Placed, Awaiting Images': 'Allocated to a repairer and still waiting on images.',
  'Awaiting Claim Number': 'Waiting on the insurer to issue the claim number.',
  'Awaiting Estimate': 'Waiting on the repairer’s estimate.',
  'Awaiting Authority': 'Estimate issued, waiting on authorisation to repair.',
  'Authorised': 'Authorised to repair, work not started yet.',
  'Awaiting Sup Authority': 'Supplementary work is waiting on authorisation.',
  'Awaiting Engineer': 'Waiting on an engineer to inspect the vehicle.',
  'Parts Ordered': 'Parts ordered, delivery awaited.',
  'Parts Delay': 'Parts are delayed — the repair is held up.',
  'In Repair': 'Actively being repaired.',
  'Quality Check': 'Work finished and being checked before hand-over.',
  'Completed': 'Repair finished and signed off.',
  'Awaiting BLD Invoice': 'Waiting on the repairer’s invoice to us.',
  'Invoice Pending': 'Invoice received and going through.',
  'Invoiced': 'Invoiced out.',
  'File Complete': 'Everything on the file is finished.',
};

export const getInternalStatusDescription = (name) => INTERNAL_STATUS_DESCRIPTIONS[name] || '';

// Internal statuses that read naturally at each journey stage, offered first in
// the pickers so a new user is guided without being restricted — every status
// stays available below. Matched against the configured list, so a status that
// no longer exists is simply skipped.
const INTERNAL_STATUSES_BY_STAGE = {
  'Awaiting BID': ['New', 'Awaiting Private Estimate', 'Waiting Indemnity Details', 'Awaiting Claim Number', 'Waiting Repairer Allocation', 'Awaiting Recovery'],
  'Booked In': ['Placed With Repairer', 'Booked In', 'Awaiting Images from Client', 'Placed, Awaiting Images', 'Awaiting Claim Number'],
  'On-Site': ['In Repair', 'Awaiting Estimate', 'Awaiting Authority', 'Authorised', 'Awaiting Sup Authority', 'Awaiting Engineer', 'Parts Ordered', 'Parts Delay'],
  'Awaiting Parts': ['Parts Ordered', 'Parts Delay', 'Awaiting Authority', 'Awaiting Sup Authority', 'Awaiting Engineer'],
  'Repairs Complete': ['Quality Check', 'Completed', 'Awaiting BLD Invoice'],
  'Returned to Customer': ['Awaiting BLD Invoice', 'Invoice Pending', 'Invoiced', 'File Complete', 'Completed'],
  'Rectification': ['In Repair', 'Quality Check', 'Completed', 'Awaiting Authority'],
  'Claim Complete': ['File Complete', 'Invoiced'],
  'Total Loss': ['Awaiting Authority', 'Waiting Repairer Allocation', 'Invoice Pending', 'Awaiting BLD Invoice'],
  'Salvage Collected': ['Awaiting BLD Invoice', 'Invoice Pending', 'Invoiced', 'File Complete'],
};

/** Internal statuses worth offering first at this journey stage. */
export const suggestedInternalStatuses = (journey) => INTERNAL_STATUSES_BY_STAGE[journey] || [];

// ── Legacy journey values ──
// The three outcomes used to be journey values. They are migration relics now:
// kept so the migration tool and any record written before the split still read.
export const EXCEPTION_JOURNEY_STATUSES = ['Cancelled', 'Potential Total Loss', 'Total Loss'];

export const isExceptionJourney = (status) => EXCEPTION_JOURNEY_STATUSES.includes(status);

// Best-guess mapping from legacy flat status values to the new structure.
// Used to pre-fill the Migration Review tool. Admins correct per-claim before applying.
// Note: "Credit Hire" is removed entirely and is intentionally not mapped.
const MAP_JOURNEY = {
  'New': 'Awaiting BID',
  'Awaiting BID': 'Awaiting BID',
  'Booked In': 'Booked In',
  'On Site': 'On-Site',
  'On-Site': 'On-Site',
  'Awaiting Parts': 'Awaiting Parts',
  'In Progress': 'On-Site',
  'In Repair': 'On-Site',
  'Repairs Complete': 'Repairs Complete',
  'Completed': 'Returned to Customer',
  'Returned to Customer': 'Returned to Customer',
};

// Legacy outcome-ish values, now carried by the outcome field instead.
const MAP_OUTCOME = {
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

// Returns a suggested { outcome, journey_status, secondary_status, tertiary_status }
// for a legacy claim.
export function suggestMapping(claim) {
  const oldPrimary = (claim?.job_status || '').trim();
  const oldSecondary = (claim?.secondary_status || '').trim();

  const outcome = MAP_OUTCOME[oldPrimary] || claim?.outcome || 'Repair';
  const journey = MAP_JOURNEY[oldPrimary] || (oldPrimary && JOURNEY_STATUSES.some(s => s.name === oldPrimary) ? oldPrimary : null);
  let secondary = MAP_SECONDARY[oldSecondary] || (oldSecondary && SECONDARY_STATUSES.includes(oldSecondary) ? oldSecondary : null);
  // Legacy "In Repair" / "In Progress" primary statuses now map to journey
  // "On-Site" — carry the in-repair stage into the internal status.
  if (journey === 'On-Site' && !secondary && ['In Repair', 'In Progress'].includes(oldPrimary)) {
    secondary = 'In Repair';
  }
  // A cancellation or write-off leaves the stage unknown, so it is not invented.
  const resolvedJourney = outcome === 'Cancelled'
    ? (journey || null)
    : (outcome === 'Total Loss' ? 'Total Loss' : journey);

  return {
    outcome,
    journey_status: resolvedJourney,
    secondary_status: secondary,
    tertiary_status: null,
  };
}