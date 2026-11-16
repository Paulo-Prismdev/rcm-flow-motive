import React from 'react';
import { AlertTriangle, Check, Hourglass, Mail } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { authorityWorkings } from './invoiceAuthorityCheck';
import CustomerShareLines from './CustomerShareLines';

/**
 * The Final Insurer Invoice against what the insurer's share of the repair comes to,
 * on the claim itself: the authorised amount ex VAT, plus VAT only where the customer
 * is not VAT registered, less the customer's excess and contributions — with what the
 * customer pays the repairer, and the whole repair the two add up to, underneath it.
 *
 * Where the invoice splits the repair between its payers, the figure it puts on the
 * insurer is what is measured and the screen says so, using the comparison's own
 * verdict — the most serious of its checks — so the note can never read green while a
 * check on it is failing.
 *
 * It flags an invoice that has ended up over that figure — which a later change to
 * the authority can do long after the invoice was filed — and says what is
 * outstanding while a corrected invoice is being waited on. Nothing is stored: it is
 * worked out from the figures the claim already holds.
 */
export default function FinalInvoiceAuthorityNote({
  comparison, awaitingCorrected, onReinvoice, label = 'Final Insurer Invoice',
}) {
  if (awaitingCorrected) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/30 bg-warning-bg px-3 py-2">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-warning-fg" />
        <p className="min-w-[200px] flex-1 text-xs text-warning-fg">
          {comparison?.expected != null
            ? `Awaiting a corrected ${label} — invoiced ${fmtGBP(comparison.insurerPart)} against the ${fmtGBP(comparison.expected)} the insurer's share of this repair comes to. A corrected copy at that amount clears this.`
            : `Awaiting a corrected ${label} from the repairer. A corrected copy clears this.`}
        </p>
        {onReinvoice && (
          <button
            type="button"
            onClick={onReinvoice}
            className="inline-flex items-center gap-1 text-xs font-semibold text-warning-fg hover:underline"
          >
            <Mail className="w-3 h-3" /> Email the repairer
          </button>
        )}
      </div>
    );
  }

  if (!comparison) return null;

  const { status, expected, insurerPart, difference, headline, split, overReason } = comparison;
  // A privately paid repair has one invoice for the whole of it, measured against our
  // purchase order: no insurer's share and no customer's share beside it.
  const ordered = !!comparison.expectation?.purchaseOrder;
  const tone = headline?.tone || (status === 'match' ? 'ok' : status === 'over' ? 'block' : 'warn');
  // What was invoiced, named as the invoice itself reads it: a split invoice puts a
  // share of the repair on the insurer, an invoice printed as one amount is the
  // insurer's whole bill.
  const invoiced = split
    ? `the insurer's share of ${fmtGBP(insurerPart)}`
    : `the invoice total of ${fmtGBP(insurerPart)}`;

  // The customer's excess is still TBC on authority, so the split of the repair — and
  // so the insurer's share of it — isn't known yet.
  if (tone === 'wait') {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <Hourglass className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        <p className="min-w-[200px] flex-1 text-xs text-muted-foreground">
          {comparison.reason === 'no_final_authority'
            ? `${label} ${fmtGBP(insurerPart)} — waiting for the Final Authority. Only the Final Authority is used for this check, and none has been recorded on this claim yet. It is checked as soon as one arrives.`
            : <>{split ? 'Insurer’s share' : 'Insurer invoice'} {fmtGBP(insurerPart)} — waiting for the policy excess. The excess
              is TBC on authority, and the insurer's share of the repair can't be worked out until it is known. The invoice is
              checked against it as soon as the excess is set.</>}
        </p>
      </div>
    );
  }

  if (tone === 'ok') {
    return (
      <div className="space-y-1 rounded-lg border border-success/30 bg-success-bg px-3 py-2">
        <p className="flex items-start gap-2 text-xs font-semibold text-success-fg">
          <span className="mt-px w-4 h-4 rounded-full bg-success flex items-center justify-center flex-shrink-0">
            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </span>
          <span>{split ? headline.text : `${authorityWorkings(comparison)} — the ${label} total of ${fmtGBP(insurerPart)} matches.`}</span>
        </p>
        {!split && !ordered && <CustomerShareLines comparison={comparison} tone="match" className="pl-6" />}
      </div>
    );
  }

  const over = tone === 'block';
  const workings = split
    ? headline.text
    : `${authorityWorkings(comparison)}. The invoice total of ${fmtGBP(insurerPart)} is ${fmtGBP(Math.abs(difference))} ${over ? 'over' : 'under'} that.`;
  const guidance = over
    ? (overReason === 'total'
      ? 'Ask for a corrected invoice, or correct the authority if it is wrong.'
      : ordered
        ? "A repairer can't invoice more than the repair was ordered at — ask for a corrected invoice, or issue a revised purchase order if the order is wrong."
        : `A repairer can't invoice more than the insurer's share of the authority — ask for a corrected invoice, or correct the authority if it is wrong.`)
    : status === 'under'
      ? `Accept the whole repair (${fmtGBP(comparison.fullCost)}) as the final repair cost, or ask the repairer to re-invoice to ${fmtGBP(expected)}.`
      : '';

  return (
    <div className={`space-y-1 rounded-lg border px-3 py-2 ${over
      ? 'border-danger/30 bg-danger-bg'
      : 'border-warning/30 bg-warning-bg'}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <AlertTriangle className={`h-3.5 w-3.5 flex-shrink-0 ${over ? 'text-danger-fg' : 'text-warning-fg'}`} />
        <p className={`min-w-[200px] flex-1 text-xs ${over ? 'text-danger-fg' : 'text-warning-fg'}`}>
          <span className="font-semibold">
            {over ? `${workings} The ${label} is ${invoiced}.` : workings}
          </span>{' '}
          {guidance}
        </p>
        {onReinvoice && over && overReason !== 'total' && (
          <button
            type="button"
            onClick={onReinvoice}
            className={`inline-flex items-center gap-1 text-xs font-semibold hover:underline ${over ? 'text-danger-fg' : 'text-warning-fg'}`}
          >
            <Mail className="w-3 h-3" /> Email the repairer
          </button>
        )}
      </div>
      {!split && !ordered && <CustomerShareLines comparison={comparison} tone={over ? 'over' : 'under'} className="pl-5" />}
    </div>
  );
}