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
    <div className="space-y-2">
      <div>
        <h4 className="text-[15px] font-semibold text-foreground">No longer required</h4>
        <p className="text-[11px] text-mac-muted">
          This job changed type after these were recorded, so they no longer form part of its invoicing.
          The copies, figures and payments are kept here — nothing has been deleted.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map(({ item, state }) => {
          const files = filesFor(item.key);
          return (
            <div key={item.key} className="space-y-1 rounded-[10px] border border-mac-line bg-mac-group px-3 py-2 shadow-mac">
              <p className="text-[13px] font-semibold text-foreground">{item.label}</p>
              <p className="text-[11px] tabular-nums text-mac-muted">{recorded(item, state)}</p>
              {files.length > 0 && (
                <div className="space-y-0.5">
                  {files.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => onViewFile(doc.file_url)}
                      className="block max-w-full truncate text-[11px] text-mac-accent hover:underline"
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