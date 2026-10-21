import React from 'react';
import StatusBadge from './StatusBadge';
import { getClaimOutcome, isExceptionOutcome } from './claimOutcome';

// Renders the v2 status badges for a claim.
//
// Internal: the outcome badge (Cancelled / Total Loss, when it isn't a repair),
// then the main internal status, then the additional one.
//
// journeyOnly (client and referrer portals): the journey stage and the outcome,
// and never the internal statuses, which are ours alone.
export default function ClaimStatusBadges({ claim, compact, journeyOnly }) {
  const journey = claim.journey_status || claim.job_status;
  const outcome = getClaimOutcome(claim);

  if (journeyOnly) {
    return (
      <>
        {isExceptionOutcome(outcome) && <StatusBadge status={outcome} compact={compact} />}
        {/* A legacy claim may still hold the outcome in its stage field - never
            show the same word twice. */}
        {journey && journey !== outcome && <StatusBadge status={journey} compact={compact} />}
      </>
    );
  }
  return (
    <>
      {isExceptionOutcome(outcome) && <StatusBadge status={outcome} compact={compact} />}
      {claim.secondary_status && <StatusBadge status={claim.secondary_status} compact={compact} />}
      {claim.tertiary_status && <StatusBadge status={claim.tertiary_status} variant="secondary" compact={compact} />}
    </>
  );
}