import React from 'react';
import { useStatusConfigs } from './StatusConfigContext';

// Low-contrast pill badge color map
// Each entry: [bg class, text class] — same hue, low contrast
const COLOR_STYLES = {
  blue:   'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  green:  'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  red:    'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  orange: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  yellow: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  gray:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  pink:   'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  teal:   'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  cyan:   'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  lime:   'bg-lime-50 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
  amber:  'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  rose:   'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  slate:  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

// Secondary (outlined) variant color map
const SECONDARY_STYLES = {
  blue:   'border border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300',
  green:  'border border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300',
  red:    'border border-red-300 text-red-700 dark:border-red-700 dark:text-red-300',
  orange: 'border border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300',
  purple: 'border border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300',
  yellow: 'border border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-300',
  gray:   'border border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400',
  pink:   'border border-pink-300 text-pink-700 dark:border-pink-700 dark:text-pink-300',
  indigo: 'border border-indigo-300 text-indigo-700 dark:border-indigo-700 dark:text-indigo-300',
  teal:   'border border-teal-300 text-teal-700 dark:border-teal-700 dark:text-teal-300',
  cyan:   'border border-cyan-300 text-cyan-700 dark:border-cyan-700 dark:text-cyan-300',
  lime:   'border border-lime-300 text-lime-700 dark:border-lime-700 dark:text-lime-300',
  amber:  'border border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300',
  rose:   'border border-rose-300 text-rose-700 dark:border-rose-700 dark:text-rose-300',
  slate:  'border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300',
};

const PILL_BASE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap leading-none';

export default function StatusBadge({ status, variant = "primary" }) {
  const context = useStatusConfigs();
  const allStatuses = context?.allStatuses || [];
  const isLoading = context?.isLoading ?? false;

  const getColor = (statusName) => {
    if (!statusName) return 'gray';
    const customStatus = allStatuses.find(
      s => s.status_name.toLowerCase() === statusName.toLowerCase()
    );
    return customStatus?.color || 'gray';
  };

  if (isLoading) {
    return (
      <span className={`${PILL_BASE} bg-gray-100 dark:bg-gray-800 w-16 animate-pulse`}>&nbsp;</span>
    );
  }

  // Array of statuses
  if (Array.isArray(status)) {
    if (status.length === 0) {
      return (
        <span className={`${PILL_BASE} bg-gray-100 text-gray-500`}>No status</span>
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
      <span className={`${PILL_BASE} bg-gray-100 text-gray-500`}>No status</span>
    );
  }

  if (variant === 'secondary') {
    return (
      <span className={`${PILL_BASE} bg-transparent ${SECONDARY_STYLES[getColor(status)] || SECONDARY_STYLES.gray}`}>
        {status}
      </span>
    );
  }

  return (
    <span className={`${PILL_BASE} ${COLOR_STYLES[getColor(status)] || COLOR_STYLES.gray}`}>
      {status}
    </span>
  );
}