import React from 'react';
import { AlertTriangle, Check, Hourglass, Mail } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { authorityWorkings } from './invoiceAuthorityCheck';

/**
 * The Final Insurer Invoice against the authority, on the claim itself. Where the
 * client's VAT and excess are handled by us the repair is billed in two parts, so
 * the note shows the working: the insurer's invoice plus the VAT & excess invoice
 * against the authorised amount, and says so while that second invoice is still to
 * arrive. It flags an invoice that has ended up over the authority — which a later
 * change to the authority can do long after the invoice was filed — and says what
 * is outstanding while a corrected invoice is being waited on. Nothing is stored:
 * it is worked out from the figures the claim already holds.
 */
export default function FinalInvoiceAuthorityNote({ comparison, awaitingCorrected, onReinvoice }) {
  if (awaitingCorrected) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-700 dark:bg-amber-900/20">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="min-w-[200px] flex-1 text-[11px] text-amber-800 dark:text-amber-200">
          {comparison
            ? `Awaiting a corrected Final Insurer Invoice — invoiced ${fmtGBP(comparison.measured)} against the authorised ${fmtGBP(comparison.authority)}. A corrected copy at the authorised amount clears this.`
            : 'Awaiting a corrected Final Insurer Invoice from the repairer. A corrected copy clears this.'}
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

  const { status, authority } = comparison;

  // The insurer's invoice is only part of the repair on a claim where the VAT and
  // excess are billed separately: nothing can be checked until that invoice lands.
  if (status === 'waiting') {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-border bg-muted/30 px-3 py-2">
        <Hourglass className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        <p className="min-w-[200px] flex-1 text-[11px] text-muted-foreground">
          Insurer invoice {fmtGBP(comparison.insurerPart)} — waiting for the VAT &amp; Excess Invoice. On this claim
          that invoice carries the VAT content of the repair and the excess, and the authority is checked on the two
          together.
        </p>
      </div>
    );
  }

  const workings = authorityWorkings(comparison);

  if (status === 'match') {
    return (
      <div className="flex items-center gap-2 rounded-[10px] border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-2">
        <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </span>
        <p className="text-[11px] font-semibold text-green-700 dark:text-green-400">
          The Final Insurer Invoice matches the authority — {workings} against the authorised {fmtGBP(authority)}.
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
        <span className="font-semibold">{workings} is {fmtGBP(Math.abs(comparison.difference))} {over ? 'over' : 'under'} the authorised {fmtGBP(authority)}.</span>{' '}
        {over
          ? "A repairer can't invoice more than the authority — ask for a corrected invoice, or correct the authority if it is wrong."
          : 'Accept the total as the final repair cost, or ask the repairer to re-invoice to match the authority.'}
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