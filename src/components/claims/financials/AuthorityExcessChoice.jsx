import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';

/**
 * The excess the authority shows, set against the one the claim already holds.
 * An excess the claim hasn't got is filled in from the authority; where the two
 * disagree the difference is flagged and the user chooses which figure the claim
 * keeps — the claim's own figure is never moved without being asked.
 */
export default function AuthorityExcessChoice({ check, choice, onChoice }) {
  if (!check || check.shown === null) return null;

  if (check.fills) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
        <Check className="mt-px w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">
          The claim has no policy excess. The {fmtGBP(check.shown)} this authority shows will be filled in as the policy
          excess.
        </p>
      </div>
    );
  }

  if (!check.differs) return null;

  const optionClass = (selected) => `inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-semibold transition-colors ${selected
    ? 'border-amber-500 bg-amber-100/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200'
    : 'border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:border-amber-400'}`;

  return (
    <div className="space-y-1.5 rounded-lg border border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/25 p-2.5">
      <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
        <span>
          The excess doesn't match — the claim holds {fmtGBP(check.stored)}, this authority shows {fmtGBP(check.shown)}.
        </span>
      </p>
      <div className="pl-5 flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => onChoice('claim')} className={optionClass(choice !== 'authority')}>
          <Check className="w-3 h-3" /> Keep the claim's {fmtGBP(check.stored)}
        </button>
        <button type="button" onClick={() => onChoice('authority')} className={optionClass(choice === 'authority')}>
          <Check className="w-3 h-3" /> Use the authority's {fmtGBP(check.shown)}
        </button>
      </div>
    </div>
  );
}