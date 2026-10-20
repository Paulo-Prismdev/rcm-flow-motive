import React from 'react';
import { ChevronRight } from 'lucide-react';
import ArchivedTag from './ArchivedTag';
import { formatInvoiceDay } from '@/components/shared/invoiceChecklist';
import { isOverdue, waitingLabel } from '@/components/shared/invoicingQueue';
import { fmtGBP } from '@/components/shared/creditRepairRates';

/** One aged invoice, inside its party's row. */
export default function AgedInvoiceRow({ row, onOpen }) {
  const late = isOverdue(row);

  return (
    <button
      type="button"
      onClick={() => onOpen(row.claimId)}
      className="w-full text-left flex items-start gap-2 pl-7 pr-3 py-2.5 border-t border-border hover:bg-muted/40 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold flex-1 min-w-0 truncate">{row.invoice}</span>
          {row.archived && <ArchivedTag />}
          <span className={`text-xs font-semibold tabular-nums shrink-0 ${late ? 'text-red-600 dark:text-red-400' : ''}`}>
            {fmtGBP(row.amount)}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {[row.reg, row.jobNumber, row.client].filter(Boolean).join(' · ')}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {formatInvoiceDay(row.date)} · {waitingLabel(row.days)}
        </p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground mt-0.5" />
    </button>
  );
}