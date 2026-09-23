import React from 'react';
import StatusBadge from './StatusBadge';
import { isExceptionJourney } from './claimStatusV2';

// Renders the v2 status badges for a claim the same way the internal Claims
// table does: exception journey badge (e.g. Cancelled / Total Loss) first,
// then the Secondary status, then the Tertiary status as a secondary badge.
export default function ClaimStatusBadges({ claim, compact, journeyOnly }) {
  const journey = claim.journey_status || claim.job_status;
  if (journeyOnly) {
    return journey ? <StatusBadge status={journey} compact={compact} /> : null;
  }
  return (
    <>
      {isExceptionJourney(journey) && <StatusBadge status={journey} compact={compact} />}
      {claim.secondary_status && <StatusBadge status={claim.secondary_status} compact={compact} />}
      {claim.tertiary_status && <StatusBadge status={claim.tertiary_status} variant="secondary" compact={compact} />}
    </>
  );
}