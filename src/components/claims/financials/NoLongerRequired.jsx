import React from 'react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { formatInvoiceDay } from '@/components/shared/invoiceChecklist';

/**
 * The invoices and close-out papers a job no longer carries — the paperwork of a
 * claim switched to or away from Total Loss. Everything recorded against them is
 * kept and shown here: the copies, the figures, the dates and the payments. None of
 * it counts towards the job's progress, its money or the day's queues, and nothing
 * has been deleted.
 */
export default function NoLongerRequired({ items = [], filesFor, onViewFile }) {
  if (items.length === 0) return null;

  const recorded = (item, state) => {
    const bits = [];
    if (state.amount > 0) bits.push(fmtGBP(state.amount));
    const dateLabel = item.dateLabel || (item.direction === 'in' ? 'Received' : 'Sent');
    if (state.date) bits.push(`${dateLabel} ${formatInvoiceDay(state.date)}`);
    if (state.paid) bits.push(state.paidDate ? `Paid ${formatInvoiceDay(state.paidDate)}` : 'Paid');
    else if (state.requested) bits.push('Requested from accounts');
    if (state.notApplicable) bits.push('Marked not applicable');
    return bits.join(' · ') || 'Nothing recorded against it';
  };

  return (
    <div className="rounded-[10px] border border-dashed border-border bg-muted/20 px-3 py-2.5 space-y-2">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          No longer required
        </h4>
        <p className="text-[11px] text-muted-foreground">
          This job changed type after these were recorded, so they no longer form part of its invoicing.
          The copies, figures and payments are kept here — nothing has been deleted.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map(({ item, state }) => {
          const files = filesFor(item.key);
          return (
            <div key={item.key} className="rounded-lg border border-border bg-card px-2.5 py-2 space-y-1">
              <p className="text-xs font-semibold text-foreground">{item.label}</p>
              <p className="text-[10px] text-muted-foreground tabular-nums">{recorded(item, state)}</p>
              {files.length > 0 && (
                <div className="space-y-0.5">
                  {files.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => onViewFile(doc.file_url)}
                      className="block max-w-full truncate text-[11px] text-primary hover:underline"
                    >
                      {doc.file_name || doc.file_url.split('/').pop()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}