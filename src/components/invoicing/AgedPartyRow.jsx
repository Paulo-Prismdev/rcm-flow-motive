import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { AGE_BANDS, OVERDUE_DAYS, waitingLabel } from '@/components/shared/invoicingQueue';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import AgedInvoiceRow from './AgedInvoiceRow';

/** One party's aged invoices: what it owes, how old, and the invoices behind it. */
export default function AgedPartyRow({ group, onOpen }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-border first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-3 py-3 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronRight className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
          <span className="text-sm font-semibold flex-1 min-w-0 truncate">{group.party}</span>
          <span className="text-[11px] text-muted-foreground shrink-0">
            {group.count} invoice{group.count === 1 ? '' : 's'}
          </span>
          <span className={`text-sm font-semibold tabular-nums shrink-0 ${group.overdue ? 'text-red-600 dark:text-red-400' : ''}`}>
            {fmtGBP(group.total)}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 pl-6 text-[11px] text-muted-foreground">
          {AGE_BANDS.map((band) => (group.bands[band.key] ? (
            <span key={band.key} className={band.min > OVERDUE_DAYS ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>
              {band.label} {fmtGBP(group.bands[band.key])}
            </span>
          ) : null))}
          <span>oldest {waitingLabel(group.oldest)}</span>
        </div>
      </button>

      {open && group.rows.map((row) => <AgedInvoiceRow key={row.id} row={row} onOpen={onOpen} />)}
    </div>
  );
}