import React, { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Pencil, Check, X, MoreVertical, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { INVOICE_STATUS_META, invoiceItemStatus } from '@/components/shared/invoiceChecklist';
import { fmtGBP } from '@/components/shared/creditRepairRates';

/**
 * A single line in the Invoicing Tracker — an invoice (amount, received/sent
 * date, paid state and its files) or a close-out document, which only ever has a
 * date and a file.
 */
export default function InvoiceItemCard({
  item, state, files, isUploading,
  onChange, onUpload, onDeleteFile, onRenameFile, onViewFile,
}) {
  const [amountDraft, setAmountDraft] = useState(state.amount ? String(state.amount) : '');
  const [dateDraft, setDateDraft] = useState(state.date || '');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { setAmountDraft(state.amount ? String(state.amount) : ''); }, [state.amount]);
  useEffect(() => { setDateDraft(state.date || ''); }, [state.date]);

  const status = invoiceItemStatus(item, state);
  const meta = INVOICE_STATUS_META[status];
  const isOutstanding = status === 'outstanding';
  const dateLabel = item.dateLabel || (item.direction === 'in' ? 'Received' : 'Sent');
  // Close-out paperwork is a document, not an invoice: no amount, no paid tick.
  const isDocument = item.kind === 'document';
  // Credit repair invoices have their amount worked out from the claim's locked
  // rates, so it is shown rather than typed in.
  const isDerived = !!item.amountSource;

  const commitAmount = () => {
    const current = state.amount ? String(state.amount) : '';
    if (amountDraft === current) return;
    onChange(
      { amount: amountDraft === '' ? null : amountDraft },
      `${item.label} amount ${amountDraft === '' ? 'cleared' : `set to £${amountDraft}`}`
    );
  };

  const commitDate = () => {
    if (dateDraft === (state.date || '')) return;
    onChange(
      { date: dateDraft },
      `${item.label} ${dateLabel.toLowerCase()} date ${dateDraft ? `set to ${dateDraft}` : 'cleared'}`
    );
  };

  const uploadButton = (
    <div className={isDocument ? 'pb-0.5' : 'ml-auto'}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) onUpload(item, e.target.files); e.target.value = ''; }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors disabled:opacity-50"
      >
        <Upload className="w-3 h-3" /> Upload
      </button>
    </div>
  );

  return (
    <div className={`rounded-[10px] border bg-card overflow-hidden ${state.notApplicable
      ? 'border-border opacity-60'
      : isOutstanding
        ? 'border-amber-300 dark:border-amber-800'
        : 'border-border'}`}>
      <div className="px-3 pt-2 pb-2 space-y-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${meta.dot}`} />
          <span className="text-sm font-medium leading-snug break-words min-w-0 flex-1">{item.label}</span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${meta.bg} ${meta.text}`}>
            {meta.label}
          </span>
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-6 z-50 w-44 rounded-md border border-border bg-popover shadow-lg py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onChange(
                        { not_applicable: !state.notApplicable },
                        `${item.label} marked as ${state.notApplicable ? 'applicable again' : 'not applicable'}`
                      );
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    {state.notApplicable ? 'Mark as applicable' : 'Mark not applicable'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {isDocument ? (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">{dateLabel}</label>
              <Input
                type="date"
                value={dateDraft}
                onChange={(e) => setDateDraft(e.target.value)}
                onBlur={commitDate}
                className="h-8 text-sm"
              />
            </div>
            {uploadButton}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Amount (£)</label>
                {isDerived ? (
                  <div className={`h-8 flex items-center px-2 rounded-md border border-dashed text-sm tabular-nums ${state.awaiting ? 'border-amber-300 dark:border-amber-800 text-muted-foreground' : 'border-border bg-muted/40 font-medium'}`}>
                    {state.awaiting ? '—' : fmtGBP(state.amount)}
                  </div>
                ) : (
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amountDraft}
                    onChange={(e) => setAmountDraft(e.target.value)}
                    onBlur={commitAmount}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    className="h-8 text-sm"
                  />
                )}
              </div>
              <div>
                <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">{dateLabel}</label>
                <Input
                  type="date"
                  value={dateDraft}
                  onChange={(e) => setDateDraft(e.target.value)}
                  onBlur={commitDate}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            {isDerived && state.hint && (
              <p className={`text-[10px] leading-tight ${state.awaiting ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground'}`}>
                {state.hint}
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <label className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.paid}
                  onChange={(e) => onChange(
                    { paid: e.target.checked },
                    `${item.label} marked as ${e.target.checked ? 'paid' : 'unpaid'}`
                  )}
                  className="rounded border-border"
                />
                Paid
              </label>
              {state.paid && (
                <Input
                  type="date"
                  value={state.paidDate || ''}
                  onChange={(e) => onChange({ paid: true, paid_date: e.target.value }, `${item.label} paid date set`)}
                  className="h-7 text-xs w-[132px]"
                  title="Paid date"
                />
              )}
              {uploadButton}
            </div>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="px-3 pb-2 pt-1.5 space-y-1 border-t border-border/60">
          {files.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2 group rounded-md px-1.5 py-1 hover:bg-muted/50">
              <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              {renamingId === doc.id ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { onRenameFile(doc, renameValue); setRenamingId(null); }
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    autoFocus
                    className="h-6 text-xs"
                  />
                  <button type="button" onClick={() => { onRenameFile(doc, renameValue); setRenamingId(null); }} className="p-0.5 text-green-600"><Check className="w-3 h-3" /></button>
                  <button type="button" onClick={() => setRenamingId(null)} className="p-0.5 text-gray-400"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onViewFile(doc.file_url)}
                  className="text-xs text-primary hover:underline truncate flex-1 text-left"
                >
                  {doc.file_name || doc.file_url.split('/').pop()}
                </button>
              )}
              {renamingId !== doc.id && (
                <div className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => { setRenamingId(doc.id); setRenameValue(doc.file_name || ''); }} className="p-0.5 text-gray-400 hover:text-primary" title="Rename"><Pencil className="w-3 h-3" /></button>
                  <button type="button" onClick={() => onDeleteFile(doc)} className="p-0.5 text-gray-400 hover:text-red-500" title="Remove"><Trash2 className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}