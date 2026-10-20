import React, { useState } from 'react';
import InvoiceItemCard from '../InvoiceItemCard';
import InvoiceItemDetails from '../InvoiceItemDetails';

/**
 * One of the close-out items — the Final Invoice, Final Authority or Collection
 * Note — as a single card matching the invoice cards: the status button with
 * everything else in the same box behind its own ⋮ menu. All three are documents
 * we collect: a copy on file is what marks them done, and the dates and the file
 * itself are looked after from here.
 */
export default function CloseOutItem({
  item, state, files, isUploading,
  onChange, onUpload, onDeleteFile, onRenameFile, onViewFile,
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
      onToggleDetails={() => setDetailsOpen((v) => !v)}
      detailsOpen={detailsOpen}
    >
      {detailsOpen && <InvoiceItemDetails item={item} state={state} onChange={onChange} />}
    </InvoiceItemCard>
  );
}