import { getClaimOutcome } from './claimOutcome';

// The claim journey in the client's own words: the stages a customer would
// recognise, worked out from the internal journey status (and, for "In repair",
// whether the repair has been authorised or the internal status says so).
// Used by the phone claim header now, and by the client tracking link later.

export const REPAIR_STAGES = [
  'Claim received',
  'Repairer booked',
  'With repairer',
  'In repair',
  'Repair complete',
  'Back with client',
  'Claim closed',
];

export const TOTAL_LOSS_STAGES = [
  'Claim received',
  'Total loss confirmed',
  'Salvage collected',
  'Claim closed',
];

// Returns { stages, index, label, held, rectification, exception }.
// `exception` is set (and index is -1) for a cancelled claim.
export function clientJourney(claim) {
  const outcome = getClaimOutcome(claim);
  const journey = claim?.journey_status || claim?.job_status || '';

  if (outcome === 'Cancelled') {
    return { stages: [], index: -1, label: 'Cancelled', held: null, rectification: false, exception: 'Cancelled' };
  }

  if (outcome === 'Total Loss') {
    let index = 1;
    if (journey === 'Claim Complete' || claim?.claim_complete_date) index = 3;
    else if (journey === 'Salvage Collected' || claim?.salvage_collected_date) index = 2;
    return { stages: TOTAL_LOSS_STAGES, index, label: TOTAL_LOSS_STAGES[index], held: null, rectification: false, exception: null };
  }

  let index = 0;
  let held = null;
  let rectification = false;
  switch (journey) {
    case 'Booked In': index = 1; break;
    case 'On-Site':
      index = (claim?.authority_received || claim?.secondary_status === 'In Repair') ? 3 : 2;
      break;
    case 'Awaiting Parts': index = 3; held = 'Waiting for parts'; break;
    case 'Repairs Complete': index = 4; break;
    case 'Returned to Customer': index = 5; break;
    case 'Rectification': index = 3; rectification = true; break;
    case 'Claim Complete': index = 6; break;
    default: index = 0;
  }

  let label = REPAIR_STAGES[index];
  if (rectification) label = 'Back in for rectification';
  else if (held) label = `In repair · ${held.toLowerCase()}`;

  return { stages: REPAIR_STAGES, index, label, held, rectification, exception: null };
}
