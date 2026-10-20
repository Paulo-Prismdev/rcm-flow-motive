import React from 'react';
import { AlertTriangle, Check, PoundSterling } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { toNum } from './invoiceReview';

/**
 * The total read off the Final Invoice, set against the repair cost already on
 * the claim: it fills the figure in where there is none, says so plainly where
 * the two agree, and flags the difference where they don't — never overwriting
 * a figure that is already there without being asked.
 */
export function repairCostOffer(item, claim, figures) {
  if (!item?.setsRepairCost) return null;
  const total = toNum(figures?.amount_total);
  if (total === null) return null;

  const onFile = toNum(claim?.final_repair_cost);
  if (onFile === null) {
    return { total, onFile: null, status: 'empty', difference: null, defaultUse: true };
  }
  const difference = Math.round((total - onFile) * 100) / 100;
  if (Math.abs(difference) < 0.01) {
    return { total, onFile, status: 'match', difference: 0, defaultUse: false };
  }
  return { total, onFile, status: 'differs', difference, defaultUse: false };
}

export default function RepairCostFromInvoice({ offer, useIt, onUse }) {
  if (!offer) return null;

  const differs = offer.status === 'differs';

  return (
    <div className={`space-y-1.5 rounded-lg border px-2.5 py-2 ${differs
      ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
      : 'border-border bg-muted/30'}`}
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
        <PoundSterling className="h-3.5 w-3.5" /> The claim's final repair cost
      </p>

      {offer.status === 'empty' && (
        <label className="flex cursor-pointer items-start gap-2 text-[11px]">
          <input
            type="checkbox"
            checked={useIt}
            onChange={(e) => onUse(e.target.checked)}
            className="mt-0.5 rounded border-border"
          />
          <span>
            Use this invoice's total, <span className="font-semibold tabular-nums">{fmtGBP(offer.total)}</span>, as the
            claim's final repair cost.
          </span>
        </label>
      )}

      {offer.status === 'match' && (
        <p className="flex items-center gap-1.5 text-[11px] text-green-700 dark:text-green-300">
          <Check className="h-3.5 w-3.5" /> Matches the repair cost on file ({fmtGBP(offer.onFile)}).
        </p>
      )}

      {differs && (
        <>
          <p className="flex items-start gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
            <AlertTriangle className="mt-px h-3.5 w-3.5 flex-shrink-0" />
            <span>
              This invoice reads <span className="font-semibold tabular-nums">{fmtGBP(offer.total)}</span>, but the
              claim's final repair cost is <span className="font-semibold tabular-nums">{fmtGBP(offer.onFile)}</span> — a
              difference of {fmtGBP(Math.abs(offer.difference))}.
            </span>
          </p>
          <label className="flex cursor-pointer items-start gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={useIt}
              onChange={(e) => onUse(e.target.checked)}
              className="mt-0.5 rounded border-border"
            />
            <span>Use this invoice's figure instead — replaces the final repair cost on the claim.</span>
          </label>
        </>
      )}
    </div>
  );
}