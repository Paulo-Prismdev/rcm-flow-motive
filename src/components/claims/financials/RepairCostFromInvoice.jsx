import React from 'react';
import { AlertTriangle, Check, PoundSterling } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { round2, toNum } from './invoiceReview';
import { customerShareWorkings, hasSplit, splitFromFigures } from './invoiceAuthorityCheck';

/**
 * The claim's final repair cost, set against the invoice being read.
 *
 * The repair cost is the WHOLE repair, not the insurer's part of it: the invoice
 * this repairer has sent the insurer, plus what the customer pays the repairer
 * themselves — the VAT where they are registered, their excess and any contribution
 * — which together come to the amount the repair was authorised at. It fills the
 * figure in silently where the claim hasn't got one — a blank cost and a nil one are
 * both simply nothing set — says so plainly where the two agree, and flags the
 * difference where they don't, never overwriting a real figure already on the claim
 * without being asked.
 *
 * On a job with no insurer authority to read the split from — one the customer is
 * paying for privately — there is no customer's share, and the invoice's own total
 * is the whole repair.
 */
export function repairCostOffer(item, claim, figures, expectation = null) {
  if (!item?.setsRepairCost) return null;
  const insurerPart = toNum(figures?.amount_total);
  if (insurerPart === null) return null;

  // An invoice that splits its total between the payers is the whole repair already:
  // what the customer pays is part of that total, not a figure to add to it again,
  // which is what counted their half twice. An invoice billing the insurer alone has
  // the customer's own share of the repair beside it.
  const split = splitFromFigures(figures);
  const onSplit = hasSplit(split);
  const customerShare = onSplit || !expectation || expectation.excessTbc ? 0 : expectation.customerShare;
  const total = onSplit ? insurerPart : round2(insurerPart + customerShare);
  const basis = { insurerPart, customerShare, expectation: expectation || null, split: onSplit ? split : null };
  const onFile = toNum(claim?.final_repair_cost);

  // A blank figure and a nil one are the same thing here: nothing has been set yet,
  // so the invoice fills the repair cost in — nothing to warn about and nothing to accept.
  if (onFile === null || onFile === 0) {
    return { total, onFile: null, status: 'empty', difference: null, defaultUse: true, basis };
  }
  const difference = round2(total - onFile);
  if (Math.abs(difference) < 0.01) {
    return { total, onFile, status: 'match', difference: 0, defaultUse: false, basis };
  }
  return { total, onFile, status: 'differs', difference, defaultUse: false, basis };
}

export default function RepairCostFromInvoice({ offer, useIt, onUse }) {
  // Nothing is shown where the claim holds no figure: the invoice fills it in as it
  // is saved. A box appears only where a real figure is already there and differs —
  // the one case where saving this invoice would replace it.
  if (!offer || offer.status === 'empty') return null;

  const differs = offer.status === 'differs';
  const onSplit = !!offer.basis.split;
  const withShare = !onSplit && offer.basis.customerShare > 0;

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
              {onSplit
                ? `The invoice's full total comes to ${fmtGBP(offer.total)}, but the claim's final repair cost is ${fmtGBP(offer.onFile)} — a difference of ${fmtGBP(Math.abs(offer.difference))}.`
                : withShare
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
              {onSplit
                ? `Use the invoice's full total of ${fmtGBP(offer.total)} instead — replaces the final repair cost on the claim.`
                : withShare
                  ? `Use the full repair cost of ${fmtGBP(offer.total)} instead — replaces the final repair cost on the claim.`
                  : "Use this invoice's figure instead — replaces the final repair cost on the claim."}
            </span>
          </label>
        </>
      )}
    </div>
  );
}