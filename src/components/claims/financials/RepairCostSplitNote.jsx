import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';

/**
 * The repairer's two invoices on a job where we handle the client's VAT and
 * excess, added up against the claim's final repair cost: what the insurer pays,
 * plus the VAT content of the repair and the excess they collected, is the whole
 * of the repair. It sits with the close-out documents, so a repairer billing the
 * two parts at figures that don't reconcile is flagged where both invoices are
 * filed rather than surfacing later in the money.
 */
export default function RepairCostSplitNote({ comparison }) {
  if (!comparison) return null;
  const { status, insurerPart, vatExcessPart, total, repairCost, difference } = comparison;
  const differs = status === 'differs';

  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${differs
      ? 'border-warning/30 bg-warning-bg'
      : 'border-border bg-muted/30'}`}
    >
      {differs
        ? <AlertTriangle className="mt-px h-3.5 w-3.5 flex-shrink-0 text-warning-fg" />
        : <Check className="mt-px h-3.5 w-3.5 flex-shrink-0 text-success-fg" />}
      <p className={`flex-1 text-xs leading-snug ${differs
        ? 'text-warning-fg'
        : 'text-muted-foreground'}`}
      >
        Final Insurer Invoice {fmtGBP(insurerPart)} + VAT &amp; Excess Invoice In {fmtGBP(vatExcessPart)} ={' '}
        <span className="font-semibold tabular-nums">{fmtGBP(total)}</span>{' '}
        {differs
          ? (
            <>
              — {fmtGBP(Math.abs(difference))} {difference < 0 ? 'short of' : 'over'} the{' '}
              {fmtGBP(repairCost)} final repair cost.
            </>
          )
          : <>— the final repair cost of {fmtGBP(repairCost)}.</>}
      </p>
    </div>
  );
}