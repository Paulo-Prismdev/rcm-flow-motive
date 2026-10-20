import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ACTION_META } from './financialActionMeta';

/**
 * The one thing to do in the step the job is on, sat at the top of that step with
 * the button that does it. A step with nothing to do right now shows no prompt at
 * all, so it is never just noise above the step's own items.
 */
export default function NextStepPrompt({ action, onDo }) {
  if (!action) return null;
  const meta = ACTION_META[action.kind] || ACTION_META.upload;
  const Icon = meta.icon;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-l-4 border-l-primary border-primary/20 bg-primary/5 px-2.5 py-2">
      <div className="min-w-[160px] flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Next step</p>
        <p className="text-xs font-semibold text-foreground">{action.label}</p>
      </div>

      <Button size="sm" onClick={() => onDo(action)} className="h-7 gap-1.5 text-xs">
        <Icon className="h-3.5 w-3.5" /> {meta.label}
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}