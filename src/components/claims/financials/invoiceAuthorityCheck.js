import { fmtGBP } from '@/components/shared/creditRepairRates';
import { VAT_RATE, round2, toNum } from './invoiceReview';
import { finalInvoiceLabel } from '@/components/shared/invoiceChecklist';

/**
 * The check between the repairer's invoices and the Final Authority. A repairer
 * can never invoice more than the job was authorised at, so the figures are
 * compared whichever of the documents was uploaded second — only what is done
 * about a difference depends on which of them arrived when.
 *
 * On most jobs the Final Insurer Invoice is the whole repair and the check is
 * made on it alone. Where we handle the client's VAT and excess the repairer
 * bills us in two parts — what the insurer pays on the Final Insurer Invoice,
 * and the VAT content of the repair plus the excess they collected on their VAT
 * & Excess Invoice — and the two are added up, because together they are what the
 * job was authorised at. Until that second invoice is on file there is nothing to
 * measure, so the check waits for it rather than reading the insurer's invoice as
 * short.
 *
 * Nothing here is stored: every figure is worked out from the claim's own fields
 * and the invoices' recorded totals, so a later change to the authority flags
 * itself.
 */

/** Within 5p the two figures are the same figure, rounded differently. */
export const AUTHORITY_TOLERANCE = 0.05;

/** The key the Final Insurer Invoice is filed under. */
export const FINAL_INVOICE_KEY = 'final_invoice';

/** The amount the job was authorised at, as the repairer's invoice is measured against it. */
export function authorityAmount(claim) {
  const gross = toNum(claim?.authority_cost_gross);
  if (gross !== null && gross > 0) return gross;
  const net = toNum(claim?.authority_cost_net);
  return net !== null && net > 0 ? round2(net * (1 + VAT_RATE)) : null;
}

/** The total recorded off the Final Insurer Invoice, once a copy of it has been read. */
export function finalInvoiceTotal(claim) {
  const entry = claim?.invoice_tracker?.items?.[FINAL_INVOICE_KEY] || {};
  const stored = toNum(entry.amount);
  return stored !== null && stored > 0 ? stored : null;
}

/**
 * The repairer's VAT & excess invoice, as the authority check needs it. `applies`
 * is whether this claim handles the client's VAT and excess at all: on any other
 * job the insurer's invoice is the whole repair and the check is made on it
 * alone, so nothing is passed. `filed` is that invoice's own state where the
 * caller holds the filed copies — its copy on file with a figure on it is what
 * makes it part of the check, and a null part is what makes the check wait for it.
 */
export function vatExcessAuthorityPart(applies, filed) {
  if (!applies) return null;
  // A figure on that invoice — even a nil one on a job with nothing to collect —
  // is what it counts at; nothing recorded at all leaves the check waiting.
  return { part: filed?.attached ? toNum(filed.amount) : null };
}

/**
 * The repairer's invoices against the authorised amount. `measured` is what the
 * authority is checked against — the insurer's invoice, or the two invoices added
 * up where the VAT and excess are billed on their own invoice — and `parts` is
 * the working shown with the check. The status is 'match' within the rounding
 * tolerance, 'under' where they ask for less than was authorised, 'over' where
 * they ask for more (which is never allowed), and 'waiting' where the VAT &
 * excess invoice is not on file yet and there is nothing to measure.
 */
export function compareToAuthority(insurerPart, authority, vatExcess = null) {
  const insurer = toNum(insurerPart);
  const authorised = toNum(authority);
  if (insurer === null || authorised === null) return null;

  if (vatExcess && vatExcess.part === null) {
    return {
      status: 'waiting',
      insurerPart: insurer,
      authority: authorised,
      measured: insurer,
      difference: null,
    };
  }

  const vatExcessPart = toNum(vatExcess?.part);
  const measured = vatExcessPart === null ? insurer : round2(insurer + vatExcessPart);
  const difference = round2(measured - authorised);
  const parts = vatExcessPart === null
    ? [{ label: 'Insurer invoice', amount: insurer }]
    : [
      { label: 'Insurer invoice', amount: insurer },
      { label: 'VAT & excess invoice', amount: vatExcessPart },
    ];

  if (Math.abs(difference) <= AUTHORITY_TOLERANCE) {
    return { status: 'match', difference: 0, measured, parts, authority: authorised, insurerPart: insurer, vatExcessPart };
  }
  return {
    status: difference < 0 ? 'under' : 'over',
    difference,
    measured,
    parts,
    authority: authorised,
    insurerPart: insurer,
    vatExcessPart,
  };
}

/**
 * The figures the check was made of, in words: the two invoices added up where
 * the repairer bills us in two parts, and the invoice total on its own everywhere
 * else. Shown with the check so the working is never a mystery.
 */
export function authorityWorkings(comparison) {
  if (!comparison || comparison.status === 'waiting') return '';
  const { parts = [], measured } = comparison;
  if (parts.length < 2) return `Invoice total ${fmtGBP(measured)}`;
  return `${parts[0].label} ${fmtGBP(parts[0].amount)} + ${parts[1].label} ${fmtGBP(parts[1].amount)} = ${fmtGBP(measured)}`;
}

/** How far apart the two figures are, in words: "£300.00 under". */
export function describeDifference(comparison) {
  if (!comparison || comparison.status === 'waiting') return '';
  if (comparison.status === 'match') return 'in line with';
  return `${fmtGBP(Math.abs(comparison.difference))} ${comparison.status}`;
}

/** The key the repairer's VAT & excess invoice is filed under. */
export const VAT_EXCESS_INVOICE_KEY = 'vat_excess_invoice_in';

/**
 * The repairer's two invoices on a job where we handle the client's VAT and
 * excess: the part the insurer pays, and the VAT & excess invoice beside it —
 * the VAT content of their repair plus the excess they collected. The two
 * together ARE the final repair cost, so they are added up against it, within
 * the same 5p as everywhere else. Nothing is stored: the comparison is the
 * figures recorded off the two invoices against the claim's own repair cost.
 */
export function compareRepairCostSplit({ insurerPart, vatExcessPart, repairCost }) {
  const insurer = toNum(insurerPart);
  const vatExcess = toNum(vatExcessPart);
  const repair = toNum(repairCost);
  if (insurer === null || vatExcess === null || repair === null || repair <= 0) return null;

  const total = round2(insurer + vatExcess);
  const difference = round2(total - repair);
  return {
    status: Math.abs(difference) <= AUTHORITY_TOLERANCE ? 'match' : 'differs',
    insurerPart: insurer,
    vatExcessPart: vatExcess,
    total,
    repairCost: repair,
    difference,
  };
}

/**
 * The pre-filled email asking the repairer for a corrected invoice: what was
 * invoiced, what the job was authorised at, and what to send instead.
 */
export function buildReinvoiceEmail({ claim, comparison, user }) {
  const { status, measured, authority, difference, parts = [] } = comparison || {};
  const subject = `Corrected invoice required — Job ${claim?.job_number || '—'} | ${claim?.reg || '—'}`;

  // Where the repairer bills us in two parts, the corrected invoice has to bring
  // the two to the authorised amount between them, so both are named.
  const basis = parts.length > 1
    ? `the insurer's invoice of ${fmtGBP(parts[0].amount)} plus the VAT & excess invoice of ${fmtGBP(parts[1].amount)}, ${fmtGBP(measured)} in all,`
    : `the invoice total of ${fmtGBP(measured)}`;

  const why = status === 'over'
    ? `We're not able to accept it as it stands: ${basis} is ${fmtGBP(Math.abs(difference))} over the ${fmtGBP(authority)} this repair was authorised at. A repairer can't invoice more than the authorised amount.`
    : `We're not able to accept it as it stands: ${basis} is ${fmtGBP(Math.abs(difference))} under the ${fmtGBP(authority)} this repair was authorised at.`;

  const lines = [
    'Hi,',
    '',
    `Thank you for the ${finalInvoiceLabel(claim)} for the repair on ${claim?.reg || 'the vehicle'}.`,
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