import React, { useEffect, useState } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { isInvoiceDocument } from '@/components/shared/invoiceChecklist';

/**
 * The fields behind an invoice: the amount (following the calculated figure
 * unless it has been overridden), the date it went out or came in, and whether
 * it has been paid. Kept out of the row itself so the list stays readable.
 */
export default function InvoiceItemDetails({ item, state, onChange }) {
  const isDocument = isInvoiceDocument(item);
  const dateLabel = item.dateLabel || (item.direction === 'in' ? 'Received' : 'Sent');
  const followsCalculation = state.derived && !state.adjusted && !state.locked;

  const [amountDraft, setAmountDraft] = useState('');
  const [dateDraft, setDateDraft] = useState(state.date || '');

  useEffect(() => {
    setAmountDraft(followsCalculation ? '' : (state.amount ? String(state.amount) : ''));
  }, [state.amount, followsCalculation]);
  useEffect(() => { setDateDraft(state.date || ''); }, [state.date]);

  const commitAmount = () => {
    const current = followsCalculation ? '' : (state.amount ? String(state.amount) : '');
    if (amountDraft === current) return;
    onChange(
      { amount: amountDraft === '' ? null : amountDraft },
      `${item.label} amount ${amountDraft === '' ? 'set back to the calculated figure' : `overridden to £${amountDraft}`}`
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
    <div className="rounded-[10px] border border-border bg-muted/30 px-3 py-2.5 space-y-2">
      {isDocument ? dateField : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Amount (£ total inc VAT)</label>
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder={state.amount > 0 ? fmtGBP(state.amount) : '0.00'}
                value={amountDraft}
                onChange={(e) => setAmountDraft(e.target.value)}
                onBlur={commitAmount}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                className="h-8 text-sm"
              />
              {followsCalculation && state.amount > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">Following the calculated figure — type a figure to override it.</p>
              )}
              {state.locked && (
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                  <Lock className="w-3 h-3" /> Locked at the figure it was sent at.
                </p>
              )}
            </div>
            {dateField}
            <div>
              <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Split</label>
              <div className="h-8 flex items-center gap-2 px-2 rounded-md border border-border bg-card text-xs tabular-nums">
                <span className="text-muted-foreground">Ex</span> <span className="font-medium">{fmtGBP(state.ex)}</span>
                <span className="text-muted-foreground">VAT</span> <span className="font-medium">{fmtGBP(state.vat)}</span>
              </div>
            </div>
          </div>

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
        </>
      )}

      {state.variance && (
        <p className="flex items-start gap-1.5 text-[10px] leading-tight text-amber-700 dark:text-amber-300 font-medium">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {state.variance.reason} — calculated {fmtGBP(state.variance.calculated)}, invoiced {fmtGBP(state.variance.invoiced)}. Raise a supplementary invoice or credit note, or unlock the amount.
          </span>
        </p>
      )}
    </div>
  );
}