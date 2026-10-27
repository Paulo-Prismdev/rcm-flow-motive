import React, { useState } from 'react';
import { AlertTriangle, Calculator, Send, Unlock } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { canRequestInvoice, invoicePartyName, isInvoiceDocument } from '@/components/shared/invoiceChecklist';
import InvoiceItemCard from '../InvoiceItemCard';
import InvoiceItemDetails from '../InvoiceItemDetails';
import InvoiceCalculation from './InvoiceCalculation';
import { FINAL_INVOICE_KEY } from './invoiceAuthorityCheck';

/**
 * One invoice, kept inside a single card: the status button, who it is to or
 * from, the amount split on one line and the invoice's own actions, all in the
 * same box rather than floating underneath it.
 */
export default function InvoiceRow({
  item, state, files, isUploading, claim, focus, requestHold,
  onChange, onUpload, onDeleteFile, onRenameFile, onViewFile, onRequest, onUndoRequest, onAskPaid,
}) {
  const [showCalc, setShowCalc] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const isDocument = isInvoiceDocument(item);
  const partyName = invoicePartyName(claim, item);
  // The guided flow keeps each action with the step it belongs to: raising and
  // collecting an invoice are the send steps' work, marking it paid is the
  // payments step's.
  const sendFocus = focus === 'send';
  const payFocus = focus === 'pay';
  // Accounts are asked for the invoices we raise, never for the Final Insurer
  // Invoice or
  // the close-out paperwork.
  const canAsk = canRequestInvoice(item) && !!onRequest && !state.paid && !state.date && !payFocus;
  // An invoice the job isn't ready to ask for yet — the partner's commission, before
  // the close-out step is settled — shows the action, held and saying why.
  const hold = requestHold || '';
  // The quick paid action belongs on an invoice that has gone out or come in, or
  // has at least been asked for from accounts, and is still waiting to be paid.
  // Its copy being on file is not what decides: a payment is tracked either way.
  const canMarkPaid = !state.paid && !state.notApplicable && !state.awaiting
    && (!!state.date || state.requested) && !sendFocus;
  const hasAmount = !state.awaiting && state.amount > 0;
  // An insurer's invoice written in the client's name at their request: the whole of
  // it counts as the insurer's share, and the row says so.
  const addressedEntry = item.key === FINAL_INVOICE_KEY
    ? ((claim?.invoice_tracker?.items || {})[item.key] || {})
    : {};
  const addressedToClient = !!addressedEntry.addressed_to_client;
  const addressedNote = addressedEntry.addressed_to_client_note || '';

  return (
    <InvoiceItemCard
      item={item}
      state={state}
      step={focus}
      files={files}
      isUploading={isUploading}
      onChange={onChange}
      onUpload={onUpload}
      onDeleteFile={onDeleteFile}
      onRenameFile={onRenameFile}
      onViewFile={onViewFile}
      onToggleDetails={() => setDetailsOpen((v) => !v)}
      detailsOpen={detailsOpen}
      onUndoRequest={onUndoRequest}
      onAskPaid={onAskPaid}
    >
      {partyName && (
        <p className="text-[11px] text-muted-foreground truncate">
          {item.direction === 'out' ? 'To' : 'From'}{' '}
          <span className="font-semibold text-foreground">{partyName}</span>
        </p>
      )}

      {addressedToClient && (
        <span
          title={addressedNote || undefined}
          className="inline-flex w-fit items-center rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
        >
          Addressed to client — insurer's invoice
        </span>
      )}

      {!isDocument && (
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {hasAmount ? (
            <>
              {fmtGBP(state.ex)} + {fmtGBP(state.vat)} VAT ={' '}
              <span className="text-xs font-bold text-foreground">{fmtGBP(state.amount)}</span>
            </>
          ) : (
            <span className="text-foreground">—</span>
          )}
          {state.adjusted && (
            <span className="ml-2 align-middle text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              Adjusted
            </span>
          )}
        </p>
      )}

      {/* Where the amount is a share of a figure read off another document — our
          part of a total loss storage charge — the sum is shown as it was worked
          out, rather than left behind the calculator. */}
      {!isDocument && state.calculation && (
        <p className="text-[10px] text-muted-foreground tabular-nums">{state.calculation}</p>
      )}

      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px]">
        {canMarkPaid && (
          <button
            type="button"
            onClick={() => onAskPaid?.('paid')}
            className="font-semibold text-amber-700 dark:text-amber-300 hover:underline"
          >
            Mark paid
          </button>
        )}
        {!isDocument && (
          <button
            type="button"
            onClick={() => setShowCalc((v) => !v)}
            className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Calculator className="w-3.5 h-3.5" /> {showCalc ? 'Hide calculation' : 'Show calculation'}
          </button>
        )}
        {canAsk && (
          <button
            type="button"
            disabled={state.awaiting || !!hold}
            title={hold || (state.awaiting ? (state.hint || 'The amount cannot be worked out yet') : 'Email accounts about this invoice')}
            onClick={() => onRequest(item, state)}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" /> {state.requested ? 'Request again' : 'Request from accounts'}
          </button>
        )}
      </div>

      {state.variance && (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          <span className="flex-1">
            {state.variance.text}
            {/* The advice belongs to our own invoices, whose figures moved after
                they went out; an invoice we received is simply what the other
                party billed, so it only reports the difference. */}
            {item.direction !== 'in' && '. Raise a supplementary invoice or credit note, or unlock the amount.'}
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

      {state.locked && !state.variance && (
        <p className="text-[10px] text-muted-foreground">
          Amount locked at {fmtGBP(state.amount)} — the figure this invoice went out at.
        </p>
      )}

      {showCalc && <InvoiceCalculation state={state} />}

      {detailsOpen && <InvoiceItemDetails item={item} state={state} onChange={onChange} onAskPaid={onAskPaid} />}
    </InvoiceItemCard>
  );
}