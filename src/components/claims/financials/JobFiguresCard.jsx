import React from 'react';
import { Check } from 'lucide-react';
import StandardJobFigures from './StandardJobFigures';
import CreditRepairFigures from './CreditRepairFigures';
import SecondReferrerToggle from './SecondReferrerToggle';
import NotesReferences from './NotesReferences';

/**
 * The one card where the figures that drive this claim's invoices are entered
 * and edited in place. Missing figures are flagged here — and only the ones this
 * claim actually needs. The reference and notes fields stay folded away unless
 * they already hold something.
 */
export default function JobFiguresCard({ claim, ctx, missing, onChange, onTrackerChange }) {
  return (
    <div className="rounded-[10px] border border-border bg-card p-2.5 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job figures</h4>
        {missing.length > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
            {missing.length} needed for invoicing
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-semibold">
            <Check className="w-2.5 h-2.5" strokeWidth={3} /> All figures set
          </span>
        )}
      </div>

      {ctx.creditRepair ? (
        <CreditRepairFigures claim={claim} missing={missing} onChange={onChange} />
      ) : (
        <StandardJobFigures
          claim={claim}
          ctx={ctx}
          missing={missing}
          onChange={onChange}
          onTrackerChange={onTrackerChange}
        />
      )}

      {ctx.creditRepair && ctx.hasReferrer && (
        <SecondReferrerToggle claim={claim} onTrackerChange={onTrackerChange} />
      )}

      <NotesReferences claim={claim} onChange={onChange} />
    </div>
  );
}