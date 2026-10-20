import React, { useState } from 'react';
import { AlertTriangle, Unlock } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import InvoiceItemCard from '../InvoiceItemCard';
import InvoiceItemDetails from '../InvoiceItemDetails';

/**
 * One of the close-out items — the Final Invoice, Final Authority or Collection
 * Note — as a single card matching the invoice cards: the status button with
 * everything else in the same box behind its own ⋮ menu. The Final Invoice shows
 * its amount small on the button once there is one.
 */
export default function CloseOutItem({
  item, state, files, isUploading,
  onChange, onUpload, onDeleteFile, onRenameFile, onViewFile,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const showAmount = item.key === 'final_invoice' && state.amount > 0;

  return (
    <InvoiceItemCard
      item={item}
      state={state}
      files={files}
      isUploading={isUploading}
      onChange={onChange}
      onUpload={onUpload}
      onDeleteFile={onDeleteFile}
      onRenameFile={onRenameFile}
      onViewFile={onViewFile}
      onToggleDetails={() => setDetailsOpen((v) => !v)}
      detailsOpen={detailsOpen}
      amountText={showAmount ? fmtGBP(state.amount) : undefined}
    >
      {state.variance && (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          <span className="flex-1">
            {state.variance.reason} — calculated {fmtGBP(state.variance.calculated)}, invoiced {fmtGBP(state.variance.invoiced)}. Unlock the amount to follow the calculated figure again.
          </span>
          <button
            type="button"
            onClick={() => onChange({ amount: null }, `${item.label} amount unlocked — follows the calculated figure again`)}
            className="inline-flex items-center gap-1 font-semibold underline flex-shrink-0"
          >
            <Unlock className="w-3 h-3" /> Unlock
          </button>
        </p>
      )}

      {detailsOpen && <InvoiceItemDetails item={item} state={state} onChange={onChange} />}
    </InvoiceItemCard>
  );
}