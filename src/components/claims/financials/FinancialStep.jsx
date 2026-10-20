import React from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * One numbered step of the invoicing flow. The step being worked on is open and
 * highlighted, a finished step collapses to its one-line green summary, and the
 * steps still to come stay visible but dimmed — every one of them can be opened
 * and worked on in any order.
 */
export default function FinancialStep({ n, title, hint, line, status, open, onToggle, children }) {
  const done = status === 'done';
  const current = status === 'current';

  const frame = done
    ? 'border-green-200 dark:border-green-900 bg-green-50/60 dark:bg-green-900/10'
    : current
      ? 'border-primary/50 bg-card ring-1 ring-primary/20'
      : 'border-border bg-card opacity-60';

  const number = done
    ? 'bg-green-500/20 text-green-700 dark:text-green-300'
    : current
      ? 'bg-primary/15 text-primary'
      : 'bg-muted text-muted-foreground';

  return (
    <section className={`rounded-xl border shadow-sm transition-all ${frame}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
      >
        <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${number}`}>
          {done ? <Check className="h-3 w-3" strokeWidth={3} /> : n}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-foreground">
            Step {n} · {title}
          </span>
          <span className={`block text-[11px] ${done ? 'font-medium text-green-700 dark:text-green-300' : 'text-muted-foreground'}`}>
            {done ? `✓ ${line}` : line}
          </span>
        </span>

        <span className="flex-shrink-0 pt-0.5 text-muted-foreground">
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      {open && (
        <div className="space-y-2.5 border-t border-border/60 px-3 py-3">
          <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
          {children}
        </div>
      )}
    </section>
  );
}