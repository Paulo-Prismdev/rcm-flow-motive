import React from 'react';
import StatusBadge from './StatusBadge';
import { isExceptionJourney } from './claimStatusV2';

// Renders the v2 status badges for a claim the same way the internal Claims
// table does: exception journey badge (e.g. Cancelled / Total Loss) first,
// then the Secondary status, then the Tertiary status as a secondary badge.
export default function ClaimStatusBadges({ claim, compact }) {
  const journey = claim.journey_status || claim.job_status;
  return (
    <>
      {isExceptionJourney(journey) && <StatusBadge status={journey} compact={compact} />}
      {claim.secondary_status && <StatusBadge status={claim.secondary_status} compact={compact} />}
      {claim.tertiary_status && <StatusBadge status={claim.tertiary_status} variant="secondary" compact={compact} />}
    </>
  );
}