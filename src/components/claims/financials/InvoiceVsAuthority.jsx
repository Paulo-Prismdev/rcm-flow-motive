import React from 'react';
import { AlertTriangle, Check, Mail } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';

/**
 * The Final Invoice set against the amount the job was authorised at. Within the
 * rounding tolerance the two agree; under the authority the user chooses whether
 * the invoice stands or the repairer is asked to re-invoice; over it the invoice
 * can never be saved, because a repairer can't invoice more than the authority.
 *
 * The same comparison is shown whichever of the two documents was uploaded
 * second — `mode` only says which one this screen is about.
 */
export default function InvoiceVsAuthority({
  comparison, mode = 'invoice', choice, onChoice, onReinvoiceEmail, emptyNote,
}) {
  if (!comparison) {
    return emptyNote ? (
      <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2">
        <p className="text-[11px] text-muted-foreground">{emptyNote}</p>
      </div>
    ) : null;
  }

  const { status, invoiceTotal, authority, difference } = comparison;

  if (status === 'match') {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-2.5 py-2">
        <span className="mt-px w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </span>
        <p className="text-[11px] font-semibold text-green-700 dark:text-green-400">
          Matches authority — the invoice total {fmtGBP(invoiceTotal)} is the {fmtGBP(authority)} this job was authorised at.
        </p>
      </div>
    );
  }

  if (status === 'over') {
    return (
      <div className="space-y-1.5 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-2.5">
        <p className="flex items-start gap-1.5 text-[11px] font-semibold text-red-700 dark:text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          <span>
            Invoice {fmtGBP(invoiceTotal)} is {fmtGBP(Math.abs(difference))} over the authorised {fmtGBP(authority)} — a
            repairer can't invoice more than the authority.
          </span>
        </p>
        <p className="pl-5 text-[11px] leading-snug text-red-700/90 dark:text-red-400/90">
          {mode === 'invoice'
            ? "This can't be saved as the Final Invoice. Reject it and ask the repairer for a corrected invoice."
            : 'The Final Invoice already on file is flagged on this claim until a corrected copy at the authorised amount arrives.'}
        </p>
        {onReinvoiceEmail && (
          <div className="pl-5">
            <button
              type="button"
              onClick={() => onReinvoiceEmail(comparison)}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 dark:text-red-400 hover:underline"
            >
              <Mail className="w-3 h-3" />
              {mode === 'invoice' ? 'Reject it and email the repairer for a corrected invoice' : 'Email the repairer for a corrected invoice'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Under the authority: the invoice stands at its own total, or the repairer is
  // asked to invoice the full authorised amount.
  const optionClass = (selected) => `w-full flex items-start gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] font-semibold transition-colors ${selected
    ? 'border-amber-500 bg-amber-100/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200'
    : 'border-amber-300 dark:border-amber-700 bg-white/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 hover:border-amber-400'}`;

  return (
    <div className="space-y-2 rounded-lg border border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/25 p-2.5">
      <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
        <span>
          Invoice {fmtGBP(invoiceTotal)} is {fmtGBP(Math.abs(difference))} under the authorised {fmtGBP(authority)}.
        </span>
      </p>

      <div className="pl-5 space-y-1.5">
        <button type="button" onClick={() => onChoice('accept')} className={optionClass(choice === 'accept')}>
          <Check className="w-3 h-3 flex-shrink-0 mt-px" />
          <span>
            Accept the invoice total
            <span className="block font-normal">
              {fmtGBP(invoiceTotal)} becomes the claim's final repair cost.
            </span>
          </span>
        </button>

        <button type="button" onClick={() => onChoice('reinvoice')} className={optionClass(choice === 'reinvoice')}>
          <Mail className="w-3 h-3 flex-shrink-0 mt-px" />
          <span>
            Ask the repairer to re-invoice to match the authority
            <span className="block font-normal">
              The Final Invoice is left amber until a corrected invoice at {fmtGBP(authority)} is uploaded, with a
              pre-filled email to the repairer.
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}