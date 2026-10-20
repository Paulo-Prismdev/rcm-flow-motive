import React from 'react';
import { Check } from 'lucide-react';

/**
 * Which of the five steps are done, which one the job is on, and which are still
 * to come. Every step can be opened from here, so working out of order is never
 * blocked.
 */
export default function StepIndicator({ steps, current, onSelect }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {steps.map((step) => {
        const state = step.done ? 'done' : step.key === current ? 'current' : 'later';
        const tone = state === 'done'
          ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
          : state === 'current'
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-card text-muted-foreground opacity-70';

        return (
          <button
            key={step.key}
            type="button"
            onClick={() => onSelect(step.key)}
            title={`Step ${step.n} · ${step.title}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold transition-colors hover:border-primary/60 ${tone}`}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-background/70 text-[9px] font-bold">
              {state === 'done' ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : step.n}
            </span>
            <span className="hidden sm:inline">{step.title}</span>
            <span className="sm:hidden">{step.n}</span>
          </button>
        );
      })}
    </div>
  );
}