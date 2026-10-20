import React from 'react';
import { ArrowRight, Calculator, Check, PoundSterling, Send, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** What the button does, by the kind of thing to do next. */
const ACTIONS = {
  upload: { label: 'Upload the file', icon: Upload },
  request: { label: 'Request from accounts', icon: Send },
  figures: { label: 'Go to job figures', icon: Calculator },
  pay: { label: 'Mark as paid', icon: PoundSterling },
};

/**
 * The one thing to do now, in plain words, with the button that does it — the
 * first thing the eye lands on in Financials. When there is nothing left it says
 * so plainly instead. Anything merely recommended is offered underneath, quietly,
 * and never in place of the required work.
 */
export default function NextStepCard({ action, allDone, suggestion, onDo }) {
  const next = allDone ? null : action;
  const step = next ? (ACTIONS[next.kind] || ACTIONS.upload) : null;
  const StepIcon = step?.icon;
  const suggested = suggestion ? (ACTIONS[suggestion.kind] || ACTIONS.upload) : null;
  const SuggestIcon = suggested?.icon;

  return (
    <div className="space-y-2">
      {next ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] border border-l-4 border-l-primary border-border bg-card px-3 py-2.5">
          <div className="min-w-[200px] flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Next step</p>
            <p className="text-sm font-semibold text-foreground">Next: {next.label}</p>
            <p className="text-[11px] text-muted-foreground">Step {next.n} of 5 · {next.title}</p>
          </div>

          <Button size="sm" onClick={() => onDo(next)} className="gap-1.5">
            <StepIcon className="h-3.5 w-3.5" /> {step.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-[10px] border border-l-4 border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-2.5">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20">
            <Check className="h-3 w-3 text-green-700 dark:text-green-300" strokeWidth={3} />
          </span>
          <p className="text-xs font-semibold text-green-800 dark:text-green-300">
            {allDone
              ? "Everything's done — nothing left to do on this job's invoicing."
              : 'Nothing needs doing right now.'}
          </p>
        </div>
      )}

      {suggestion && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-900/10 px-3 py-2">
          <p className="min-w-[200px] flex-1 text-xs text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Recommended:</span> {suggestion.label}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDo(suggestion)}
            className="h-7 gap-1.5 border-amber-300 bg-transparent text-xs text-amber-800 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/40"
          >
            <SuggestIcon className="h-3.5 w-3.5" /> {suggested.label}
          </Button>
        </div>
      )}
    </div>
  );
}