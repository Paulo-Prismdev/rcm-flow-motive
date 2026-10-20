import React from 'react';
import { Check } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';

// Only the count carries the urgency: red where something is wrong, amber where
// something is being waited on.
const COUNT_TONE = {
  neutral: 'text-foreground',
  warning: 'text-amber-600 dark:text-amber-400',
  negative: 'text-red-600 dark:text-red-400',
};

/** One of the day's queues as a tile; clicking it opens its list under the grid. */
export default function QueueTile({ section, open, onToggle }) {
  const frame = `rounded-[10px] border text-left transition-colors ${open ? 'border-foreground/25 bg-muted/60' : 'border-border bg-card hover:bg-muted/40'}`;

  if (section.count === 0) {
    return (
      <button type="button" onClick={onToggle} className={`${frame} flex items-center gap-2 px-2.5 py-2`}>
        <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="text-[11px] font-medium text-muted-foreground truncate">{section.label}</span>
      </button>
    );
  }

  return (
    <button type="button" onClick={onToggle} className={`${frame} px-3 py-2`}>
      <p className={`text-lg lg:text-xl font-bold tabular-nums leading-none ${COUNT_TONE[section.tone] || COUNT_TONE.neutral}`}>
        {section.count}
      </p>
      <p className="text-xs font-semibold tabular-nums mt-1">{section.total > 0 ? fmtGBP(section.total) : '—'}</p>
      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{section.label}</p>
    </button>
  );
}