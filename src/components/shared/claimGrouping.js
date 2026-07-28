// Shared v2 claim grouping logic — mirrors the internal Claims page so the
// external portals (Referrer / Client / Repairer) group and badge claims the
// same way: Secondary status drives the group, with dedicated "On Site" and
// "Cancelled" groups, and exception journey statuses shown as badges.

import { SECONDARY_STATUSES, getJourneyColor } from './claimStatusV2';

const STATUS_COLORS = {
  blue: '#3b82f6', green: '#22c55e', orange: '#f97316',
  red: '#ef4444', purple: '#a855f7', yellow: '#eab308',
  gray: '#6b7280', cyan: '#06b6d4', indigo: '#6366f1', amber: '#f59e0b',
};

// An "On Site" group pulls in any claim whose journey status is "On Site"
// (or that has an on_site_date with no hand_over_date); everything else
// groups by its Secondary status. Cancelled journeys get their own group.
export function getGroupKey(c) {
  const journey = c.journey_status || c.job_status;
  if (journey === 'Cancelled') return 'Cancelled';
  if (c.on_site_date && !c.hand_over_date) return 'On Site';
  return c.secondary_status || 'New';
}

// Ordered list of group headers — Secondary statuses with "On Site" inserted
// before "In Repair", and "Cancelled" appended at the end.
export const GROUP_STATUSES = (() => {
  const idx = SECONDARY_STATUSES.indexOf('In Repair');
  const at = idx === -1 ? SECONDARY_STATUSES.length : idx;
  return [
    ...SECONDARY_STATUSES.slice(0, at),
    'On Site',
    ...SECONDARY_STATUSES.slice(at),
    'Cancelled',
  ];
})();

// Dot colour for a group header. statusConfigs is the ClaimStatusConfig list
// (optional) — used to resolve per-status colours, falling back to journey
// colours then gray.
export function getStatusDot(statusName, statusConfigs) {
  if (statusName === 'On Site') return STATUS_COLORS.cyan;
  if (statusName === 'Cancelled') return STATUS_COLORS.red;
  const cfg = statusConfigs?.find((s) => s.status_name === statusName);
  return STATUS_COLORS[cfg?.color] || STATUS_COLORS[getJourneyColor(statusName)] || '#6b7280';
}