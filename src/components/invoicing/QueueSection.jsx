import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import QueueRow from './QueueRow';
import { fmtGBP } from '@/components/shared/creditRepairRates';

const COUNT_TONES = {
  neutral: 'bg-muted text-muted-foreground',
  warning: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
  negative: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300',
};

/** One section of the day's queue, with its count and the money it holds. */
export default function QueueSection({ section, onOpen }) {
  const [open, setOpen] = useState(section.count > 0);
  const empty = section.count === 0;

  return (
    <div className="bg-card border border-border rounded-[10px] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`} />
        <span className="text-sm font-semibold flex-1 min-w-0 truncate">{section.label}</span>
        {section.total > 0 && (
          <span className="text-sm font-semibold tabular-nums shrink-0">{fmtGBP(section.total)}</span>
        )}
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${empty ? COUNT_TONES.neutral : COUNT_TONES[section.tone]}`}>
          {section.count}
        </span>
      </button>

      {open && (
        <>
          <p className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border">{section.hint}</p>
          {empty
            ? <p className="px-3 py-3 text-xs text-muted-foreground border-t border-border">Nothing here.</p>
            : section.rows.map((row) => <QueueRow key={row.id} row={row} onOpen={onOpen} />)}
        </>
      )}
    </div>
  );
}