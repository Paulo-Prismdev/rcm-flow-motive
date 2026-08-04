import React from 'react';
import { Clock, AlertCircle, CheckCircle, Pause, XCircle } from 'lucide-react';

// Low-contrast pill style consistent with StatusBadge
const configs = {
  Red: {
    classes: 'bg-red-50 text-red-700 dark:bg-red-900/25 dark:text-red-300',
    icon: AlertCircle,
    label: 'Overdue',
    description: 'Update overdue',
  },
  Amber: {
    classes: 'bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300',
    icon: Clock,
    label: 'Due Soon',
    description: 'Update due soon',
  },
  Green: {
    classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300',
    icon: CheckCircle,
    label: 'On Track',
    description: 'On track',
  },
  Blue: {
    classes: 'bg-blue-50 text-blue-700 dark:bg-blue-900/25 dark:text-blue-300',
    icon: Pause,
    label: 'Snoozed',
    description: 'Update tracking paused',
  },
  Gray: {
    classes: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
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
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${config.classes}`}
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