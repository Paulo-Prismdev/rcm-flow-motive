import React from 'react';
import { useStatusConfigs } from './StatusConfigContext';
import { getJourneyColor } from './claimStatusV2';
import { getOutcomeColor } from './claimOutcome';

// Low-contrast pill badge color map
// Each entry: [bg class, text class] — same hue, low contrast
const COLOR_STYLES = {
  blue:   'bg-info-bg text-info-fg',
  green:  'bg-success-bg text-success-fg',
  red:    'bg-danger-bg text-danger-fg',
  orange: 'bg-warning-bg text-warning-fg',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  yellow: 'bg-warning-bg text-warning-fg',
  gray:   'bg-muted text-muted-foreground',
  pink:   'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  indigo: 'bg-info-bg text-info-fg',
  teal:   'bg-success-bg text-link',
  cyan:   'bg-info-bg text-info-fg',
  lime:   'bg-lime-50 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
  amber:  'bg-warning-bg text-warning-fg',
  rose:   'bg-danger-bg text-danger-fg',
  slate:  'bg-muted text-foreground',
};

// Secondary (outlined) variant color map
const SECONDARY_STYLES = {
  blue:   'border border-info/30 text-info-fg',
  green:  'border border-success/30 text-success-fg',
  red:    'border border-danger/30 text-danger-fg',
  orange: 'border border-warning/30 text-warning-fg',
  purple: 'border border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300',
  yellow: 'border border-warning/30 text-warning-fg',
  gray:   'border border-border text-muted-foreground',
  pink:   'border border-pink-300 text-pink-700 dark:border-pink-700 dark:text-pink-300',
  indigo: 'border border-info/30 text-info-fg',
  teal:   'border border-success/30 text-link',
  cyan:   'border border-info/30 text-info-fg',
  lime:   'border border-lime-300 text-lime-700 dark:border-lime-700 dark:text-lime-300',
  amber:  'border border-warning/30 text-warning-fg',
  rose:   'border border-danger/30 text-danger-fg',
  slate:  'border border-border text-foreground',
};

const PILL_BASE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap leading-none';
const PILL_COMPACT = 'inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold leading-none max-w-full overflow-hidden text-ellipsis whitespace-nowrap';

export default function StatusBadge({ status, variant = "primary", compact = false }) {
  const { allStatuses, isLoading } = useStatusConfigs();

  const getColor = (statusName) => {
    if (!statusName) return 'gray';
    const customStatus = allStatuses.find(
      s => s.status_name.toLowerCase() === statusName.toLowerCase()
    );
    if (customStatus?.color) return customStatus.color;
    // v2 journey statuses carry their own colour map, and so do the outcomes
    return getJourneyColor(statusName) || getOutcomeColor(statusName) || 'gray';
  };

  if (isLoading) {
    return (
      <span className={`${PILL_BASE} bg-muted w-16 animate-pulse`}>&nbsp;</span>
    );
  }

  // Array of statuses
  if (Array.isArray(status)) {
    if (status.length === 0) {
      return (
        <span className={`${PILL_BASE} bg-muted text-muted-foreground`}>No status</span>
      );
    }
    return (
      <div className="flex flex-wrap gap-1">
        {status.map((s, i) => (
          <span key={i} className={`${PILL_BASE} ${COLOR_STYLES[getColor(s)] || COLOR_STYLES.gray}`}>
            {s}
          </span>
        ))}
      </div>
    );
  }

  if (!status) {
    return (
      <span className={`${PILL_BASE} bg-muted text-muted-foreground`}>No status</span>
    );
  }

  const base = compact ? PILL_COMPACT : PILL_BASE;
  const title = compact && typeof status === 'string' ? status : undefined;

  if (variant === 'secondary') {
    return (
      <span className={`${base} bg-transparent ${SECONDARY_STYLES[getColor(status)] || SECONDARY_STYLES.gray}`} title={title}>
        {status}
      </span>
    );
  }

  return (
    <span className={`${base} ${COLOR_STYLES[getColor(status)] || COLOR_STYLES.gray}`} title={title}>
      {status}
    </span>
  );
}