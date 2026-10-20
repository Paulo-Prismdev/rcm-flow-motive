import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';

/**
 * What the authority says about the policy excess, set against the three-way
 * choice the claim holds. A figure the claim hasn't got is filled in, a
 * difference is put to the user to choose, and a claim holding TBC that this
 * authority shows no excess for is offered as Waived — the claim's own choice is
 * never moved without being asked.
 */
export default function AuthorityExcessChoice({ check, choice, onChoice }) {
  if (!check) return null;

  // TBC, and nothing read for the excess: the authority resolves it, so offer to
  // settle it as Waived rather than leaving the claim waiting on a figure that
  // isn't coming.
  if (check.offersWaive) {
    const on = choice === 'waived';
    return (
      <button
        type="button"
        onClick={() => onChoice(on ? 'claim' : 'waived')}
        className={`w-full flex items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
          on
            ? 'border-green-400 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
            : 'border-border bg-muted/30 hover:border-accent/50'}`}
      >
        <span className={`mt-px flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border ${on ? 'border-green-600 bg-green-600' : 'border-muted-foreground/50'}`}>
          {on && <Check className="w-2.5 h-2.5 text-white" />}
        </span>
        <span className="text-[11px] text-muted-foreground">
          This authority shows no excess, and the claim's is{' '}
          <span className="font-semibold text-foreground">TBC on authority</span>.{' '}
          {on
            ? 'It will be marked as Waived — nothing payable.'
            : 'Tick to mark it as Waived.'}
        </span>
      </button>
    );
  }

  if (check.shown === null) return null;

  if (check.fills) {
    const text = !check.tbc
      ? `The claim has no policy excess. The ${fmtGBP(check.shown)} this authority shows will be filled in as the policy excess.`
      : check.shown === 0
        ? 'The claim\u2019s excess is TBC on authority and this authority shows no excess, so it will be marked as Waived.'
        : `The claim's excess is TBC on authority. The ${fmtGBP(check.shown)} this authority shows will be filled in as the policy excess and the TBC cleared.`;
    return (
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
        <Check className="mt-px w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">{text}</p>
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
          The excess doesn't match — the claim holds {check.storedLabel}, this authority shows {fmtGBP(check.shown)}.
        </span>
      </p>
      <div className="pl-5 flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => onChoice('claim')} className={optionClass(choice !== 'authority')}>
          <Check className="w-3 h-3" /> Keep the claim's {check.storedLabel}
        </button>
        <button type="button" onClick={() => onChoice('authority')} className={optionClass(choice === 'authority')}>
          <Check className="w-3 h-3" /> Use the authority's {fmtGBP(check.shown)}
        </button>
      </div>
    </div>
  );
}