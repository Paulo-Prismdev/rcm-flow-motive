import React, { useRef, useState } from 'react';
import {
  Check, X, Ban, Clock, MoreVertical, Upload, Pencil, Trash2,
  AlertTriangle, Undo2, Unlock, SlidersHorizontal, Hourglass,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { TRACKER_TONES } from './trackerTones';
import { isInvoiceDocument, isRecommendedItem } from '@/components/shared/invoiceChecklist';

// The status button of one invoice: a light button edged in its status colour —
// red until it has been raised or received, amber while it waits to be paid or
// has just been requested from accounts, green once it is paid, grey while a
// credit repair amount cannot be worked out. Each invoice keeps everything else
// inside this same card, with the figures behind the discreet ⋮ menu.
const GLYPHS = {
  positive: <Check className="w-3 h-3" strokeWidth={3} />,
  warning: <Clock className="w-3 h-3" strokeWidth={3} />,
  negative: <X className="w-3 h-3" strokeWidth={3} />,
  neutral: <Hourglass className="w-3 h-3" />,
  faded: <Ban className="w-3 h-3" />,
};

const formatDay = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function invoiceToneKey(item, state) {
  if (state.notApplicable) return 'faded';
  if (state.awaiting) return 'neutral';
  // A close-out document only goes green once its copy is on file: a date
  // recorded on its own is amber.
  if (isInvoiceDocument(item)) {
    if (state.received) return 'positive';
    // A recommended document is nudged in amber, never red: nothing is late,
    // there is simply something else worth collecting.
    if (isRecommendedItem(item)) return 'warning';
    return state.dateRecordedNoCopy ? 'warning' : 'negative';
  }
  if (state.paid) return 'positive';
  if (state.date || state.requested || state.amount > 0) return 'warning';
  return 'negative';
}

export function invoiceStatusLabel(item, state) {
  if (state.notApplicable) return 'not applicable';
  if (state.awaiting) return 'awaiting figures';
  if (isInvoiceDocument(item)) {
    if (state.received) return item.direction === 'in' ? 'received' : 'sent';
    if (isRecommendedItem(item)) return 'recommended';
    return state.dateRecordedNoCopy ? 'date recorded, copy not attached' : 'outstanding';
  }
  if (state.paid) return 'paid';
  if (state.requested && !state.date) return 'requested';
  if (state.date) return item.direction === 'in' ? 'received' : 'sent';
  return 'outstanding';
}

export default function InvoiceItemCard({
  item, state, files, isUploading,
  onChange, onUpload, onDeleteFile, onRenameFile, onViewFile,
  onToggleDetails, detailsOpen, onUndoRequest, amountText, onAskPaid, children,
}) {
  const fileInputRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [naReasonOpen, setNaReasonOpen] = useState(false);
  const [naReason, setNaReason] = useState('');

  const isDocument = isInvoiceDocument(item);
  const dateLabel = item.dateLabel || (item.direction === 'in' ? 'Received' : 'Sent');
  const toneKey = invoiceToneKey(item, state);
  const tone = TRACKER_TONES[toneKey];
  const statusLabel = invoiceStatusLabel(item, state);

  // What an item reads as once it has been switched off: a recommended one is
  // "not available", with the reason it was given; a required one "not applicable".
  const offText = !state.notApplicable ? ''
    : isRecommendedItem(item)
      ? `Not available${state.notApplicableReason ? ` — ${state.notApplicableReason}` : ''}`
      : 'Not applicable';

  const subline = state.notApplicable ? offText
    : state.awaiting ? ''
      : isDocument ? (state.received && state.date ? `${dateLabel} ${formatDay(state.date)}` : '')
        : state.paid ? (state.paidDate ? `Paid ${formatDay(state.paidDate)}` : 'Paid')
          : state.requested && !state.date ? `Requested ${formatDay(state.requestedAt)}`
            : state.date ? `${dateLabel} ${formatDay(state.date)}`
              : '';

  const hint = state.notApplicable
    ? `${offText} — use ⋮ to change`
    : state.awaiting ? (state.hint || 'No amount can be worked out yet')
      : files.length === 0
        ? (isDocument ? 'Click to upload this document' : "Click to upload it — we'll read the figures off it")
        : files.length === 1 ? 'Click to open the document' : 'Click to choose a document';

  // Nothing filed yet: the click uploads it. Once a file is there, the click
  // opens the document — the figures are corrected from the ⋮ menu.
  const handleCardClick = () => {
    if (isUploading) return;
    if (state.notApplicable) { setMenuOpen(true); return; }
    if (files.length === 1) { onViewFile(files[0].file_url); return; }
    if (files.length > 1) { setMenuOpen(true); return; }
    fileInputRef.current?.click();
  };

  const submitRename = (doc) => {
    const name = renameValue.trim();
    setRenamingId(null);
    if (name && name !== doc.file_name) onRenameFile(doc, name);
  };

  /**
   * Stops the nudge on a recommended item that won't be coming, recording the
   * short reason against it — which also goes into the claim's activity history.
   */
  const saveNotAvailable = () => {
    const reason = naReason.trim();
    setNaReasonOpen(false);
    setNaReason('');
    if (!reason) return;
    onChange(
      { not_applicable: true, not_applicable_reason: reason },
      `${item.label} not available — ${reason}`
    );
  };

  /** Marking paid, changing the paid date and marking unpaid all ask for the date first. */
  const askPaid = (mode) => onAskPaid?.(mode);

  return (
    <div className="group h-full">
      <div className={`h-full rounded-[10px] border border-l-4 transition-all ${isUploading ? 'opacity-60' : ''} ${tone.card}`}>
        <div className="flex items-stretch min-h-[44px]">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleCardClick}
              className="flex items-start gap-2 flex-1 min-w-0 px-2.5 py-2 text-left"
            >
              <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${tone.iconWrap}`}>
                {GLYPHS[toneKey]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-foreground truncate">{item.label}</span>
                <span className="block text-[10px] text-muted-foreground truncate">{subline || statusLabel}</span>
                {state.keptDetailsWithoutCopy && (
                  <span className="block text-[10px] font-normal text-amber-700 dark:text-amber-300 truncate">
                    Details recorded, copy not attached
                  </span>
                )}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" align="start" className="max-w-[300px] p-2.5">
            <p className="text-[11px] font-semibold mb-1">
              {item.label}{state.amount > 0 ? ` · ${fmtGBP(state.amount)}` : ''}
            </p>
            <p className="text-[10px] opacity-80 capitalize">{statusLabel}</p>
            {state.keptDetailsWithoutCopy && (
              <p className="text-[10px] opacity-90">Details recorded, copy not attached</p>
            )}
            {state.date && <p className="text-[10px] opacity-80">{dateLabel} {formatDay(state.date)}</p>}
            {state.requested && <p className="text-[10px] opacity-80">Requested {formatDay(state.requestedAt)}</p>}
            {state.paid && state.paidDate && (
              <p className="text-[10px] opacity-80">
                Paid {formatDay(state.paidDate)}{state.paidBy ? ` by ${state.paidBy}` : ''}
              </p>
            )}
            {state.variance && (
              <p className="text-[10px] opacity-90 pt-1 mt-1 border-t border-white/20">
                {state.variance.reason}: calculated {fmtGBP(state.variance.calculated)}, invoiced {fmtGBP(state.variance.invoiced)}
              </p>
            )}
            {files.length > 0 ? (
              <div className="space-y-1 pt-1 mt-1 border-t border-white/20">
                {files.map((doc) => (
                  <div key={doc.id}>
                    <p className="text-[11px] break-all leading-snug">{doc.file_name || doc.file_url.split('/').pop()}</p>
                    {doc.uploaded_at && <p className="text-[10px] opacity-70">Uploaded {formatDay(doc.uploaded_at)}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] opacity-80 pt-1 mt-1 border-t border-white/20">{hint}</p>
            )}
          </TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-0.5 pr-1.5">
          {amountText && (
            <span className="self-center pr-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground whitespace-nowrap">
              {amountText}
            </span>
          )}

          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="More actions"
                className={`p-1.5 rounded-md transition-opacity ${tone.menu} ${menuOpen ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'}`}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {files.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {files.length} file{files.length === 1 ? '' : 's'}
                  </DropdownMenuLabel>
                  {files.map((doc) => (
                    <div key={doc.id} className="rounded-md hover:bg-muted">
                      {renamingId === doc.id ? (
                        <div className="flex items-center gap-1 px-1.5 py-1">
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') submitRename(doc);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            autoFocus
                            className="h-7 text-xs"
                          />
                          <button onClick={() => submitRename(doc)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Save">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setRenamingId(null)} className="p-1 text-gray-400 hover:bg-muted rounded" title="Cancel">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 pl-2">
                          <button
                            onClick={() => { setMenuOpen(false); onViewFile(doc.file_url); }}
                            title={doc.file_name || doc.file_url.split('/').pop()}
                            className="flex-1 min-w-0 text-left text-xs py-1.5 truncate hover:text-primary"
                          >
                            {doc.file_name || doc.file_url.split('/').pop()}
                          </button>
                          <button
                            onClick={() => { setRenamingId(doc.id); setRenameValue(doc.file_name || ''); }}
                            className="p-1 text-gray-400 hover:text-primary rounded flex-shrink-0"
                            title="Rename"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => { setMenuOpen(false); onDeleteFile(doc); }}
                            className="p-1 text-gray-400 hover:text-red-500 rounded flex-shrink-0"
                            title="Remove"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem onSelect={() => fileInputRef.current?.click()} className="text-xs">
                <Upload className="w-3.5 h-3.5" /> Add file
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onToggleDetails?.()} className="text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5" /> {detailsOpen ? 'Hide the figures' : 'Figures, dates & paid'}
              </DropdownMenuItem>

              {!isDocument && (
                <>
                  <DropdownMenuSeparator />
                  {state.paid && (
                    <DropdownMenuItem onSelect={() => askPaid('correct')} className="text-xs">
                      <Pencil className="w-3.5 h-3.5" />
                      {state.paidDate ? 'Change paid date' : 'Set paid date'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => askPaid(state.paid ? 'unpaid' : 'paid')} className="text-xs">
                    {state.paid ? <Undo2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    {state.paid ? 'Mark unpaid' : 'Mark paid'}
                  </DropdownMenuItem>
                </>
              )}

              {state.requested && onUndoRequest && (
                <DropdownMenuItem onSelect={() => onUndoRequest()} className="text-xs">
                  <Undo2 className="w-3.5 h-3.5" /> Undo accounts request
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              {isRecommendedItem(item) ? (
                naReasonOpen ? (
                  <div className="space-y-1 px-1.5 py-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Why is there no {item.label}?
                    </p>
                    <div className="flex items-center gap-1">
                      <Input
                        value={naReason}
                        onChange={(e) => setNaReason(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') saveNotAvailable();
                          if (e.key === 'Escape') setNaReasonOpen(false);
                        }}
                        placeholder="Short reason"
                        autoFocus
                        className="h-7 text-xs"
                      />
                      <button
                        onClick={saveNotAvailable}
                        disabled={!naReason.trim()}
                        className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setNaReasonOpen(false)} className="p-1 text-gray-400 hover:bg-muted rounded" title="Cancel">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setNaReason(state.notApplicableReason || '');
                        setNaReasonOpen(true);
                      }}
                      className="text-xs"
                    >
                      <Ban className="w-3.5 h-3.5" /> Not available
                    </DropdownMenuItem>
                    {state.notApplicable && (
                      <DropdownMenuItem
                        onSelect={() => onChange(
                          { not_applicable: false, not_applicable_reason: '' },
                          `${item.label} needed again`
                        )}
                        className="text-xs"
                      >
                        <Check className="w-3.5 h-3.5" /> Mark as needed
                      </DropdownMenuItem>
                    )}
                  </>
                )
              ) : (
                <DropdownMenuItem
                  onSelect={() => onChange(
                    { not_applicable: !state.notApplicable },
                    `${item.label} marked as ${state.notApplicable ? 'applicable again' : 'not applicable'}`
                  )}
                  className="text-xs"
                >
                  {state.notApplicable ? <Check className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                  {state.notApplicable ? 'Mark as applicable' : 'Mark not applicable'}
                </DropdownMenuItem>
              )}

              {state.locked && (
                <DropdownMenuItem
                  onSelect={() => onChange(
                    { amount: null },
                    `${item.label} amount unlocked — follows the calculated figure again`
                  )}
                  className="text-xs"
                >
                  <Unlock className="w-3.5 h-3.5" /> Unlock amount
                </DropdownMenuItem>
              )}

              {state.variance && (
                <p className="flex items-start gap-1.5 px-2 py-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" />
                  <span>{state.variance.reason}.</span>
                </p>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        </div>

        {children && (
          <div className="space-y-1.5 border-t border-border/60 px-2.5 py-2">
            {children}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple={isDocument}
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) onUpload(item, e.target.files); e.target.value = ''; }}
        />
      </div>
    </div>
  );
}