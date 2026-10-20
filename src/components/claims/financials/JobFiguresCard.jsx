import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { buildTrackerMetaPatch } from '@/components/shared/invoiceChecklist';
import StandardJobFigures from './StandardJobFigures';
import CreditRepairFigures from './CreditRepairFigures';

/**
 * The one card where the figures that drive this claim's invoices are entered
 * and edited in place, including the second referrer when that's ticked. Missing
 * figures are flagged here — and only the ones this claim actually needs.
 */
export default function JobFiguresCard({ claim, ctx, missing, onChange, onTrackerChange }) {
  const tracker = claim.invoice_tracker || {};
  const [secondRef, setSecondRef] = useState(tracker.second_referrer_name || '');

  useEffect(() => { setSecondRef(tracker.second_referrer_name || ''); }, [tracker.second_referrer_name]);

  const toggleSecondReferrer = (enabled) => onTrackerChange(
    buildTrackerMetaPatch(claim, {
      second_referrer_enabled: enabled,
      second_referrer_name: enabled ? (tracker.second_referrer_name || '') : '',
    }),
    enabled ? 'Second referrer added to the invoicing' : 'Second referrer removed from the invoicing'
  );

  const saveSecondReferrer = () => {
    if (secondRef === (tracker.second_referrer_name || '')) return;
    onTrackerChange(
      buildTrackerMetaPatch(claim, { second_referrer_name: secondRef }),
      `Second referrer set to ${secondRef || 'none'}`
    );
  };

  return (
    <div className="rounded-[10px] border border-border bg-card p-3 space-y-3">
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
        <StandardJobFigures claim={claim} ctx={ctx} missing={missing} onChange={onChange} />
      )}

      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-2">
        <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            checked={tracker.second_referrer_enabled === true}
            onChange={(e) => toggleSecondReferrer(e.target.checked)}
            className="rounded border-border"
          />
          Second referrer to pay
        </label>
        {tracker.second_referrer_enabled === true && (
          <Input
            value={secondRef}
            onChange={(e) => setSecondRef(e.target.value)}
            onBlur={saveSecondReferrer}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            placeholder="Second referrer name / company"
            className="h-8 text-sm sm:max-w-xs"
          />
        )}
      </div>
    </div>
  );
}