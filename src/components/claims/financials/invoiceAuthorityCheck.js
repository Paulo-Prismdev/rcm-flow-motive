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
 * Every authority the claim holds, as the single figure the repair was authorised at.
 * The Final Authority's own record is used where one has arrived; otherwise the initial
 * and the supplementary authorised totals are added together. Each authority keeps its
 * own figures — the initial and supplementary ones come off the documents read in the
 * claim's Documents panel — so none overwrites another, and this is the one place they
 * are read as the authorised total the insurer's invoice is measured against.
 */
export function authorityTotals(claim) {
  if (!claim) return null;
  const final = toNum(claim?.invoice_tracker?.items?.final_authority?.amount);
  if (final !== null && final > 0) {
    return { gross: round2(final), final: true, initial: null, supplementary: null, source: 'final' };
  }
  const documents = claim?.invoice_tracker?.documents || {};
  const positive = (a, b) => {
    const first = toNum(a);
    if (first !== null && first > 0) return round2(first);
    const second = toNum(b);
    return second !== null && second > 0 ? round2(second) : 0;
  };
  const initial = positive(claim?.authority_cost_gross, documents.initial_authority?.gross);
  const supplementary = positive(documents.supplementary_authority?.gross, claim?.supplementary_authority_cost_gross);
  const gross = round2(initial + supplementary);
  if (gross <= 0) return null;
  return {
    gross,
    initial,
    supplementary,
    final: false,
    source: supplementary > 0 ? 'combined' : 'initial',
  };
}

/**
 * The contributions the authorities' "customer is responsible for" sections showed. The
 * Final Authority's own record is used where one has arrived — it is what the excess and
 * the authorised amount are settled from at close-out — and otherwise the initial and
 * supplementary authorities' contributions are added together.
 */
export const authorityContributions = (claim) => {
  const items = claim?.invoice_tracker?.items || {};
  const final = toNum(items.final_authority?.contributions);
  if (final !== null) return final || 0;
  const documents = claim?.invoice_tracker?.documents || {};
  return round2((toNum(documents.initial_authority?.contributions) || 0)
    + (toNum(documents.supplementary_authority?.contributions) || 0));
};

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

/**
 * The same, read off the claim's own records: the Final Authority where one has
 * arrived, and otherwise the initial plus supplementary authorised total. Null where
 * the job has no authority at all to measure the invoice against.
 */
export function claimAuthorityExpectation(claim) {
  if (!claim || isPrivatePayingClaim(claim)) return null;
  const authority = authorityTotals(claim);
  if (!authority) return null;
  return authorityExpectation({
    gross: authority.gross,
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

/* ── The whole repair on one invoice, split between the payers ───────────── *
 * Repairers commonly bill the whole repair on a single invoice and split it on the
 * document: the full total, then an "amount payable by" line for the insurer and
 * another for the customer. Read as the total alone that invoice contradicts itself
 * — the insurer's share of it looks like an over-invoice, the customer's half gets
 * counted into the repair cost a second time, and the invoice's own arithmetic still
 * adds up, so one check objects while another says everything matches.
 *
 * So where the invoice prints that split the two shares are read beside the total
 * and each is measured against its own half of the authorisation: the insurer's
 * share against the insurer's share, the customer's against theirs, and the full
 * total against the authorised amount, which it can never be more than. The whole
 * repair is then the invoice's own total — its two halves together, never the total
 * plus the customer's share again.
 *
 * It is the customer's line that makes an invoice a split one: an invoice carrying
 * just the insurer's amount is billing the insurer for the whole of it, and is read
 * exactly as it always was.
 */

/** The figures an invoice prints when it splits its total between the payers. */
export const splitFromFigures = (figures = {}) => ({
  insurer: toNum(figures?.payable_insurer),
  customer: toNum(figures?.payable_customer),
  total: toNum(figures?.amount_total),
});

/** Whether the invoice splits its total: a customer's share printed beside the insurer's. */
export const hasSplit = (split) => toNum(split?.customer) !== null;

/** The same three figures, read off the Final Insurer Invoice recorded on a claim. */
export function claimInvoicedSplit(claim) {
  const entry = claim?.invoice_tracker?.items?.[FINAL_INVOICE_KEY] || {};
  return {
    insurer: toNum(entry.figures?.payable_insurer),
    customer: toNum(entry.figures?.payable_customer),
    total: recordedFinalInvoiceTotal(claim),
  };
}

/**
 * The insurer's invoice against what the authority says it should be. `status` is
 * 'match' within the rounding tolerance, 'under' where the repairer's invoice asks
 * for less than the insurer's share comes to, 'over' where they ask for more (which
 * is never allowed), and 'waiting' where the customer's excess is still TBC on
 * authority and the insurer's share cannot be worked out until it is known.
 *
 * `fullCost` is the whole repair as actually invoiced — a split invoice's own total,
 * or the insurer's invoice plus what the customer pays the repairer — and
 * `fullDifference` is how far that is from the authorised total, which is what it
 * should come to.
 *
 * `split` is the invoice's own split of the repair where the document prints one.
 * `checks` are the individual checks the split is held to, each with a tick or a
 * cross, and `headline` is the most serious of them, so a screen can show one
 * verdict rather than two that disagree.
 */
export function compareToAuthority(insurerPart, expectation, vatExcess = null, split = null) {
  const invoiceTotal = toNum(insurerPart);
  if (!expectation || invoiceTotal === null) return null;

  const onSplit = hasSplit(split);
  const splitInsurer = toNum(split?.insurer);
  const splitCustomer = toNum(split?.customer);
  // What the insurer is billed on this invoice: the figure it prints payable by
  // them, and where it prints only the customer's line, what is left of the total.
  const insurer = onSplit ? (splitInsurer ?? round2(invoiceTotal - splitCustomer)) : invoiceTotal;
  // The whole repair as the invoice reads it. A split invoice's own total is its two
  // halves together; an invoice billing the insurer on its own has the customer's
  // share of the repair beside it.
  const fullCost = onSplit ? invoiceTotal : round2(insurer + expectation.customerShare);

  // The full total against the authorised amount: it can never be more, and that
  // holds whatever the customer's excess turns out to be, so it is checked even
  // while the excess is still TBC on authority.
  const totalDifference = onSplit ? round2(invoiceTotal - expectation.gross) : 0;
  const totalOver = onSplit && totalDifference > AUTHORITY_TOLERANCE;
  const totalCheck = onSplit ? {
    key: 'total',
    label: 'The full repair against the authorised total',
    ok: !totalOver,
    detail: totalOver
      ? `The invoice comes to ${fmtGBP(invoiceTotal)}, ${fmtGBP(totalDifference)} over the ${fmtGBP(expectation.gross)} the repair was authorised at — the full repair can never be more than was authorised.`
      : `The invoice's ${fmtGBP(invoiceTotal)} is within the ${fmtGBP(expectation.gross)} the repair was authorised at${totalDifference < -AUTHORITY_TOLERANCE ? `, ${fmtGBP(Math.abs(totalDifference))} under it` : ''}.`,
  } : null;

  const shared = {
    insurerPart: insurer,
    measured: invoiceTotal,
    split: onSplit ? { insurer, customer: splitCustomer, total: invoiceTotal } : null,
    invoicedCustomer: onSplit ? splitCustomer : null,
    expectation,
    authority: expectation.gross,
    fullCost,
    totalDifference,
  };

  if (expectation.excessTbc) {
    return {
      ...shared,
      status: totalOver ? 'over' : 'waiting',
      reason: totalOver ? 'total_over' : 'excess_tbc',
      overReason: totalOver ? 'total' : null,
      expected: null,
      customerShare: null,
      difference: null,
      fullDifference: onSplit ? totalDifference : null,
      shareCheck: null,
      checks: totalCheck ? [totalCheck] : [],
      headline: totalOver
        ? { tone: 'block', text: totalCheck.detail }
        : {
          tone: 'wait',
          text: `Waiting for the policy excess. The excess is TBC on authority, and the insurer's share of the repair — the authorised ${fmtGBP(expectation.net)} ex VAT less the customer's excess — can't be worked out until it is known. The invoice of ${fmtGBP(insurer)} is checked against it as soon as the excess is set.`,
        },
    };
  }

  const difference = round2(insurer - expectation.expected);
  const insurerStatus = Math.abs(difference) <= AUTHORITY_TOLERANCE ? 'match' : difference < 0 ? 'under' : 'over';
  const status = totalOver || insurerStatus === 'over' ? 'over' : insurerStatus;
  const overReason = totalOver ? 'total' : insurerStatus === 'over' ? 'insurer' : null;

  const onFile = toNum(vatExcess?.part);
  const shareCheck = onFile === null
    ? null
    : {
      invoice: onFile,
      expected: expectation.customerShare,
      difference: round2(onFile - expectation.customerShare),
      agrees: Math.abs(round2(onFile - expectation.customerShare)) <= AUTHORITY_TOLERANCE,
    };

  const customerDifference = onSplit ? round2(splitCustomer - expectation.customerShare) : null;
  const sharesSum = onSplit ? round2(insurer + splitCustomer) : null;
  const sharesOk = onSplit ? Math.abs(round2(sharesSum - invoiceTotal)) <= AUTHORITY_TOLERANCE : null;

  const checks = [];
  if (onSplit) {
    checks.push({
      key: 'insurer',
      label: "The insurer's share",
      ok: insurerStatus === 'match',
      detail: insurerStatus === 'match'
        ? `${fmtGBP(insurer)} payable by the insurer — what the insurer's share of this repair comes to.`
        : `${fmtGBP(insurer)} payable by the insurer, against the ${fmtGBP(expectation.expected)} the insurer's share of this repair comes to — ${fmtGBP(Math.abs(difference))} ${difference < 0 ? 'under' : 'over'}.`,
    });
    const terms = customerShareTerms(expectation);
    checks.push({
      key: 'customer',
      label: "The customer's share",
      ok: Math.abs(customerDifference) <= AUTHORITY_TOLERANCE,
      detail: `${fmtGBP(splitCustomer)} payable by the customer${terms.length ? ` (${terms.join(' + ')})` : ''}, against the ${fmtGBP(expectation.customerShare)} their share of this repair comes to${Math.abs(customerDifference) <= AUTHORITY_TOLERANCE ? '' : ` — ${fmtGBP(Math.abs(customerDifference))} ${customerDifference < 0 ? 'under' : 'over'}`}.`,
    });
    checks.push(totalCheck);
    checks.push({
      key: 'split',
      label: 'The two shares against the invoice total',
      ok: sharesOk,
      detail: sharesOk
        ? `${fmtGBP(insurer)} for the insurer plus ${fmtGBP(splitCustomer)} for the customer come to the ${fmtGBP(invoiceTotal)} invoiced.`
        : `The two shares come to ${fmtGBP(sharesSum)}, but the invoice total reads ${fmtGBP(invoiceTotal)} — ${fmtGBP(Math.abs(round2(sharesSum - invoiceTotal)))} apart.`,
    });
  }
  // A split invoice's own checks are what the screen lists, so the VAT & Excess
  // Invoice is one of them. On an invoice printed as a single amount it is said
  // beside the customer's share instead, as it always was.
  if (shareCheck && onSplit) {
    checks.push({
      key: 'vat_excess',
      label: 'The VAT & Excess Invoice',
      ok: shareCheck.agrees,
      detail: shareCheck.agrees
        ? `The VAT & Excess Invoice of ${fmtGBP(shareCheck.invoice)} agrees with the customer's share of ${fmtGBP(shareCheck.expected)}.`
        : `The VAT & Excess Invoice reads ${fmtGBP(shareCheck.invoice)}, but the customer's share of this repair is ${fmtGBP(shareCheck.expected)} — ${fmtGBP(Math.abs(shareCheck.difference))} apart.`,
    });
  }

  // One headline: a blocking result first, then the first check that doesn't hold,
  // and plain agreement only when there is nothing left to say.
  const failing = checks.filter((c) => !c.ok);
  const tone = status === 'over' ? 'block' : (insurerStatus === 'under' || failing.length > 0) ? 'warn' : 'ok';
  const headline = {
    tone,
    text: status === 'over'
      ? (overReason === 'total'
        ? totalCheck.detail
        : `${expectationWorkings(expectation)}. The insurer's share of ${fmtGBP(insurer)} is ${fmtGBP(Math.abs(difference))} over that — a repairer can't invoice the insurer more than its share of the authorised amount.`)
      : insurerStatus === 'under'
        ? `${expectationWorkings(expectation)}. ${onSplit ? `The invoice puts ${fmtGBP(insurer)} on the insurer` : `The invoice total of ${fmtGBP(insurer)}`}, ${fmtGBP(Math.abs(difference))} under that.`
        : failing.length > 0
          ? failing[0].detail
          : onSplit
            ? `The invoice splits the full repair of ${fmtGBP(invoiceTotal)} the way the authorisation does: ${fmtGBP(insurer)} payable by the insurer and ${fmtGBP(splitCustomer)} by the customer.`
            : `${expectationWorkings(expectation)} — the invoice total of ${fmtGBP(insurer)} matches.`,
  };

  return {
    ...shared,
    status,
    overReason,
    expected: expectation.expected,
    customerShare: expectation.customerShare,
    difference,
    fullDifference: round2(fullCost - expectation.gross),
    shareCheck,
    checks,
    headline,
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

/** The parts the customer's own share of the repair is made of, in words. */
function customerShareTerms(expectation) {
  const terms = [];
  if (expectation.vatRegistered && expectation.vat) terms.push(`${fmtGBP(expectation.vat)} VAT`);
  if (expectation.excess) terms.push(`${fmtGBP(expectation.excess)} excess`);
  if (expectation.contributions) terms.push(`${fmtGBP(expectation.contributions)} contributions`);
  return terms;
}

/** What the customer pays the repairer themselves, in words. */
export function customerShareWorkings(expectation) {
  if (!expectation || expectation.excessTbc) return '';
  const terms = customerShareTerms(expectation);
  if (terms.length === 0) return 'Customer pays the repairer: nothing — no VAT, no excess';
  return `Customer pays repairer: ${terms.join(' + ')} = ${fmtGBP(expectation.customerShare)}`;
}

/** The whole repair, as it is actually invoiced, against the authorised total. */
export function fullCostWorkings(comparison) {
  if (!comparison || comparison.fullCost === null) return '';
  const { split, insurerPart, customerShare, fullCost, authority, fullDifference } = comparison;
  const against = Math.abs(fullDifference) <= AUTHORITY_TOLERANCE
    ? `in line with the authorised ${fmtGBP(authority)}`
    : `${fmtGBP(Math.abs(fullDifference))} ${fullDifference < 0 ? 'under' : 'over'} the authorised ${fmtGBP(authority)}`;
  const sum = split
    ? `${fmtGBP(split.insurer)} insurer + ${fmtGBP(split.customer)} customer on the invoice`
    : `${fmtGBP(insurerPart)} insurer invoice + ${fmtGBP(customerShare)} customer`;
  return `Full repair cost ${sum} = ${fmtGBP(fullCost)} — ${against}`;
}

/**
 * The whole repair in a few words, for a claim's own history: how the invoice that
 * supplied it reads. A split invoice carries both halves in its total, so its total
 * is the repair — naming them apart is what says so.
 */
export function repairCostWords(comparison) {
  if (!comparison) return '';
  const { split, insurerPart, customerShare, fullCost } = comparison;
  return split
    ? `the invoice's own full total of ${fmtGBP(fullCost)}, which it splits into ${fmtGBP(split.insurer)} for the insurer and ${fmtGBP(split.customer)} for the customer`
    : `the insurer's invoice of ${fmtGBP(insurerPart)} plus the customer's ${fmtGBP(customerShare)}`;
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

  // An invoice that splits the repair between its payers is spoken about by the
  // share it puts on the insurer, which is the figure being questioned.
  const invoiced = comparison?.split
    ? `the insurer's share of ${fmtGBP(insurerPart)} on the invoice`
    : `the invoice total of ${fmtGBP(insurerPart)}`;

  const why = status === 'over'
    ? `We're not able to accept it as it stands: ${invoiced} is ${fmtGBP(Math.abs(comparison.difference))} over the ${fmtGBP(expected)} the insurer's part of this repair comes to — ${basis}. A repairer can't invoice more than was authorised.`
    : `We're not able to accept it as it stands: ${invoiced} is ${fmtGBP(Math.abs(comparison.difference))} under the ${fmtGBP(expected)} the insurer's part of this repair comes to — ${basis}.`;

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