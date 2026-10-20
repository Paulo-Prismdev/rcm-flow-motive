import React, { useEffect, useState } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { fmtGBP } from '@/components/shared/creditRepairRates';

/**
 * The editable fields behind an invoicing tracker button: the amount the invoice
 * was raised at, the date it went out or came in, and whether it has been paid.
 * Kept out of the button itself so the tracker stays a clean list of statuses.
 */
export default function InvoiceItemDetails({ item, state, onChange }) {
  const [amountDraft, setAmountDraft] = useState(state.amount ? String(state.amount) : '');
  const [dateDraft, setDateDraft] = useState(state.date || '');

  useEffect(() => { setAmountDraft(state.amount ? String(state.amount) : ''); }, [state.amount]);
  useEffect(() => { setDateDraft(state.date || ''); }, [state.date]);

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

  const dateField = (
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
  );

  return (
    <div className="mt-1.5 rounded-[10px] border border-border bg-card px-3 py-2.5 space-y-2">
      {isDocument ? dateField : (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Amount (£)</label>
            {isDerived ? (
              <div className={`h-8 flex items-center gap-1 px-2 rounded-md border border-dashed text-sm tabular-nums ${state.awaiting ? 'border-amber-300 dark:border-amber-800 text-muted-foreground' : 'border-border bg-muted/40 font-medium'}`}>
                {state.invoicedLocked && <Lock className="w-3 h-3 flex-shrink-0 text-muted-foreground" title="Locked at the figure this invoice went out at" />}
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
          {dateField}
        </div>
      )}

      {isDerived && state.hint && (
        <p className={`text-[10px] leading-tight ${state.awaiting ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground'}`}>
          {state.hint}
        </p>
      )}

      {isDerived && state.variance && (
        <p className="flex items-start gap-1.5 text-[10px] leading-tight text-amber-700 dark:text-amber-300 font-medium">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {state.variance.reason} — calculated {fmtGBP(state.variance.calculated)}, invoiced {fmtGBP(state.variance.invoiced)}. Raise a supplementary invoice or credit note, or unlock the amount.
          </span>
        </p>
      )}

      {!isDocument && (
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
        </div>
      )}
    </div>
  );
}