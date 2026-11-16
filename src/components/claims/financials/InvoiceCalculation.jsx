import React from 'react';

/**
 * The workings behind one invoice's amount, revealed by "Show calculation".
 */
export default function InvoiceCalculation({ state }) {
  if (!state.workings?.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-2.5 py-2">
        <p className="text-xs text-muted-foreground">
          {state.hint || 'No amount to work out for this item yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2 space-y-1">
      <p className="text-xs font-semibold text-muted-foreground">How this is worked out</p>
      {state.workings.map((row, i) => (
        <div
          key={i}
          className={`flex items-baseline justify-between gap-3 text-xs ${row.total ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
        >
          <span>{row.label}</span>
          <span className="tabular-nums">{row.value}</span>
        </div>
      ))}
      {state.hint && <p className="text-xs text-muted-foreground pt-1">{state.hint}</p>}
      {state.adjusted && <p className="text-xs text-warning-fg pt-1">Amount adjusted on this invoice by hand.</p>}
      {state.locked && <p className="text-xs text-muted-foreground pt-1">Locked at the figure it was sent at.</p>}
    </div>
  );
}