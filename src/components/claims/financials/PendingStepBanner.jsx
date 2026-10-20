import React from 'react';
import { Hourglass, RotateCcw } from 'lucide-react';

/**
 * A step the job has been taken past while its invoices were not to hand: what
 * it is still waiting on, and the way back into it. The copies can be uploaded
 * from the step's own rows at any time, and the step goes green the moment the
 * last one lands — reopening it simply puts it back as the job's next work.
 */
export default function PendingStepBanner({ outstanding = [], onReopen }) {
  const list = outstanding.join(', ');

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-l-4 border-amber-200 border-l-amber-400 bg-amber-50/70 px-2.5 py-2 dark:border-amber-900 dark:border-l-amber-500 dark:bg-amber-900/10">
      <div className="min-w-[160px] flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
          Moved past
        </p>
        <p className="text-xs font-semibold text-foreground">
          {list} {outstanding.length === 1 ? 'is' : 'are'} still to attach
        </p>
      </div>

      {onReopen && (
        <button
          type="button"
          onClick={onReopen}
          className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100/70 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/30"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reopen this step
        </button>
      )}
    </div>
  );
}