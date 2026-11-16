import React from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * One numbered step of the invoicing flow. The step being worked on is open,
 * highlighted and carries the next-step prompt at its top; a finished step
 * collapses to its one-line green summary; and the steps still to come stay
 * visible but dimmed — every one of them can be opened and worked on in any
 * order. A recommended item's nudge stays with its own step: beside the item
 * while the step is open, and on the folded step when it is not.
 */
export default function FinancialStep({ n, title, hint, line, status, open, onToggle, banner, nudge, children }) {
  const done = status === 'done';
  const current = status === 'current';
  // A step the job has been taken past is amber, never green: there is still
  // something outstanding in it, and its line says what.
  const movedPast = status === 'pending';
  // A step still to come is dimmed only while nothing in it can be done yet:
  // where its own work is possible now, it reads as an ordinary step.
  const dimmed = status === 'dimmed';

  const frame = done
    ? 'border-success/30 bg-success-bg'
    : movedPast
      ? 'border-warning/30 bg-warning-bg'
      : current
        ? 'border-primary/50 bg-card ring-1 ring-primary/20'
        : dimmed ? 'border-border bg-card opacity-60' : 'border-border bg-card';

  const number = done
    ? 'bg-success/20 text-success-fg'
    : movedPast
      ? 'bg-warning/20 text-warning-fg'
      : current
        ? 'bg-primary/15 text-primary'
        : 'bg-muted text-muted-foreground';

  return (
    <section className={`rounded-xl border shadow-card transition-all ${frame}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
      >
        <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${number}`}>
          {done ? <Check className="h-3 w-3" strokeWidth={3} /> : n}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-foreground">
            Step {n} · {title}
          </span>
          <span className={`block text-xs ${done
            ? 'font-medium text-success-fg'
            : movedPast ? 'font-medium text-warning-fg' : 'text-muted-foreground'}`}>
            {done ? `✓ ${line}` : line}
          </span>
        </span>

        <span className="flex-shrink-0 pt-0.5 text-muted-foreground">
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      {!open && nudge && <div className="px-3 pb-2.5">{nudge}</div>}

      {open && (
        <div className="space-y-2.5 border-t border-border/60 px-3 py-3">
          {banner}
          <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
          {children}
        </div>
      )}
    </section>
  );
}