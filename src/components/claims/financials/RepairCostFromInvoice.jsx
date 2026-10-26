import React from 'react';
import { AlertTriangle, Check, PoundSterling } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { round2, toNum } from './invoiceReview';
import { customerShareWorkings } from './invoiceAuthorityCheck';

/**
 * The claim's final repair cost, set against the invoice being read.
 *
 * The repair cost is the WHOLE repair, not the insurer's part of it: the invoice
 * this repairer has sent the insurer, plus what the customer pays the repairer
 * themselves — the VAT where they are registered, their excess and any contribution
 * — which together come to the amount the repair was authorised at. It fills the
 * figure in where the claim hasn't got one, says so plainly where the two agree, and
 * flags the difference where they don't, never overwriting a figure that is already
 * there without being asked.
 *
 * On a job with no insurer authority to read the split from — one the customer is
 * paying for privately — there is no customer's share, and the invoice's own total
 * is the whole repair.
 */
export function repairCostOffer(item, claim, figures, expectation = null) {
  if (!item?.setsRepairCost) return null;
  const insurerPart = toNum(figures?.amount_total);
  if (insurerPart === null) return null;

  const customerShare = expectation && !expectation.excessTbc ? expectation.customerShare : 0;
  const total = round2(insurerPart + customerShare);
  const basis = { insurerPart, customerShare, expectation: expectation || null };
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

/** The whole repair in words: the invoice and the customer's share named apart. */
const describeTotal = (offer) => (offer.basis.customerShare
  ? `the full repair cost of ${fmtGBP(offer.total)} — this invoice's ${fmtGBP(offer.basis.insurerPart)} plus the customer's ${fmtGBP(offer.basis.customerShare)}`
  : `this invoice's total, ${fmtGBP(offer.total)},`);

export default function RepairCostFromInvoice({ offer, useIt, onUse }) {
  if (!offer) return null;

  const differs = offer.status === 'differs';
  const withShare = offer.basis.customerShare > 0;

  return (
    <div className={`space-y-1.5 rounded-lg border px-2.5 py-2 ${differs
      ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
      : 'border-border bg-muted/30'}`}
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
        <PoundSterling className="h-3.5 w-3.5" /> The claim's final repair cost
      </p>

      {withShare && (
        <p className="text-[11px] text-muted-foreground">{customerShareWorkings(offer.basis.expectation)}</p>
      )}

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
          {withShare
            ? `The invoice and the customer's share come to the repair cost on file (${fmtGBP(offer.onFile)}).`
            : `Matches the repair cost on file (${fmtGBP(offer.onFile)}).`}
        </p>
      )}

      {differs && (
        <>
          <p className="flex items-start gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
            <AlertTriangle className="mt-px h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {withShare
                ? `This invoice plus the customer's share comes to ${fmtGBP(offer.total)}, but the claim's final repair cost is ${fmtGBP(offer.onFile)} — a difference of ${fmtGBP(Math.abs(offer.difference))}.`
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
              {withShare
                ? `Use the full repair cost of ${fmtGBP(offer.total)} instead — replaces the final repair cost on the claim.`
                : "Use this invoice's figure instead — replaces the final repair cost on the claim."}
            </span>
          </label>
        </>
      )}
    </div>
  );
}