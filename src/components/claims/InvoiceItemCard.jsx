import React, { useRef, useState } from 'react';
import {
  Check, X, Ban, Clock, Pencil, AlertTriangle, Undo2, Unlock,
  SlidersHorizontal, Hourglass,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import ItemActionMenu, { ActionRow, ActionDivider } from '@/components/shared/ItemActionMenu';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { TRACKER_TONES } from './trackerTones';
import { isInvoiceDocument, isRecommendedItem } from '@/components/shared/invoiceChecklist';

// The status button of one invoice: a light button edged in its status colour —
// red until it has been raised or received, amber while it waits to be paid or
// has just been requested from accounts, green once it is paid, grey while a
// credit repair amount cannot be worked out. Clicking it opens the invoice's
// action menu: the copy on file at the top, the figures and everything else the
// invoice offers underneath.
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

export function invoiceToneKey(item, state, step) {
  if (state.notApplicable) return 'faded';
  if (state.awaiting) return 'neutral';
  // A close-out document only goes green once its copy is on file: a date
  // recorded on its own is amber.
  if (isInvoiceDocument(item)) {
    // A copy waiting to be replaced by a corrected one stays amber.
    if (state.awaitingCorrected) return 'warning';
    if (state.received) return 'positive';
    // A recommended document is nudged in amber, never red: nothing is late,
    // there is simply something else worth collecting.
    if (isRecommendedItem(item)) return 'warning';
    return state.dateRecordedNoCopy ? 'warning' : 'negative';
  }
  // An invoice's colour follows the step it is shown in: in the raise and collect
  // steps it is green once its copy is attached — sent or received — and amber
  // only while it is still to be raised or received; in the payments step it
  // stays amber until it is marked paid, then green.
  if (step === 'send' || step === 'pay') {
    return (step === 'pay' ? state.paid : state.copyAttached) ? 'positive' : 'warning';
  }
  if (state.paid) return 'positive';
  if (state.date || state.requested || state.amount > 0) return 'warning';
  return 'negative';
}

export function invoiceStatusLabel(item, state) {
  if (state.notApplicable) return 'not applicable';
  if (state.awaiting) return 'awaiting figures';
  if (isInvoiceDocument(item)) {
    if (state.awaitingCorrected) return 'awaiting corrected invoice';
    if (state.received) return item.direction === 'in' ? 'received' : 'sent';
    if (isRecommendedItem(item)) return 'recommended';
    return state.dateRecordedNoCopy ? 'date recorded, copy not attached' : 'outstanding';
  }
  if (state.paid) return state.copyAttached ? 'paid' : 'paid · copy still needed';
  if (state.requested && !state.date) return 'requested';
  if (state.date) return item.direction === 'in' ? 'received' : 'sent';
  return 'outstanding';
}

export default function InvoiceItemCard({
  item, state, step, files, isUploading,
  onChange, onUpload, onDeleteFile, onRenameFile, onViewFile,
  onToggleDetails, detailsOpen, onUndoRequest, amountText, onAskPaid, children,
}) {
  const fileInputRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [naReasonOpen, setNaReasonOpen] = useState(false);
  const [naReason, setNaReason] = useState('');

  const isDocument = isInvoiceDocument(item);
  const dateLabel = item.dateLabel || (item.direction === 'in' ? 'Received' : 'Sent');
  const toneKey = invoiceToneKey(item, state, step);
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
      : isDocument ? (state.awaitingCorrected
        ? `Awaiting a corrected invoice — invoiced ${fmtGBP(state.reinvoice?.invoice_total || 0)} against ${fmtGBP(state.reinvoice?.authority_amount || 0)}`
        : (state.received && state.date ? `${dateLabel} ${formatDay(state.date)}` : ''))
        : state.paid ? (state.copyAttached
          // A payment is tracked whether or not the copy has landed: where it has
          // not, the card says so rather than hiding the missing piece of paper.
          ? (state.paidDate ? `Paid ${formatDay(state.paidDate)}` : 'Paid')
          : 'Paid · copy still needed')
          : state.requested && !state.date ? `Requested ${formatDay(state.requestedAt)}`
            : state.date ? `${dateLabel} ${formatDay(state.date)}`
              : '';

  const hint = state.notApplicable
    ? `${offText} — open the menu to change it`
    : state.awaiting ? (state.hint || 'No amount can be worked out yet')
      : isDocument
        ? 'No copy attached yet'
        : 'No copy attached yet — upload one and the figures are read off it';

  const pickFile = () => fileInputRef.current?.click();
  const menuFiles = files.map((doc) => ({
    id: doc.id,
    name: doc.file_name || doc.file_url.split('/').pop(),
    onOpen: () => onViewFile(doc.file_url),
    onRename: (name) => onRenameFile(doc, name),
    onRemove: () => onDeleteFile(doc),
  }));

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

  const button = (
    <button
      type="button"
      className="flex items-start gap-2 flex-1 min-w-0 px-2.5 py-2 text-left"
    >
      <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${tone.iconWrap}`}>
        {GLYPHS[toneKey]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-foreground truncate">{item.label}</span>
        <span className="block text-[10px] text-muted-foreground truncate">{subline || statusLabel}</span>
        {state.keptDetailsWithoutCopy && !state.paid && (
          <span className="block text-[10px] font-normal text-amber-700 dark:text-amber-300 truncate">
            Details recorded, copy not attached
          </span>
        )}
      </span>
    </button>
  );

  const tooltip = (
    <>
      <p className="text-[11px] font-semibold mb-1">
        {item.label}{state.amount > 0 ? ` · ${fmtGBP(state.amount)}` : ''}
      </p>
      <p className="text-[10px] opacity-80 capitalize">{statusLabel}</p>
      {state.keptDetailsWithoutCopy && !state.paid && (
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
          {state.variance.text}
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
    </>
  );

  return (
    <div className="group h-full">
      <div className={`h-full rounded-[10px] border border-l-4 transition-all ${isUploading ? 'opacity-60' : ''} ${tone.card}`}>
        <div className="flex items-stretch min-h-[44px]">
          <ItemActionMenu
            open={menuOpen}
            onOpenChange={setMenuOpen}
            button={button}
            tooltip={tooltip}
            title={item.label}
            files={menuFiles}
            onUpload={pickFile}
            onAddFile={pickFile}
          >
            {(close) => (
              <>
                <ActionDivider />
                <ActionRow
                  icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                  label={detailsOpen ? 'Hide the figures' : 'Figures, dates & paid'}
                  onClick={() => { close(); onToggleDetails?.(); }}
                />

                {!isDocument && (
                  <>
                    <ActionDivider />
                    {state.paid && (
                      <ActionRow
                        icon={<Pencil className="w-3.5 h-3.5" />}
                        label={state.paidDate ? 'Change paid date' : 'Set paid date'}
                        onClick={() => { close(); askPaid('correct'); }}
                      />
                    )}
                    <ActionRow
                      icon={state.paid ? <Undo2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                      label={state.paid ? 'Mark unpaid' : 'Mark paid'}
                      onClick={() => { close(); askPaid(state.paid ? 'unpaid' : 'paid'); }}
                    />
                  </>
                )}

                {state.requested && onUndoRequest && (
                  <ActionRow
                    icon={<Undo2 className="w-3.5 h-3.5" />}
                    label={state.requestedFrom === 'referrer' ? 'Undo referrer request' : 'Undo accounts request'}
                    onClick={() => { close(); onUndoRequest(); }}
                  />
                )}

                <ActionDivider />
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
                          type="button"
                          onClick={saveNotAvailable}
                          disabled={!naReason.trim()}
                          className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNaReasonOpen(false)}
                          className="p-1 text-muted-foreground hover:bg-muted rounded"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <ActionRow
                        icon={<Ban className="w-3.5 h-3.5" />}
                        label="Not available"
                        onClick={() => {
                          setNaReason(state.notApplicableReason || '');
                          setNaReasonOpen(true);
                        }}
                      />
                      {state.notApplicable && (
                        <ActionRow
                          icon={<Check className="w-3.5 h-3.5" />}
                          label="Mark as needed"
                          onClick={() => {
                            close();
                            onChange(
                              { not_applicable: false, not_applicable_reason: '' },
                              `${item.label} needed again`
                            );
                          }}
                        />
                      )}
                    </>
                  )
                ) : (
                  <ActionRow
                    icon={state.notApplicable ? <Check className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                    label={state.notApplicable ? 'Mark as applicable' : 'Mark not applicable'}
                    onClick={() => {
                      close();
                      onChange(
                        { not_applicable: !state.notApplicable },
                        `${item.label} marked as ${state.notApplicable ? 'applicable again' : 'not applicable'}`
                      );
                    }}
                  />
                )}

                {state.locked && (
                  <ActionRow
                    icon={<Unlock className="w-3.5 h-3.5" />}
                    label="Unlock amount"
                    onClick={() => {
                      close();
                      onChange(
                        { amount: null },
                        `${item.label} amount unlocked — follows the calculated figure again`
                      );
                    }}
                  />
                )}

                {state.variance && (
                  <p className="flex items-start gap-1.5 px-2 py-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" />
                    <span>{state.variance.text}.</span>
                  </p>
                )}
              </>
            )}
          </ItemActionMenu>

          <div className="flex items-center pr-1.5">
            {amountText && (
              <span className="self-center pr-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground whitespace-nowrap">
                {amountText}
              </span>
            )}
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