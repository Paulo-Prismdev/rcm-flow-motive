import React from 'react';

/**
 * One group of invoices — In, Out, or the close-out step — with its rows.
 */
export default function InvoiceGroup({ label, hint, isEmpty, emptyText, children }) {
  return (
    <div className="space-y-1.5">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h4>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </div>
      {isEmpty
        ? <p className="text-[11px] text-muted-foreground/70">{emptyText}</p>
        : <div className="space-y-2.5">{children}</div>}
    </div>
  );
}