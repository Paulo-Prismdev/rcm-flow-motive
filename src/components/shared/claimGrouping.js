// Shared v2 claim grouping logic — mirrors the internal Claims page so the
// external portals (Referrer / Client / Repairer) group and badge claims the
// same way: Secondary status drives the group, with dedicated "On Site" and
// "Cancelled" groups, and exception journey statuses shown as badges.

import { SECONDARY_STATUSES, getJourneyColor, isExceptionJourney } from './claimStatusV2';

const STATUS_COLORS = {
  blue: '#3b82f6', green: '#22c55e', orange: '#f97316',
  red: '#ef4444', purple: '#a855f7', yellow: '#eab308',
  gray: '#6b7280', cyan: '#06b6d4', indigo: '#6366f1', amber: '#f59e0b',
};

// Journey status drives the group when set; claims without a journey status
// fall back to their Secondary status. "On Site" (via the on_site_date marker)
// and "Cancelled" are special-cased as before.
export function getGroupKey(c) {
  if (c.secondary_status === 'New') return 'New';
  const journey = c.journey_status || c.job_status;
  if (journey === 'Cancelled') return 'Cancelled';
  // On-site check takes priority: if the vehicle has been marked on site and
  // not yet handed over, it belongs in the "On Site" group regardless of its
  // journey status (e.g. even if journey is still "Awaiting BID").
  if (c.on_site_date && !c.hand_over_date) return 'On Site';
  if (c.journey_status && !isExceptionJourney(c.journey_status)) {
    if (c.journey_status === 'On-Site') return 'On Site';
    return c.journey_status;
  }
  return c.secondary_status || journey || 'New';
}

// Ordered list of group headers — "Awaiting BID" prepended, "On Site" inserted
// before "In Repair", and "Cancelled" appended at the end.
export const GROUP_STATUSES = (() => {
  const idx = SECONDARY_STATUSES.indexOf('In Repair');
  const at = idx === -1 ? SECONDARY_STATUSES.length : idx;
  return [
    'Awaiting BID',
    ...SECONDARY_STATUSES.slice(0, at),
    'On Site',
    ...SECONDARY_STATUSES.slice(at),
    'Cancelled',
  ];
})();

// Build a group list that includes any custom statuses from ClaimStatusConfig
// that aren't already in the base list. Pass the ClaimStatusConfig array (e.g.
// from useStatusConfigs().claimStatuses). Falls back to GROUP_STATUSES.
export function buildGroupStatuses(configuredStatuses) {
  if (!configuredStatuses || configuredStatuses.length === 0) return GROUP_STATUSES;
  const active = configuredStatuses
    .filter(s => s.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(s => s.status_name);
  const known = new Set(GROUP_STATUSES);
  const extras = active.filter(s => !known.has(s));
  if (extras.length === 0) return GROUP_STATUSES;
  const cancelledIdx = GROUP_STATUSES.indexOf('Cancelled');
  if (cancelledIdx === -1) return [...GROUP_STATUSES, ...extras];
  return [...GROUP_STATUSES.slice(0, cancelledIdx), ...extras, ...GROUP_STATUSES.slice(cancelledIdx)];
}

// Dot colour for a group header. statusConfigs is the ClaimStatusConfig list
// (optional) — used to resolve per-status colours, falling back to journey
// colours then gray.
export function getStatusDot(statusName, statusConfigs) {
  if (statusName === 'Awaiting BID') return STATUS_COLORS.indigo;
  if (statusName === 'On Site') return STATUS_COLORS.cyan;
  if (statusName === 'Cancelled') return STATUS_COLORS.red;
  const cfg = statusConfigs?.find((s) => s.status_name === statusName);
  return STATUS_COLORS[cfg?.color] || STATUS_COLORS[getJourneyColor(statusName)] || '#6b7280';
}