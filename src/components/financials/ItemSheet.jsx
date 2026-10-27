import React, { useState } from 'react';
import { AlertTriangle, Calculator, Check, Eye, FilePlus2, Pencil, Trash2, Undo2, Unlock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import {
  canRequestFromReferrer, canRequestInvoice, formatInvoiceDay, invoicePartyName, isInvoiceDocument,
  isRecommendedItem, itemDateWord,
} from '@/components/shared/invoiceChecklist';
import { referrerReminderDue } from '@/components/claims/financials/referrerRequest';
import { isVatExcessItem } from '@/components/claims/financials/vatExcessReview';
import InvoiceCalculation from '@/components/claims/financials/InvoiceCalculation';
import InvoiceItemDetails from '@/components/claims/InvoiceItemDetails';
import AddressedToClientOption from '@/components/claims/financials/AddressedToClientOption';
import DocumentPreview from '@/components/shared/DocumentPreview';
import { itemLight } from '@/components/shared/trafficLight';
import LightDot from '@/components/shared/LightDot';
import LightPill from '@/components/shared/LightPill';
import { MacButton, MacDangerButton, MacPrimaryButton } from './MacButtons';
import { MacGroup, MacRow, MacValueRow } from './MacGroup';
import MacSheet from './MacSheet';

/**
 * Everything about one document or invoice in one sheet: the copy on the left, its
 * figures and its checks on the right, and every action it offers along the bottom
 * as a button — nothing is left behind a menu. No rule is worked out here: the row's
 * own state comes in, and every action is the one the invoice rules already had.
 */
export default function ItemSheet({
  item, state, files = [], claim, hold, isUploading,
  onClose, onPickUpload, onRemoveFile, onRenameFile, onViewFile,
  onRequest, onRequestReferrer, onUndoRequest, onAskPaid, onChange,
  onIssueOrder,
}) {
  const [showCalc, setShowCalc] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [naOpen, setNaOpen] = useState(false);
  const [naReason, setNaReason] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const isDocument = isInvoiceDocument(item);
  const party = invoicePartyName(claim, item);
  const light = itemLight(item, state);
  const file = files[0] || null;
  const canAsk = canRequestInvoice(item) && !state.paid && !state.date;
  // A referrer's own invoice is asked for from the referrer rather than from
  // accounts, under the same rule: the fee in the request is worked out from the job
  // figures, so nothing is asked for until they have been checked.
  const canAskReferrer = canRequestFromReferrer(item) && !!onRequestReferrer && !state.paid && !state.date;
  // The chase goes out once the request is past its own threshold and nothing has
  // come in against it.
  const reminderDue = canAskReferrer && referrerReminderDue(state);
  const canMarkPaid = !state.paid && !state.notApplicable && !state.awaiting && (!!state.date || state.requested);
  const dateLabel = state.date ? itemDateWord(item) : '';
  // A document the system issues itself — the Final Purchase Order on a job the
  // customer is paying for privately. There is no copy to upload and no figures to
  // type: the order is generated, and what it says is shown here.
  const isOrder = item.generatedBy === 'purchase_order';
  const order = isOrder ? (state.purchaseOrder || null) : null;

  const unlock = () => onChange(
    { amount: null },
    `${item.label} amount unlocked — follows the calculated figure again`
  );

  const notApplicable = () => onChange(
    { not_applicable: !state.notApplicable },
    `${item.label} marked as ${state.notApplicable ? 'applicable again' : 'not applicable'}`
  );

  const saveNotAvailable = () => {
    const reason = naReason.trim();
    setNaOpen(false);
    setNaReason('');
    if (!reason) return;
    onChange({ not_applicable: true, not_applicable_reason: reason }, `${item.label} not available — ${reason}`);
  };

  const primary = isOrder
    ? (order?.file_url
      ? { label: 'Open order', run: () => onViewFile(order.file_url) }
      : { label: 'Issue purchase order', run: onIssueOrder })
    : !file
      ? { label: 'Upload', run: () => onPickUpload(item) }
      : (canAsk && !state.requested)
        ? { label: 'Request from accounts', run: () => onRequest(item, state), disabled: !!hold, title: hold }
        : canMarkPaid
          ? { label: 'Mark paid', run: () => onAskPaid('paid') }
          : null;

  const actions = [];
  if (isOrder) {
    if (order?.file_url) actions.push({ label: 'Open the PDF', icon: Eye, run: () => onViewFile(order.file_url) });
    actions.push({
      label: order ? 'Issue a revised order' : 'Issue the order',
      icon: FilePlus2,
      run: onIssueOrder,
    });
  }
  if (!isOrder && file) actions.push({ label: 'View', icon: Eye, run: () => onViewFile(file.file_url) });
  if (!isOrder && primary && primary.label !== 'Upload') actions.push({ label: 'Upload a copy', icon: FilePlus2, run: () => onPickUpload(item) });
  if (!isOrder && canAsk && primary?.label !== 'Request from accounts') {
    actions.push({
      label: state.requested ? 'Request again' : 'Request from accounts',
      run: () => onRequest(item, state),
      disabled: !!hold,
      title: hold,
    });
  }
  if (!isOrder && canAskReferrer) {
    actions.push({
      label: state.requested ? 'Request invoice from referrer again' : 'Request invoice from referrer',
      run: () => onRequestReferrer(item, state),
      disabled: !!hold,
      title: hold,
    });
  }
  if (!isOrder && reminderDue) {
    actions.push({
      label: 'Send reminder',
      run: () => onRequestReferrer(item, state, 'reminder'),
      disabled: !!hold,
      title: hold,
    });
  }
  if (!isOrder && canMarkPaid && primary?.label !== 'Mark paid') actions.push({ label: 'Mark paid', run: () => onAskPaid('paid') });
  if (!isOrder && state.paid) {
    actions.push({ label: 'Change paid date', run: () => onAskPaid('correct') });
    actions.push({ label: 'Mark unpaid', icon: Undo2, run: () => onAskPaid('unpaid') });
  }
  if (!isOrder && state.requested && onUndoRequest) actions.push({ label: 'Undo request', icon: Undo2, run: onUndoRequest });
  if (!isOrder && state.locked) actions.push({ label: 'Unlock amount', icon: Unlock, run: unlock });
  if (!isOrder && !isDocument) {
    actions.push({ label: showCalc ? 'Hide calculation' : 'Show calculation', icon: Calculator, run: () => setShowCalc((v) => !v) });
    actions.push({ label: detailsOpen ? 'Hide figures & dates' : 'Figures & dates', icon: Pencil, run: () => setDetailsOpen((v) => !v) });
  }
  if (isOrder) {
    // Nothing to switch off: the order applies to every job the customer is paying
    // for privately, and it is the only thing authorising the repair.
  } else if (isRecommendedItem(item)) {
    if (state.notApplicable) {
      actions.push({
        label: 'Mark as needed',
        icon: Check,
        run: () => onChange({ not_applicable: false, not_applicable_reason: '' }, `${item.label} needed again`),
      });
    } else {
      actions.push({ label: 'Not available', run: () => { setNaReason(state.notApplicableReason || ''); setNaOpen(true); } });
    }
  } else {
    actions.push({ label: state.notApplicable ? 'Mark as applicable' : 'Mark not applicable', run: notApplicable });
  }
  if (file) actions.push({ label: 'Remove', icon: Trash2, danger: true, run: () => onRemoveFile(file) });

  return (
    <MacSheet
      title={item.label}
      subtitle={party ? `${item.direction === 'out' ? 'To' : 'From'} ${party}` : ''}
      onClose={onClose}
      footer={(
        <>
          {actions.map((action) => {
            const Btn = action.danger ? MacDangerButton : MacButton;
            return (
              <Btn
                key={action.label}
                onClick={action.run}
                disabled={action.disabled || isUploading}
                title={action.title}
              >
                {action.label}
              </Btn>
            );
          })}
          {primary && (
            <MacPrimaryButton onClick={primary.run} disabled={primary.disabled} title={primary.title}>
              {primary.label}
            </MacPrimaryButton>
          )}
          <MacButton onClick={onClose}>Done</MacButton>
        </>
      )}
    >
      <div className="flex min-h-[180px] flex-col border-b border-mac-line bg-mac-window md:border-b-0 md:border-r">
        <DocumentPreview fileUrl={file?.file_url} />
      </div>

      <div className="min-h-0 space-y-3 overflow-y-auto p-4 md:flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <LightDot lightKey={light.key} />
            <LightPill lightKey={light.key}>{light.label}</LightPill>
          </span>
          {(!isDocument || isOrder) && !state.awaiting && state.amount > 0 && (
            <span className="text-[15px] font-semibold tabular-nums text-foreground">{fmtGBP(state.amount)}</span>
          )}
        </div>

        {state.variance && (
          <p className="flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-px h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.5} />
            <span className="flex-1">
              {state.variance.text}
              {item.direction !== 'in' && '. Raise a supplementary invoice or credit note, or unlock the amount.'}
            </span>
            <MacButton onClick={unlock}>Unlock amount</MacButton>
          </p>
        )}

        {state.awaitingCorrected && (
          <p className="text-[11px] text-mac-muted">
            Awaiting a corrected invoice — invoiced {fmtGBP(state.reinvoice?.invoice_total || 0)} against{' '}
            {fmtGBP(state.reinvoice?.authority_amount || 0)}.
          </p>
        )}

        <MacGroup>
          {party && <MacValueRow label={item.direction === 'out' ? 'To' : 'From'} value={party} />}
          {isOrder && (
            <>
              <MacValueRow
                label="Order"
                value={order?.number || 'Not issued yet'}
                caption={order?.superseded ? 'Superseded by the order issued after it' : undefined}
              />
              <MacValueRow label="Ex VAT" value={fmtGBP(state.ex)} />
              <MacValueRow label="VAT (20%)" value={fmtGBP(state.vat)} />
              <MacValueRow label="Total inc VAT" value={fmtGBP(state.total)} />
            </>
          )}
          {!isDocument && (
            <MacValueRow
              label="Amount"
              value={state.awaiting ? '—' : fmtGBP(state.amount)}
              sub={state.awaiting ? undefined : (isVatExcessItem(item)
                ? `Excess ${fmtGBP(state.ex)} + ${fmtGBP(state.vat)} VAT on repair`
                : `${fmtGBP(state.ex)} + ${fmtGBP(state.vat)} VAT`)}
              caption={state.locked ? `Locked at ${fmtGBP(state.amount)} — the figure it went out at` : undefined}
            />
          )}
          {dateLabel && <MacValueRow label={dateLabel} value={formatInvoiceDay(state.date)} />}
          {state.requested && state.requestedAt && (
            <MacValueRow
              label={state.requestedFrom === 'referrer' ? 'Requested from referrer' : 'Requested from accounts'}
              value={formatInvoiceDay(state.requestedAt)}
            />
          )}
          {state.reminderAt && <MacValueRow label="Reminder sent" value={formatInvoiceDay(state.reminderAt)} />}
          {state.paid && (
            <MacValueRow
              label="Paid"
              value={state.paidDate ? formatInvoiceDay(state.paidDate) : 'Yes'}
              caption={state.paidBy ? `Recorded by ${state.paidBy}` : undefined}
            />
          )}
          {state.notApplicable && <MacValueRow label="Not applicable" value={state.notApplicableReason || 'Yes'} />}
          {state.keptDetailsWithoutCopy && !state.paid && (
            <MacValueRow label="Copy" value="Details recorded, copy not attached" />
          )}
        </MacGroup>

        <AddressedToClientOption item={item} claim={claim} onChange={onChange} />

        {showCalc && <InvoiceCalculation state={state} />}

        {detailsOpen && <InvoiceItemDetails item={item} state={state} onChange={onChange} onAskPaid={onAskPaid} />}

        <MacGroup title={isOrder ? 'Order PDF' : files.length === 1 ? 'File' : `Files (${files.length})`}>
          {isOrder ? (
            <MacRow className="gap-2">
              {order?.file_url ? (
                <>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                    {order.file_name || `${order.number}.pdf`}
                  </span>
                  <MacButton onClick={() => onViewFile(order.file_url)}>Open</MacButton>
                </>
              ) : (
                <span className="text-[11px] text-mac-muted">
                  No order issued yet — the PDF is generated against the job's figure.
                </span>
              )}
            </MacRow>
          ) : files.length === 0 ? (
            <MacRow>
              <span className="text-[11px] text-mac-muted">
                {isDocument ? 'No copy attached yet.' : 'No copy attached yet — upload one and the figures are read off it.'}
              </span>
            </MacRow>
          ) : files.map((doc) => {
            const name = doc.file_name || doc.file_url.split('/').pop();
            const renaming = renamingId === doc.id;
            return (
              <MacRow key={doc.id} className="gap-2">
                <span className="min-w-0 flex-1">
                  {renaming ? (
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      autoFocus
                      className="h-7 text-[12px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { onRenameFile(doc, renameValue.trim() || name); setRenamingId(null); }
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                    />
                  ) : (
                    <span className="block truncate text-[13px] text-foreground">{name}</span>
                  )}
                  {doc.uploaded_at && (
                    <span className="mt-0.5 block text-[11px] text-mac-muted">Uploaded {formatInvoiceDay(doc.uploaded_at)}</span>
                  )}
                </span>
                {renaming ? (
                  <>
                    <MacButton onClick={() => { onRenameFile(doc, renameValue.trim() || name); setRenamingId(null); }}>Save</MacButton>
                    <MacButton onClick={() => setRenamingId(null)}>Cancel</MacButton>
                  </>
                ) : (
                  <>
                    <MacButton onClick={() => onViewFile(doc.file_url)}>View</MacButton>
                    <MacButton onClick={() => { setRenameValue(name); setRenamingId(doc.id); }}>Rename</MacButton>
                    <MacDangerButton onClick={() => onRemoveFile(doc)}>Remove</MacDangerButton>
                  </>
                )}
              </MacRow>
            );
          })}
        </MacGroup>

        {naOpen && (
          <div className="space-y-1.5">
            <p className="text-[11px] text-mac-muted">Why is there no {item.label}?</p>
            <div className="flex items-center gap-1.5">
              <Input
                value={naReason}
                onChange={(e) => setNaReason(e.target.value)}
                autoFocus
                placeholder="Short reason"
                className="h-7 text-[12px]"
              />
              <MacPrimaryButton disabled={!naReason.trim()} onClick={saveNotAvailable}>Save</MacPrimaryButton>
              <MacButton onClick={() => setNaOpen(false)}>Cancel</MacButton>
            </div>
          </div>
        )}
      </div>
    </MacSheet>
  );
}