import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { isInvoiceDocument } from '@/components/shared/invoiceChecklist';
import FigureField from './financials/FigureField';

/**
 * The figures behind an invoice — its number, amount and the date it went out or
 * came in — read-only until their own pencil is clicked, so an amount recorded
 * against an invoice can never be changed by accident. Kept behind the row's ⋮
 * menu so the list itself stays readable. Paid status works as it always has.
 */
export default function InvoiceItemDetails({ item, state, onChange }) {
  const [editingKey, setEditingKey] = useState(null);
  const isDocument = isInvoiceDocument(item);
  const dateLabel = item.dateLabel || (item.direction === 'in' ? 'Received' : 'Sent');
  const followsCalculation = state.derived && !state.adjusted && !state.locked;

  const fieldEdit = (key) => ({
    editing: editingKey === key,
    onEdit: () => setEditingKey(key),
    onDone: () => setEditingKey(null),
  });

  const amountHint = state.locked
    ? `Locked at the figure it was ${item.direction === 'in' ? 'received' : 'sent'} at.`
    : followsCalculation && state.amount > 0
      ? 'Following the calculated figure — set a figure here to override it.'
      : undefined;

  return (
    <div className="rounded-[10px] border border-border bg-muted/30 px-3 py-2.5 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
        {!isDocument && (
          <FigureField
            {...fieldEdit('amount')}
            label="Amount (£ total inc VAT)"
            type="number"
            value={state.adjusted || state.locked ? state.amount : undefined}
            hint={amountHint}
            onCommit={(v) => onChange(
              { amount: v === '' ? null : v },
              v === ''
                ? `${item.label} amount set back to the calculated figure`
                : `${item.label} amount overridden to ${fmtGBP(Number(v) || 0)}`
            )}
          />
        )}

        <FigureField
          {...fieldEdit('date')}
          label={dateLabel}
          type="date"
          value={state.date}
          onCommit={(v) => onChange(
            { date: v },
            `${item.label} ${dateLabel.toLowerCase()} date ${v ? `set to ${v}` : 'cleared'}`
          )}
        />

        {!isDocument && (
          <FigureField
            {...fieldEdit('invoice_number')}
            label="Invoice number"
            value={state.invoiceNumber}
            onCommit={(v) => onChange({ invoice_number: v }, `${item.label} invoice number set to ${v || 'not set'}`)}
          />
        )}
      </div>

      {!isDocument && (
        <>
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
            {state.requested && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400">Requested from accounts</span>
            )}
          </div>

          {state.amount > 0 && (
            <p className="text-[10px] text-muted-foreground tabular-nums">
              Ex VAT {fmtGBP(state.ex)} + VAT {fmtGBP(state.vat)}
            </p>
          )}
        </>
      )}

      {isDocument && state.received && (
        <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Lock className="w-3 h-3" /> Filed against the close-out.
        </p>
      )}

      {state.variance && (
        <p className="text-[10px] leading-tight text-amber-700 dark:text-amber-300 font-medium">
          {state.variance.reason} — calculated {fmtGBP(state.variance.calculated)}, invoiced {fmtGBP(state.variance.invoiced)}. Raise a supplementary invoice or credit note, or unlock the amount.
        </p>
      )}
    </div>
  );
}