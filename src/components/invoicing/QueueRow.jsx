import React from 'react';
import { ChevronRight } from 'lucide-react';
import { formatInvoiceDay } from '@/components/shared/invoiceChecklist';
import { waitingLabel } from '@/components/shared/invoicingQueue';
import { fmtGBP } from '@/components/shared/creditRepairRates';

/** One line of the day's queue: the invoice, the job, and the wait behind it. */
export default function QueueRow({ row, onOpen }) {
  const waited = waitingLabel(row.days, row.daysAreWorking);
  const since = formatInvoiceDay(row.waitingSince);

  return (
    <button
      type="button"
      onClick={() => onOpen(row.claimId)}
      className="w-full text-left flex items-start gap-2 px-3 py-3 border-t border-border first:border-t-0 hover:bg-muted/40 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <span className="text-sm font-semibold flex-1 min-w-0 truncate">{row.invoice}</span>
          {row.amount > 0 && (
            <span className="text-sm font-semibold tabular-nums shrink-0">{fmtGBP(row.amount)}</span>
          )}
        </div>

        {row.party && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{row.party}</p>
        )}

        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {[row.reg, row.client, row.jobNumber].filter(Boolean).join(' · ')}
        </p>

        {(since || waited || row.note) && (
          <p className="text-[11px] text-muted-foreground mt-1">
            {(since || waited) && (
              <span className="text-foreground/80 font-medium">
                {since}
                {since && waited ? ' · ' : ''}
                {waited}
              </span>
            )}
            {row.note && `${since || waited ? ' — ' : ''}${row.note}`}
          </p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
    </button>
  );
}