import React from 'react';
import { AlertTriangle, Check, PoundSterling } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { round2, toNum } from './invoiceReview';

/**
 * The total read off the Final Insurer Invoice, set against the repair cost
 * already on the claim: it fills the figure in where there is none, says so
 * plainly where the two agree, and flags the difference where they don't — never
 * overwriting a figure that is already there without being asked.
 *
 * Where the client's VAT and excess are handled by us the insurer's invoice is
 * only the part the insurer pays, and the repair is that invoice plus the VAT &
 * excess invoice — the two are added up here. While that second invoice is still
 * to arrive there is no total to set against the repair cost, so nothing is
 * offered until it is on file.
 */
export function repairCostOffer(item, claim, figures, vatExcess = null) {
  if (!item?.setsRepairCost) return null;
  const insurerPart = toNum(figures?.amount_total);
  if (insurerPart === null) return null;
  if (vatExcess && vatExcess.part === null) return null;

  const vatExcessPart = toNum(vatExcess?.part);
  const total = vatExcessPart === null ? insurerPart : round2(insurerPart + vatExcessPart);
  const basis = { insurerPart, vatExcessPart };
  const onFile = toNum(claim?.final_repair_cost);

  if (onFile === null) {
    return { total, onFile: null, status: 'empty', difference: null, defaultUse: true, basis };
  }
  const difference = round2(total - onFile);
  if (Math.abs(difference) < 0.01) {
    return { total, onFile, status: 'match', difference: 0, defaultUse: false, basis };
  }
  return { total, onFile, status: 'differs', difference, defaultUse: false, basis };
}

/** The total in words: the two invoices named where they are billed separately. */
const describeTotal = (offer) => (offer.basis.vatExcessPart === null
  ? `this invoice's total, ${fmtGBP(offer.total)},`
  : `the ${fmtGBP(offer.total)} these two invoices add up to (insurer invoice ${fmtGBP(offer.basis.insurerPart)} + VAT & excess invoice ${fmtGBP(offer.basis.vatExcessPart)})`);

export default function RepairCostFromInvoice({ offer, useIt, onUse }) {
  if (!offer) return null;

  const differs = offer.status === 'differs';
  const twoInvoices = offer.basis.vatExcessPart !== null;

  return (
    <div className={`space-y-1.5 rounded-lg border px-2.5 py-2 ${differs
      ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
      : 'border-border bg-muted/30'}`}
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
        <PoundSterling className="h-3.5 w-3.5" /> The claim's final repair cost
      </p>

      {offer.status === 'empty' && (
        <label className="flex cursor-pointer items-start gap-2 text-[11px]">
          <input
            type="checkbox"
            checked={useIt}
            onChange={(e) => onUse(e.target.checked)}
            className="mt-0.5 rounded border-border"
          />
          <span>
            Use {describeTotal(offer)} as the claim's final repair cost.
          </span>
        </label>
      )}

      {offer.status === 'match' && (
        <p className="flex items-center gap-1.5 text-[11px] text-green-700 dark:text-green-300">
          <Check className="h-3.5 w-3.5" />{' '}
          {twoInvoices
            ? `The two invoices add up to the repair cost on file (${fmtGBP(offer.onFile)}).`
            : `Matches the repair cost on file (${fmtGBP(offer.onFile)}).`}
        </p>
      )}

      {differs && (
        <>
          <p className="flex items-start gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
            <AlertTriangle className="mt-px h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {twoInvoices
                ? `The two invoices add up to ${fmtGBP(offer.total)}, but the claim's final repair cost is ${fmtGBP(offer.onFile)} — a difference of ${fmtGBP(Math.abs(offer.difference))}.`
                : `This invoice reads ${fmtGBP(offer.total)}, but the claim's final repair cost is ${fmtGBP(offer.onFile)} — a difference of ${fmtGBP(Math.abs(offer.difference))}.`}
            </span>
          </p>
          <label className="flex cursor-pointer items-start gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={useIt}
              onChange={(e) => onUse(e.target.checked)}
              className="mt-0.5 rounded border-border"
            />
            <span>
              {twoInvoices
                ? `Use ${fmtGBP(offer.total)} instead — replaces the final repair cost on the claim.`
                : "Use this invoice's figure instead — replaces the final repair cost on the claim."}
            </span>
          </label>
        </>
      )}
    </div>
  );
}