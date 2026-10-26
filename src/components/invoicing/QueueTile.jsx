import React from 'react';
import { Check } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { lightText } from '@/components/shared/trafficLight';

// Only the count carries the urgency, in the same red and amber a status is read in
// everywhere else: red where something is wrong, amber where something is waited on.
const COUNT_TONE = {
  neutral: 'text-foreground',
  warning: lightText('amber'),
  negative: lightText('red'),
};

/** One of the day's queues as a tile; clicking it opens its list under the grid. */
export default function QueueTile({ section, open, onToggle }) {
  const frame = `rounded-[10px] border text-left transition-colors ${open ? 'border-foreground/25 bg-muted/60' : 'border-border bg-card hover:bg-muted/40'}`;

  // A clear queue is a small muted chip: nothing to do, nothing to read.
  if (section.count === 0) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={`rounded-[10px] border flex items-center gap-1.5 px-2.5 py-1.5 text-left transition-colors ${open ? 'border-foreground/25 bg-muted' : 'border-border bg-muted/40 hover:bg-muted/70'}`}
      >
        <Check className={`w-3.5 h-3.5 shrink-0 ${lightText('green')}`} />
        <span className="text-[11px] font-medium text-muted-foreground truncate">{section.label}</span>
      </button>
    );
  }

  // Name first, then how many, then what they come to — the amount sits on the floor
  // of the tile so every amount in a row lines up, and a queue with no money in it
  // simply has no amount line.
  return (
    <button type="button" onClick={onToggle} className={`${frame} flex flex-col px-3 py-2`}>
      <span className="text-[13px] font-semibold leading-snug line-clamp-2">{section.label}</span>
      <p className={`text-lg lg:text-xl font-bold tabular-nums leading-none mt-1.5 ${COUNT_TONE[section.tone] || COUNT_TONE.neutral}`}>
        {section.count}
      </p>
      {section.total > 0 && (
        <span className="text-xs tabular-nums text-muted-foreground mt-auto pt-1.5">{fmtGBP(section.total)}</span>
      )}
    </button>
  );
}