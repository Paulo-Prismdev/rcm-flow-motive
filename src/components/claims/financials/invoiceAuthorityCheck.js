import { fmtGBP } from '@/components/shared/creditRepairRates';
import { VAT_RATE, round2, toNum } from './invoiceReview';

/**
 * The check between the Final Invoice and the Final Authority. A repairer can
 * never invoice more than the job was authorised at, so the two figures are
 * compared whichever of them was uploaded second — only what is done about a
 * difference depends on which document arrived when. Nothing here is stored: the
 * comparison is worked out from the claim's own fields and the invoice's own
 * recorded total, so a later change to the authority flags itself.
 */

/** Within 5p the two figures are the same figure, rounded differently. */
export const AUTHORITY_TOLERANCE = 0.05;

/** The key the Final Invoice is filed under. */
export const FINAL_INVOICE_KEY = 'final_invoice';

/** The amount the job was authorised at, as the repairer's invoice is measured against it. */
export function authorityAmount(claim) {
  const gross = toNum(claim?.authority_cost_gross);
  if (gross !== null && gross > 0) return gross;
  const net = toNum(claim?.authority_cost_net);
  return net !== null && net > 0 ? round2(net * (1 + VAT_RATE)) : null;
}

/** The total recorded off the Final Invoice, once a copy of it has been read. */
export function finalInvoiceTotal(claim) {
  const entry = claim?.invoice_tracker?.items?.[FINAL_INVOICE_KEY] || {};
  const stored = toNum(entry.amount);
  return stored !== null && stored > 0 ? stored : null;
}

/**
 * The invoice total against the authorised amount: 'match' within the rounding
 * tolerance, 'under' where the invoice asks for less than was authorised, and
 * 'over' where it asks for more — which is never allowed.
 */
export function compareToAuthority(invoiceTotal, authority) {
  const total = toNum(invoiceTotal);
  const authorised = toNum(authority);
  if (total === null || authorised === null) return null;
  const difference = round2(total - authorised);
  if (Math.abs(difference) <= AUTHORITY_TOLERANCE) {
    return { status: 'match', difference: 0, invoiceTotal: total, authority: authorised };
  }
  return {
    status: difference < 0 ? 'under' : 'over',
    difference,
    invoiceTotal: total,
    authority: authorised,
  };
}

/** How far apart the two figures are, in words: "£300.00 under". */
export function describeDifference(comparison) {
  if (!comparison) return '';
  if (comparison.status === 'match') return 'in line with';
  return `${fmtGBP(Math.abs(comparison.difference))} ${comparison.status}`;
}

/**
 * The pre-filled email asking the repairer for a corrected invoice: what was
 * invoiced, what the job was authorised at, and what to send instead.
 */
export function buildReinvoiceEmail({ claim, comparison, user }) {
  const { status, invoiceTotal, authority, difference } = comparison || {};
  const subject = `Corrected invoice required — Job ${claim?.job_number || '—'} | ${claim?.reg || '—'}`;

  const why = status === 'over'
    ? `We're not able to accept it as it stands: the invoice total of ${fmtGBP(invoiceTotal)} is ${fmtGBP(Math.abs(difference))} over the ${fmtGBP(authority)} this repair was authorised at. A repairer can't invoice more than the authorised amount.`
    : `We're not able to accept it as it stands: the invoice total of ${fmtGBP(invoiceTotal)} is ${fmtGBP(Math.abs(difference))} under the ${fmtGBP(authority)} this repair was authorised at.`;

  const lines = [
    'Hi,',
    '',
    `Thank you for the final invoice for the repair on ${claim?.reg || 'the vehicle'}.`,
    '',
    why,
    '',
    `Please send a corrected invoice at the authorised amount of ${fmtGBP(authority)} (inc VAT) and we will process it straight away.`,
    '',
    `Job number:   ${claim?.job_number || '—'}`,
    `Vehicle Reg:  ${claim?.reg || '—'}`,
    claim?.claim_ref ? `Claim ref:    ${claim.claim_ref}` : null,
    claim?.insurer ? `Insurer:      ${claim.insurer}` : null,
    '',
    'Thanks,',
    user?.full_name || '',
    claim?.job_number ? `Job ${claim.job_number}` : '',
  ];

  return { subject, body: lines.filter((line) => line !== null && line !== undefined).join('\n') };
}