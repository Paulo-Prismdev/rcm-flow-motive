import React from 'react';
import InvoiceSectionEmpty from './InvoiceSectionEmpty';

/**
 * One panel of the invoicing area — Invoices In, Invoices Out or Close-out —
 * bordered and titled, with its header carrying the section name, how many items
 * it holds and what they add up to. Panels stretch to the same height side by
 * side, so an empty one still reads as a finished part of the job.
 */
export default function InvoiceGroup({ label, hint, countLabel, summary, empty, children }) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card shadow-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-border/60 px-3 py-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground" title={hint}>
          {label}
        </h4>
        <p className="text-[11px] text-muted-foreground">
          {countLabel}
          {summary && (
            <>
              {' · '}
              <span className={summary.includes('£') ? 'font-semibold tabular-nums text-foreground' : ''}>
                {summary}
              </span>
            </>
          )}
        </p>
      </header>

      <div className="flex flex-1 flex-col p-3">
        {empty
          ? <InvoiceSectionEmpty title={empty.title} reasons={empty.reasons} />
          : <div className="space-y-2.5">{children}</div>}
      </div>
    </section>
  );
}