import React, { useState } from 'react';
import { AlertTriangle, Calculator, Send, Unlock } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { canRequestInvoice, invoicePartyName, isInvoiceDocument } from '@/components/shared/invoiceChecklist';
import InvoiceItemCard, { invoiceToneKey } from '../InvoiceItemCard';
import InvoiceItemDetails from '../InvoiceItemDetails';
import InvoiceCalculation from './InvoiceCalculation';

/**
 * One invoice, kept inside a single card: the status button, who it is to or
 * from, the amount split on one line and the invoice's own actions, all in the
 * same box rather than floating underneath it.
 */
export default function InvoiceRow({
  item, state, files, isUploading, claim,
  onChange, onUpload, onDeleteFile, onRenameFile, onViewFile, onRequest, onUndoRequest,
}) {
  const [showCalc, setShowCalc] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const isDocument = isInvoiceDocument(item);
  const partyName = invoicePartyName(claim, item);
  // Accounts are asked for the invoices we raise, never for the final invoice or
  // the close-out paperwork.
  const canAsk = canRequestInvoice(item) && !!onRequest && !state.paid && !state.date;
  // The quick paid action belongs on an invoice that has gone out or come in but
  // is still waiting to be paid.
  const canMarkPaid = invoiceToneKey(item, state) === 'warning' && !state.paid && !!state.date;
  const hasAmount = !state.awaiting && state.amount > 0;

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
      onUndoRequest={onUndoRequest}
    >
      {partyName && (
        <p className="text-[11px] text-muted-foreground truncate">
          {item.direction === 'out' ? 'To' : 'From'}{' '}
          <span className="font-semibold text-foreground">{partyName}</span>
        </p>
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

      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px]">
        {canMarkPaid && (
          <button
            type="button"
            onClick={() => onChange({ paid: true }, `${item.label} marked as paid`)}
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
            disabled={state.awaiting}
            title={state.awaiting ? (state.hint || 'The amount cannot be worked out yet') : 'Email accounts about this invoice'}
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
            {state.variance.reason} — calculated {fmtGBP(state.variance.calculated)}, invoiced {fmtGBP(state.variance.invoiced)}. Raise a supplementary invoice or credit note, or unlock the amount.
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

      {detailsOpen && <InvoiceItemDetails item={item} state={state} onChange={onChange} />}
    </InvoiceItemCard>
  );
}