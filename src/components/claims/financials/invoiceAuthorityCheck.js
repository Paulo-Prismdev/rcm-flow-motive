import { fmtGBP } from '@/components/shared/creditRepairRates';
import { excessMode } from '@/components/shared/excessState';
import { VAT_RATE, round2, toNum } from './invoiceReview';
import { finalInvoiceLabel, isPrivatePayingClaim, recordedFinalInvoiceTotal } from '@/components/shared/invoiceChecklist';

/**
 * The check between the repairer's Final Insurer Invoice and the Final Authority.
 *
 * The insurer's invoice is never the whole repair: the authorised amount includes
 * the part the customer pays themselves, so what the insurer is billed depends on
 * the customer's own position. It is the authorised amount EXCLUDING VAT, plus VAT
 * only where the customer is NOT VAT registered (a VAT registered customer accounts
 * for the VAT themselves), less the customer's excess and less any other
 * contribution they are responsible for.
 *
 * The rest — the VAT where they ARE registered, the excess and the contributions —
 * is what the customer pays the repairer, and the two together are the full cost of
 * the repair, which is what the claim's final repair cost has to be: every fee and
 * invoice worked out from it is worked out from the whole repair, not the insurer's
 * share of it.
 *
 * Nothing here is stored: the expectation is worked out from the claim's own fields
 * (its authorised costs, the customer's VAT status, the excess and the contributions
 * the authority showed), so a later change to any of them flags itself. Where the
 * customer's VAT status is not known, the VAT is left on the insurer's invoice — it
 * is only taken off where the claim says the customer is VAT registered.
 */

/** Within 5p the two figures are the same figure, rounded differently. */
export const AUTHORITY_TOLERANCE = 0.05;

/** The key the Final Insurer Invoice is filed under. */
export const FINAL_INVOICE_KEY = 'final_invoice';

/** The key the repairer's VAT & excess invoice is filed under. */
export const VAT_EXCESS_INVOICE_KEY = 'vat_excess_invoice_in';

const VAT_REGISTERED = 'VAT Registered';
const VAT_NOT_REGISTERED = 'Non-VAT';

/** The VAT registered / not registered answer, and whether we have one at all. */
export const vatStatusKnown = (status) => status === VAT_REGISTERED || status === VAT_NOT_REGISTERED;

/**
 * The contributions the authority's "customer is responsible for" section showed,
 * kept against the authority's own entry on the claim.
 */
export const authorityContributions = (claim) =>
  toNum(claim?.invoice_tracker?.items?.final_authority?.contributions) || 0;

/**
 * The authority read as the two figures the repair is split into: what the
 * insurer's invoice should come to (`expected`), and what the customer pays the
 * repairer themselves (`customerShare`). `excess` may be the word 'tbc', which is
 * not a figure at all — the split can't be worked out until the excess is known, so
 * both figures are null and the check waits.
 */
export function authorityExpectation({ gross, net, excess, contributions, vatStatus } = {}) {
  const readGross = toNum(gross);
  const readNet = toNum(net);
  const resolvedGross = readGross !== null && readGross > 0
    ? round2(readGross)
    : readNet !== null && readNet > 0 ? round2(readNet * (1 + VAT_RATE)) : null;
  if (resolvedGross === null) return null;

  const resolvedNet = readNet !== null && readNet > 0 ? round2(readNet) : round2(resolvedGross / (1 + VAT_RATE));
  const vat = round2(resolvedGross - resolvedNet);
  const vatRegistered = vatStatus === VAT_REGISTERED;
  const excessTbc = excess === 'tbc';
  const excessAmount = excessTbc ? null : round2(toNum(excess) ?? 0);
  const contributed = round2(toNum(contributions) ?? 0);

  return {
    net: resolvedNet,
    vat,
    gross: resolvedGross,
    vatStatus: vatStatus || '',
    vatRegistered,
    vatStatusKnown: vatStatusKnown(vatStatus),
    excess: excessAmount,
    excessTbc,
    contributions: contributed,
    expected: excessTbc ? null : round2(resolvedNet + (vatRegistered ? 0 : vat) - excessAmount - contributed),
    customerShare: excessTbc ? null : round2((vatRegistered ? vat : 0) + excessAmount + contributed),
  };
}

/** The same, read off the claim's own fields. Null where the job has no insurer. */
export function claimAuthorityExpectation(claim) {
  if (!claim || isPrivatePayingClaim(claim)) return null;
  return authorityExpectation({
    gross: claim.authority_cost_gross,
    net: claim.authority_cost_net,
    excess: excessMode(claim) === 'tbc' ? 'tbc' : round2(toNum(claim.policy_excess) ?? 0),
    contributions: authorityContributions(claim),
    vatStatus: claim.client_vat_status,
  });
}

/**
 * The total recorded off the repairer's final invoice, once a copy of it has been
 * read: the figure the authority check measures and, on a job the customer pays for
 * privately, the figure our invoice to them bills. Read in one place for both
 * (see invoiceChecklist.recordedFinalInvoiceTotal).
 */
export const finalInvoiceTotal = recordedFinalInvoiceTotal;

/**
 * The repairer's VAT & excess invoice, as the customer's share of the repair is
 * checked against it. `applies` is whether this claim handles the client's VAT and
 * excess at all: on any other job the customer settles their own VAT and excess with
 * the repairer directly and there is no such invoice to agree with. `filed` is that
 * invoice's own state where the caller holds the filed copies — a figure on it once
 * its copy is on file is what the check has to measure against.
 */
export function vatExcessAuthorityPart(applies, filed) {
  if (!applies) return null;
  return { part: filed?.attached ? toNum(filed.amount) : null };
}

/**
 * The insurer's invoice against what the authority says it should be. `status` is
 * 'match' within the rounding tolerance, 'under' where the repairer's invoice asks
 * for less than the insurer's share comes to, 'over' where they ask for more (which
 * is never allowed), and 'waiting' where the customer's excess is still TBC on
 * authority and the insurer's share cannot be worked out until it is known.
 *
 * `fullCost` is the whole repair as actually invoiced — the insurer's invoice plus
 * what the customer pays the repairer — and `fullDifference` is how far that is from
 * the authorised total, which is what it should come to.
 */
export function compareToAuthority(insurerPart, expectation, vatExcess = null) {
  const insurer = toNum(insurerPart);
  if (!expectation || insurer === null) return null;
  if (expectation.excessTbc) {
    return {
      status: 'waiting',
      reason: 'excess_tbc',
      insurerPart: insurer,
      expectation,
      expected: null,
      authority: expectation.gross,
      customerShare: null,
      difference: null,
      fullCost: null,
      fullDifference: null,
      shareCheck: null,
    };
  }

  const difference = round2(insurer - expectation.expected);
  const status = Math.abs(difference) <= AUTHORITY_TOLERANCE ? 'match' : difference < 0 ? 'under' : 'over';
  const fullCost = round2(insurer + expectation.customerShare);
  const fullDifference = round2(fullCost - expectation.gross);
  const onFile = toNum(vatExcess?.part);
  const shareCheck = onFile === null
    ? null
    : {
      invoice: onFile,
      expected: expectation.customerShare,
      difference: round2(onFile - expectation.customerShare),
      agrees: Math.abs(round2(onFile - expectation.customerShare)) <= AUTHORITY_TOLERANCE,
    };

  return {
    status,
    insurerPart: insurer,
    expectation,
    // Kept so a screen that says "the invoice total" still means what was invoiced,
    // and every reading of the insured part reads the same figure.
    measured: insurer,
    expected: expectation.expected,
    authority: expectation.gross,
    customerShare: expectation.customerShare,
    difference,
    fullCost,
    fullDifference,
    shareCheck,
  };
}

/**
 * The repairer's two invoices on a job where we handle the client's VAT and excess:
 * the part the insurer pays, and the VAT & excess invoice beside it — the customer's
 * share of the repair, which is what that invoice bills. The two together ARE the
 * final repair cost, so they are checked against it, within the same 5p as
 * everywhere else. Nothing is stored: the comparison is the figures recorded off the
 * two invoices against the claim's own repair cost.
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
 * The expected insurer's figure and how it is reached, in words: the authorised
 * amount ex VAT, the VAT where the customer isn't registered, the excess and any
 * contributions taken off, and what is left.
 */
export function expectationWorkings(expectation) {
  if (!expectation || expectation.excessTbc) return '';
  const parts = [`Authorised ${fmtGBP(expectation.net)} ex VAT`];
  if (!expectation.vatRegistered) parts.push(`+ ${fmtGBP(expectation.vat)} VAT`);
  if (expectation.excess) parts.push(`− ${fmtGBP(expectation.excess)} excess`);
  if (expectation.contributions) parts.push(`− ${fmtGBP(expectation.contributions)} contributions`);
  if (expectation.vatRegistered) parts.push('(customer VAT registered, so no VAT)');
  else if (!expectation.vatStatusKnown) parts.push("(customer's VAT status not set, so the VAT is left on the insurer's invoice)");
  parts.push(`= ${fmtGBP(expectation.expected)} expected`);
  return parts.join(' ');
}

/** The same working, read off a comparison. */
export function authorityWorkings(comparison) {
  return expectationWorkings(comparison?.expectation);
}

/** What the customer pays the repairer themselves, in words. */
export function customerShareWorkings(expectation) {
  if (!expectation || expectation.excessTbc) return '';
  const terms = [];
  if (expectation.vatRegistered && expectation.vat) terms.push(`${fmtGBP(expectation.vat)} VAT`);
  if (expectation.excess) terms.push(`${fmtGBP(expectation.excess)} excess`);
  if (expectation.contributions) terms.push(`${fmtGBP(expectation.contributions)} contributions`);
  if (terms.length === 0) return 'Customer pays the repairer: nothing — no VAT, no excess';
  return `Customer pays repairer: ${terms.join(' + ')} = ${fmtGBP(expectation.customerShare)}`;
}

/** The whole repair, as it is actually invoiced, against the authorised total. */
export function fullCostWorkings(comparison) {
  if (!comparison || comparison.fullCost === null) return '';
  const { insurerPart, customerShare, fullCost, authority, fullDifference } = comparison;
  const against = Math.abs(fullDifference) <= AUTHORITY_TOLERANCE
    ? `in line with the authorised ${fmtGBP(authority)}`
    : `${fmtGBP(Math.abs(fullDifference))} ${fullDifference < 0 ? 'under' : 'over'} the authorised ${fmtGBP(authority)}`;
  return `Full repair cost ${fmtGBP(insurerPart)} insurer invoice + ${fmtGBP(customerShare)} customer = ${fmtGBP(fullCost)} — ${against}`;
}

/** What the customer's share is billed on, where we collect the VAT and excess. */
export function customerShareNote(comparison) {
  const check = comparison?.shareCheck;
  if (!check) return '';
  return check.agrees
    ? `The VAT & Excess Invoice of ${fmtGBP(check.invoice)} agrees with the customer's share of ${fmtGBP(check.expected)}.`
    : `The VAT & Excess Invoice reads ${fmtGBP(check.invoice)}, but the customer's share is ${fmtGBP(check.expected)} — ${fmtGBP(Math.abs(check.difference))} apart.`;
}

/**
 * The pre-filled email asking the repairer for a corrected invoice: what was
 * invoiced, what the insurer's share of the repair comes to and why, and what to
 * send instead.
 */
export function buildReinvoiceEmail({ claim, comparison, user }) {
  const { status, insurerPart, expected, authority, expectation } = comparison || {};
  const subject = `Corrected invoice required — Job ${claim?.job_number || '—'} | ${claim?.reg || '—'}`;

  const basis = [
    `the repair was authorised at ${fmtGBP(authority)} in total, ${fmtGBP(expectation?.net ?? 0)} of it excluding VAT`,
    expectation && !expectation.vatRegistered
      ? `and the customer is not VAT registered, so VAT is invoiced too`
      : `and the customer is VAT registered, so no VAT is invoiced`,
    expectation?.excess ? `${fmtGBP(expectation.excess)} of it is the customer's excess` : null,
    expectation?.contributions ? `${fmtGBP(expectation.contributions)} of it is the customer's contribution` : null,
  ].filter(Boolean).join(', ');

  const why = status === 'over'
    ? `We're not able to accept it as it stands: the invoice total of ${fmtGBP(insurerPart)} is ${fmtGBP(Math.abs(comparison.difference))} over the ${fmtGBP(expected)} the insurer's part of this repair comes to — ${basis}. A repairer can't invoice more than was authorised.`
    : `We're not able to accept it as it stands: the invoice total of ${fmtGBP(insurerPart)} is ${fmtGBP(Math.abs(comparison.difference))} under the ${fmtGBP(expected)} the insurer's part of this repair comes to — ${basis}.`;

  const lines = [
    'Hi,',
    '',
    `Thank you for the ${finalInvoiceLabel(claim)} for the repair on ${claim?.reg || 'the vehicle'}.`,
    '',
    why,
    '',
    `Please send a corrected invoice at ${fmtGBP(expected)} and we will process it straight away.`,
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