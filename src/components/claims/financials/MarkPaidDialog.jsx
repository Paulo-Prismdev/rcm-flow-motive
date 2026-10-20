import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import UnifiedModal from '@/components/shared/UnifiedModal';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { formatInvoiceDay, today } from '@/components/shared/invoiceChecklist';

/**
 * Asks for the date the money actually landed before an invoice is recorded as
 * paid — defaulting to today, but never assumed. A date in the future is refused;
 * a date before the invoice went out or came in is allowed, and said plainly.
 * Marking an invoice unpaid clears its paid date, so that is confirmed first too.
 */
export default function MarkPaidDialog({ prompt, byName, onClose, onConfirm }) {
  const { mode, item, state } = prompt;
  const [date, setDate] = useState(state.paidDate || today());

  const unpaid = mode === 'unpaid';
  const future = !unpaid && !!date && date > today();
  const beforeInvoice = !unpaid && !future && !!state.date && !!date && date < state.date;

  const title = unpaid ? `Mark the ${item.label} unpaid?`
    : mode === 'correct' ? 'Change the paid date'
      : `Mark the ${item.label} as paid`;

  const description = unpaid
    ? `Its paid date${state.paidDate ? ` (${formatInvoiceDay(state.paidDate)})` : ''} will be cleared and the payment undone.`
    : `${state.amount > 0 ? `${fmtGBP(state.amount)} · ` : ''}Recorded with the date the money landed, not the date it was marked.`;

  return (
    <UnifiedModal
      isOpen
      onClose={onClose}
      title={title}
      description={description}
      className="max-w-sm"
      footer={
        <>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            size="sm"
            variant={unpaid ? 'destructive' : 'default'}
            disabled={!unpaid && (!date || future)}
            onClick={() => onConfirm(date)}
          >
            {unpaid ? 'Mark as unpaid' : mode === 'correct' ? 'Save the date' : 'Confirm'}
          </Button>
        </>
      }
    >
      {!unpaid && (
        <div className="space-y-2">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Date paid
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={date}
              max={today()}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 w-[170px]"
            />
            <button
              type="button"
              onClick={() => setDate(today())}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              Today
            </button>
          </div>

          {future && (
            <p className="text-[11px] text-red-600 dark:text-red-400">
              The paid date can't be in the future.
            </p>
          )}
          {beforeInvoice && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              This is before the invoice date ({formatInvoiceDay(state.date)}). You can still confirm.
            </p>
          )}
          {byName && (
            <p className="text-[11px] text-muted-foreground">Recorded as paid by {byName}.</p>
          )}
        </div>
      )}
    </UnifiedModal>
  );
}