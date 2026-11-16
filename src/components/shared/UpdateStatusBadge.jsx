import React from 'react';
import { Clock, AlertCircle, CheckCircle, Pause, XCircle } from 'lucide-react';

// Low-contrast pill style consistent with StatusBadge
const configs = {
  Red: {
    classes: 'bg-danger-bg text-danger-fg',
    icon: AlertCircle,
    label: 'Overdue',
    description: 'Update overdue',
  },
  Amber: {
    classes: 'bg-warning-bg text-warning-fg',
    icon: Clock,
    label: 'Due Soon',
    description: 'Update due soon',
  },
  Green: {
    classes: 'bg-success-bg text-success-fg',
    icon: CheckCircle,
    label: 'On Track',
    description: 'On track',
  },
  Blue: {
    classes: 'bg-info-bg text-info-fg',
    icon: Pause,
    label: 'Snoozed',
    description: 'Update tracking paused',
  },
  Complete: {
    classes: 'bg-info-bg text-info-fg',
    icon: CheckCircle,
    label: 'Complete',
    description: 'Tracking complete',
  },
  Gray: {
    classes: 'bg-muted text-muted-foreground',
    icon: XCircle,
    label: 'Closed',
    description: 'Claim closed',
  },
};

export default function UpdateStatusBadge({ status, small = false, labelPrefix }) {
  if (!status) return null;

  const config = configs[status] || configs.Gray;
  const Icon = config.icon;
  const title = labelPrefix ? `${labelPrefix}: ${config.description}` : config.description;

  if (small) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${config.classes}`}
        title={title}
      >
        <Icon className="w-3 h-3" />
        {labelPrefix && <span className="opacity-60 font-normal">{labelPrefix}:</span>}
        {config.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.classes}`}
      title={title}
    >
      <Icon className="w-3.5 h-3.5" />
      {labelPrefix && <span className="opacity-60 font-normal">{labelPrefix}:</span>}
      {config.label}
    </span>
  );
}