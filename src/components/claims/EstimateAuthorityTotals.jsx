import React from 'react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { combinedTotalsRows } from '@/components/claims/documentFigures';

/**
 * Every estimated and authorised figure the claim holds, each on its own line: what
 * was estimated first and what the estimate was later added to, the same for what was
 * authorised, and the Final Authority standing apart from both. Nothing is written
 * here — the lines are worked out from the claim's own fields and the figures read off
 * each document, so the initial, the supplementary and the final can never be confused
 * for one another.
 */
export default function EstimateAuthorityTotals({ claim, className }) {
  const rows = combinedTotalsRows(claim);
  if (rows.length === 0) return null;

  return (
    <div className={`rounded-lg border border-border bg-muted/30 p-3 space-y-2 ${className || ''}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Est. and authorised totals
      </div>
      {rows.map((row) => (
        <div key={row.key} className="space-y-0.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[11px] text-muted-foreground">{row.label}</span>
            <span className="text-sm font-semibold tabular-nums">
              {fmtGBP(row.total)}
              {row.netTotal !== null && (
                <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                  ({fmtGBP(row.netTotal)} ex VAT)
                </span>
              )}
            </span>
          </div>
          {(row.initial !== null || row.supplementary !== null) && (
            <div className="text-[10px] leading-snug text-muted-foreground">
              {row.initial !== null && <span>Initial {fmtGBP(row.initial)}</span>}
              {row.supplementary !== null && (
                <span>
                  {row.initial !== null ? ' + ' : ''}Supplementary {fmtGBP(row.supplementary)}
                  {row.combined !== null && (
                    <span className="font-medium text-foreground"> = {fmtGBP(row.combined)} combined</span>
                  )}
                </span>
              )}
            </div>
          )}
          {row.final !== null && (
            <div className="text-[10px] leading-snug text-muted-foreground">
              Final authority {fmtGBP(row.final)} — the figure the insurers' invoices are measured against
              {(row.initial !== null || row.supplementary !== null) ? ', kept apart from the figures above' : ''}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}