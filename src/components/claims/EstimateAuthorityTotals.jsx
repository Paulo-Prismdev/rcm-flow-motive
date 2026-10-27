import React from 'react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { latestTotalsRows } from '@/components/claims/documentFigures';

/**
 * The estimated and authorised figures the claim holds, each on its own line. A
 * supplementary figure is a revised total, so it is shown as the current figure with
 * the initial it replaced kept underneath — never as two figures added together. The
 * Final Authority sits on its own line: it is what the insurers' invoices are measured
 * against, and the initial and supplementary authorities remain records only.
 *
 * Nothing is written here — the lines are worked out from the claim's own fields and the
 * figures read off each document.
 */
export default function EstimateAuthorityTotals({ claim, className }) {
  const rows = latestTotalsRows(claim);
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
              {row.current ? fmtGBP(row.current.gross) : '—'}
              {row.current?.net != null && (
                <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                  ({fmtGBP(row.current.net)} ex VAT)
                </span>
              )}
            </span>
          </div>
          {row.current && (
            <div className="text-[10px] leading-snug text-muted-foreground">
              {row.replaced ? (
                <span>
                  Supplementary — replaces the initial {fmtGBP(row.replaced.gross)}
                </span>
              ) : (
                <span>Initial{row.final !== null ? ' — kept for the record' : ''}</span>
              )}
            </div>
          )}
          {row.final !== null && (
            <div className="text-[10px] leading-snug text-muted-foreground">
              Final authority {fmtGBP(row.final)} — the figure the insurers' invoices are measured against
            </div>
          )}
        </div>
      ))}
    </div>
  );
}