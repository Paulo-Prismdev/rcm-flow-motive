import React from 'react';
import { Button } from '@/components/ui/button';
import { ACTION_META } from './financialActionMeta';

/**
 * A recommended item's nudge, sat with the item itself inside the step it belongs
 * to — the Collection Note, for instance. Recommended work is never required and
 * never holds the job up, so it is offered quietly next to its own card rather
 * than in a banner of its own.
 */
export default function RecommendedNudge({ action, onDo }) {
  if (!action) return null;
  const meta = ACTION_META[action.kind] || ACTION_META.upload;
  const Icon = meta.icon;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-900/10 px-2.5 py-1.5">
      <p className="min-w-0 flex-1 text-[11px] text-amber-800 dark:text-amber-300">
        <span className="font-semibold">Recommended:</span> {action.label}
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onDo(action)}
        className="h-6 gap-1 border-amber-300 bg-transparent px-2 text-[11px] text-amber-800 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/40"
      >
        <Icon className="h-3 w-3" /> {meta.label}
      </Button>
    </div>
  );
}