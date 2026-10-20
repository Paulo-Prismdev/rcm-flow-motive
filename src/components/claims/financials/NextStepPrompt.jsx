import React from 'react';
import { ArrowRight, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ACTION_META } from './financialActionMeta';

/**
 * The one thing to do in the step the job is on, sat at the top of that step with
 * the button that does it. The prompt is about the current step and nothing else,
 * but it carries a short reminder of what any steps the job has been taken past
 * are still waiting on, so nothing is forgotten by moving on. Where the current
 * step still has invoices to attach, its own button moves the job past it.
 */
export default function NextStepPrompt({ action, onDo, pending = [], onContinue }) {
  if (!action && pending.length === 0 && !onContinue) return null;
  const meta = ACTION_META[action?.kind] || ACTION_META.upload;
  const Icon = meta.icon;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-l-4 border-l-primary border-primary/20 bg-primary/5 px-2.5 py-2">
      {action && (
        <div className="min-w-[160px] flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Next step</p>
          <p className="text-xs font-semibold text-foreground">{action.label}</p>
        </div>
      )}

      {pending.length > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
          <Hourglass className="w-3.5 h-3.5 flex-shrink-0" />
          Still waiting on: {pending.join(', ')}
        </p>
      )}

      <div className="flex items-center gap-2">
        {onContinue && (
          <Button size="sm" variant="outline" onClick={onContinue} className="h-7 gap-1.5 text-xs">
            Continue — invoices pending
          </Button>
        )}

        {action && (
          <Button size="sm" onClick={() => onDo(action)} className="h-7 gap-1.5 text-xs">
            <Icon className="h-3.5 w-3.5" /> {meta.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}