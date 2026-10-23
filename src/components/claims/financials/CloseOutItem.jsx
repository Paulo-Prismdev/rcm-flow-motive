import React, { useState } from 'react';
import InvoiceItemCard from '../InvoiceItemCard';
import InvoiceItemDetails from '../InvoiceItemDetails';

/**
 * One of the close-out items that is paperwork we collect — the Final Insurer
 * Invoice, the Final Authority or the Collection Note — as a single card matching the
 * invoice cards: the status button with everything else in the same box behind its
 * own ⋮ menu. All of them are documents we collect: a copy on file is what marks them
 * done, and the dates and the file itself are looked after from here. An item in the
 * close-out step that is an invoice we pay instead — the repairer's Final Repair
 * Invoice on a job the customer is paying for privately — is shown as an invoice row.
 */
export default function CloseOutItem({
  item, state, files, isUploading,
  onChange, onUpload, onDeleteFile, onRenameFile, onViewFile, onAskPaid,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

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
      onAskPaid={onAskPaid}
      onToggleDetails={() => setDetailsOpen((v) => !v)}
      detailsOpen={detailsOpen}
    >
      {detailsOpen && (
        <InvoiceItemDetails item={item} state={state} onChange={onChange} onAskPaid={onAskPaid} />
      )}
    </InvoiceItemCard>
  );
}