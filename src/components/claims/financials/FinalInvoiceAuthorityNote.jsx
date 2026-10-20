import React from 'react';
import { AlertTriangle, Check, Mail } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';

/**
 * The Final Invoice against the authority, on the claim itself. It flags an
 * invoice that has ended up over the authorised amount — which a later change to
 * the authority can do long after the invoice was filed — and says what is
 * outstanding while a corrected invoice is being waited on. Nothing is stored:
 * it is worked out from the two figures the claim already holds.
 */
export default function FinalInvoiceAuthorityNote({ comparison, awaitingCorrected, onReinvoice }) {
  if (awaitingCorrected) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-700 dark:bg-amber-900/20">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="min-w-[200px] flex-1 text-[11px] text-amber-800 dark:text-amber-200">
          {comparison
            ? `Awaiting a corrected Final Invoice — invoiced ${fmtGBP(comparison.invoiceTotal)} against the authorised ${fmtGBP(comparison.authority)}. A corrected copy at the authorised amount clears this.`
            : 'Awaiting a corrected Final Invoice from the repairer. A corrected copy clears this.'}
        </p>
        {onReinvoice && (
          <button
            type="button"
            onClick={onReinvoice}
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 dark:text-amber-300 hover:underline"
          >
            <Mail className="w-3 h-3" /> Email the repairer
          </button>
        )}
      </div>
    );
  }

  if (!comparison) return null;

  const { status, invoiceTotal, authority, difference } = comparison;

  if (status === 'match') {
    return (
      <div className="flex items-center gap-2 rounded-[10px] border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-2">
        <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </span>
        <p className="text-[11px] font-semibold text-green-700 dark:text-green-400">
          The Final Invoice matches the authority — {fmtGBP(invoiceTotal)} against the authorised {fmtGBP(authority)}.
        </p>
      </div>
    );
  }

  const over = status === 'over';
  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-[10px] border px-3 py-2 ${over
      ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
      : 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'}`}
    >
      <AlertTriangle className={`h-3.5 w-3.5 flex-shrink-0 ${over ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
      <p className={`min-w-[200px] flex-1 text-[11px] ${over ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'}`}>
        <span className="font-semibold">Final Invoice {fmtGBP(invoiceTotal)} is {fmtGBP(Math.abs(difference))} {over ? 'over' : 'under'} the authorised {fmtGBP(authority)}.</span>{' '}
        {over
          ? "A repairer can't invoice more than the authority — ask for a corrected invoice, or correct the authority if it is wrong."
          : 'Accept the invoice total as the final repair cost, or ask the repairer to re-invoice to match the authority.'}
      </p>
      {onReinvoice && (
        <button
          type="button"
          onClick={onReinvoice}
          className={`inline-flex items-center gap-1 text-[10px] font-semibold hover:underline ${over ? 'text-red-700 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`}
        >
          <Mail className="w-3 h-3" /> Email the repairer
        </button>
      )}
    </div>
  );
}