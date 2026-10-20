import React, { useState } from 'react';
import { AlertTriangle, Calculator, Send, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { canRequestInvoice, invoicePartyName, isInvoiceDocument } from '@/components/shared/invoiceChecklist';
import InvoiceItemCard from '../InvoiceItemCard';
import InvoiceItemDetails from '../InvoiceItemDetails';
import InvoiceCalculation from './InvoiceCalculation';

/**
 * One invoice: its status button, who it is to or from, the amount split out,
 * and the actions that belong to that invoice alone.
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

  return (
    <div className="rounded-[10px] border border-border bg-card">
      <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 p-2.5">
        <div className="lg:w-[230px] flex-shrink-0">
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
          />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-[11px] text-muted-foreground truncate">
            {item.direction === 'out' ? 'To' : 'From'}{' '}
            <span className="font-semibold text-foreground">{partyName || 'not set'}</span>
          </p>
          {!isDocument && (
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-[11px] text-muted-foreground">
                Ex VAT <span className="font-semibold tabular-nums text-foreground">{fmtGBP(state.ex)}</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                VAT <span className="font-semibold tabular-nums text-foreground">{fmtGBP(state.vat)}</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                Total <span className="text-sm font-bold tabular-nums text-foreground">{state.amount > 0 ? fmtGBP(state.amount) : '—'}</span>
              </span>
              {state.adjusted && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                  Adjusted
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {!isDocument && (
            <button
              type="button"
              onClick={() => setShowCalc((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Calculator className="w-3.5 h-3.5" /> {showCalc ? 'Hide calculation' : 'Show calculation'}
            </button>
          )}
          {canAsk && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px] gap-1"
              disabled={state.awaiting}
              title={state.awaiting ? (state.hint || 'The amount cannot be worked out yet') : 'Email accounts about this invoice'}
              onClick={() => onRequest(item, state)}
            >
              <Send className="w-3 h-3" /> {state.requested ? 'Request again' : 'Request from accounts'}
            </Button>
          )}
        </div>
      </div>

      {state.variance && (
        <div className="px-2.5 pb-2.5">
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
        </div>
      )}

      {state.locked && !state.variance && (
        <p className="px-2.5 pb-2.5 text-[10px] text-muted-foreground">
          Amount locked at {fmtGBP(state.amount)} — the figure this invoice went out at.
        </p>
      )}

      {showCalc && (
        <div className="px-2.5 pb-2.5">
          <InvoiceCalculation state={state} />
        </div>
      )}

      {detailsOpen && (
        <div className="px-2.5 pb-2.5">
          <InvoiceItemDetails item={item} state={state} onChange={onChange} />
        </div>
      )}
    </div>
  );
}