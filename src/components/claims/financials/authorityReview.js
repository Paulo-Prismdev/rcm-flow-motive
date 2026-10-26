import { fmtGBP } from '@/components/shared/creditRepairRates';
import { excessMode } from '@/components/shared/excessState';
import { authorityExpectation } from './invoiceAuthorityCheck';
import {
  VAT_RATE,
  confidenceFromExtraction,
  correctionsFromReview,
  figuresFromExtraction,
  figuresNeedingReview,
  rawFromExtraction,
  round2,
  squash,
  toNum,
} from './invoiceReview';

/**
 * Reading a Final Authority off the document it arrives on. An authority is far
 * simpler than an invoice: the registration it covers, the amount the repair was
 * authorised at, and — from its own "customer is responsible for" section — what
 * the customer pays themselves: their VAT status, the excess and any contribution.
 * Those are what split the authorised amount into the part the insurer is billed and
 * the part the customer pays, so they are read with the amount itself. None of the
 * invoice's own checks — its number, its parties, its VAT split — apply.
 */

export const AUTHORITY_FIGURES = [
  { key: 'reg', label: 'Vehicle reg' },
  { key: 'amount_total', label: 'Authorised amount (total inc VAT)', type: 'number' },
  { key: 'excess', label: 'Excess (customer responsible)', type: 'number' },
  { key: 'contributions', label: 'Contributions (customer responsible)', type: 'number' },
  { key: 'customer_vat', label: 'Customer VAT status' },
];

/** The one figure an authority cannot be recorded without. */
export const AUTHORITY_REQUIRED = {
  amount_total: 'Enter the final authorised amount',
};

const FIGURE_DESCRIPTIONS = {
  reg: 'The vehicle registration the authority covers, exactly as printed',
  amount_total: 'The final authorised amount — the total the repair is authorised at, including VAT, as a number',
  excess: "The excess the authority says the customer is responsible for, as a number. Leave empty where it shows none.",
  contributions: "Any other amount the authority says the customer is responsible for (a contribution, betterment or similar), as a number, read on its own. Leave empty where it shows none.",
  customer_vat: 'Who accounts for the VAT on this repair, as the authority puts it: "VAT Registered" where it says the customer is VAT registered or responsible for the VAT, "Non-VAT" where it says they are not, and empty where the authority does not say.',
};

const FIGURE_MAP_PROPERTIES = Object.fromEntries(AUTHORITY_FIGURES.map((f) => [f.key, { type: 'string' }]));

export const AUTHORITY_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    readable: {
      type: 'boolean',
      description: 'True if this is a legible authority or authorisation document. False if the file cannot be read at all.',
    },
    ...Object.fromEntries(AUTHORITY_FIGURES.map((f) => [f.key, {
      type: f.type === 'number' ? 'number' : 'string',
      description: FIGURE_DESCRIPTIONS[f.key],
    }])),
    _confidence: {
      type: 'object',
      description: 'How certain you are of each figure: "high", "medium" or "low". Use "low" for anything blurred, cut off, ambiguous or worked out rather than read.',
      properties: FIGURE_MAP_PROPERTIES,
    },
    _source_snippets: {
      type: 'object',
      description: 'For each figure, the text from the document where you found it, a few words either side. Empty string for figures you could not find.',
      properties: FIGURE_MAP_PROPERTIES,
    },
  },
};

export function buildAuthorityPrompt({ item, claim }) {
  return `Read this document and extract the figures from it. It is filed against "${item?.label || 'Final Authority'}" on claim ${claim?.job_number || ''} for vehicle ${claim?.reg || ''}.

Return only these things:
- the vehicle registration the authority covers
- the final authorised amount: the total the repair is authorised at, including VAT
- the excess the authority shows, read from its "customer is responsible for" section where it has one
- any other amount the same section says the customer is responsible for (a contribution, betterment or similar), read on its own and never added to the excess
- who accounts for the VAT: this is stated as the customer being VAT registered, or responsible for the VAT (return "VAT Registered"), or as VAT not applying to the customer (return "Non-VAT")

Rules:
- Only return what is actually printed. Use an empty string for anything that is not there.
- Amounts as numbers with no currency symbols. Keep each amount separate: never add two of them together, and never split one between two of them.
- The VAT status is a choice of two answers exactly as written above, from what the document says about the customer. Leave it empty where the authority says nothing about it. Never work it out from an amount.
- Nothing else is needed: no invoice number, no parties, no VAT split of the amounts.
- For every figure, give a confidence of "high", "medium" or "low" ("low" for anything blurred, cut off, ambiguous or worked out), and the snippet of text from the document where you found it.
- Set readable to false only if the document cannot be read at all.`;
}

export const emptyAuthorityFigures = () => Object.fromEntries(AUTHORITY_FIGURES.map((f) => [f.key, '']));

/** What the review screen starts with: the figures, the strings they are highlighted by, and the AI's confidence in each. */
export function authorityFiguresForReview(extracted = {}) {
  return {
    figures: figuresFromExtraction(extracted, AUTHORITY_FIGURES),
    raw: rawFromExtraction(extracted, AUTHORITY_FIGURES),
    confidence: confidenceFromExtraction(extracted, AUTHORITY_FIGURES),
  };
}

export const authorityNeedsReview = (figures, confidence) =>
  figuresNeedingReview(figures, confidence, AUTHORITY_FIGURES);

export const authorityCorrections = (figures, raw) =>
  correctionsFromReview(figures, raw, [], AUTHORITY_FIGURES);

/**
 * The policy excess the claim already holds, or null where it holds none. An
 * excess marked TBC on authority counts as none: the figure isn't known yet, so
 * the authority that arrives supplies it.
 */
export function storedExcess(claim) {
  if (claim?.excess_tbc === true) return null;
  const value = claim?.policy_excess;
  return value === null || value === undefined || value === '' ? null : round2(toNum(value));
}

/**
 * What the authority says about the excess, set against the three-way choice the
 * claim holds: the claim's own choice is never moved without being asked, so a
 * difference is put to the user to choose, and an excess the claim hasn't got is
 * filled in — with a claim waiting on the figure whose authority shows none
 * offered as Waived.
 */
export function excessCheck(figures, claim) {
  const read = toNum(figures?.excess);
  const mode = excessMode(claim);
  const stored = storedExcess(claim);
  const tbc = mode === 'tbc';
  // Waived is held as £0, so it reads as such wherever the two are compared.
  const storedLabel = tbc ? 'TBC on authority' : stored === null ? 'no excess' : stored === 0 ? 'Waived' : fmtGBP(stored);
  if (read === null) return { shown: null, stored, storedLabel, mode, tbc, differs: false, fills: false, offersWaive: tbc };
  const shown = round2(read);
  if (stored === null) return { shown, stored: null, storedLabel, mode, tbc, differs: false, fills: true, offersWaive: false };
  return { shown, stored, storedLabel, mode, tbc, differs: Math.abs(stored - shown) >= 0.01, fills: false, offersWaive: false };
}

/**
 * The authority as the review screen has settled it read, with the choices the user
 * made beside it: the excess and the customer's VAT status are whichever of the
 * claim's and the authority's they chose. From those the repair is split the way it
 * is billed — the insurer's share of it, and what the customer pays the repairer
 * themselves — which is what the Final Insurer Invoice is checked against, and what
 * the whole repair comes to.
 */
export function authorityExpectationFromReview({ figures, claim, excessChoice, vatChoice }) {
  const excess = excessCheck(figures, claim);
  const vat = authorityVatCheck(figures, claim);
  return authorityExpectation({
    gross: toNum(figures?.amount_total),
    excess: excess.tbc && excessChoice === 'waived'
      ? 0
      : (excess.fills || (excess.differs && excessChoice === 'authority'))
        ? excess.shown
        : excess.shown !== null ? excess.stored : (excess.tbc ? 'tbc' : (excess.stored ?? 0)),
    contributions: toNum(figures?.contributions),
    vatStatus: !vat.shown || (vat.differs && vatChoice !== 'authority')
      ? (claim?.client_vat_status || '')
      : vat.shown,
  });
}

/**
 * What the authority says about who accounts for the VAT, set against the claim's
 * own customer VAT status. The status decides whether the VAT is billed to the
 * insurer or paid by the customer, so a claim that hasn't got one is filled in, and
 * a difference is put to the user rather than moving the claim's own setting.
 */
export function authorityVatCheck(figures, claim) {
  const printed = String(figures?.customer_vat || '').trim();
  const stored = claim?.client_vat_status || null;
  const unknown = !printed || printed === 'Unknown';
  const shown = unknown ? null : printed;
  if (shown === null) return { shown: null, stored, differs: false, fills: false };
  if (!stored || stored === 'Unknown') return { shown, stored, differs: false, fills: true };
  return { shown, stored, differs: shown !== stored, fills: false };
}

/**
 * The registration check: an authority is only worth anything on the job it
 * belongs to, so a different vehicle — or none printed at all — is flagged.
 */
export function checkAuthorityReg(figures, claim) {
  const printed = String(figures?.reg || '').trim();
  if (!claim?.reg) return null;
  if (!printed) {
    return {
      kind: 'missing',
      text: `No registration was found on this authority, so it can't be matched to ${claim.reg} on this claim.`,
    };
  }
  if (squash(printed) !== squash(claim.reg)) {
    return {
      kind: 'mismatch',
      text: `This authority is for ${printed}, but the vehicle on this claim is ${claim.reg}.`,
    };
  }
  return null;
}

const AUTHORITY_ITEM_KEY = 'final_authority';
const FINAL_INVOICE_KEY = 'final_invoice';

/**
 * The patch that records an authority: the authorised amount against the claim's
 * authorised cost, the customer's excess and VAT status where the authority supplies
 * or corrects them, the contributions it holds against the authority's own entry,
 * the file the figures were read from — and, where the comparison with the Final
 * Insurer Invoice was settled here, the re-invoice request left against that invoice
 * and the repair cost an accepted invoice becomes.
 */
export function buildAuthorityReviewPatch(claim, figures, options = {}) {
  const { file_url, file_name, excessChoice, vatChoice, acceptTotal, reinvoice } = options;
  const source = claim?.invoice_tracker || {};
  const items = { ...(source.items || {}) };
  const entry = { ...(items[AUTHORITY_ITEM_KEY] || {}) };
  const patch = {};

  const total = toNum(figures?.amount_total);
  if (total !== null) {
    // The authorised cost is the claim's own field: the total as printed, with
    // the net worked back out of it the way the claim's figures already do it.
    patch.authority_cost_gross = round2(total);
    patch.authority_cost_net = round2(total / (1 + VAT_RATE));
    entry.amount = round2(total);
  }

  const excess = excessCheck(figures, claim);
  if (excess.tbc && excessChoice === 'waived') {
    // The authority shows no excess, so the TBC resolves to nothing payable.
    patch.policy_excess = 0;
    patch.excess_tbc = false;
  } else if (excess.fills || (excess.differs && excessChoice === 'authority')) {
    patch.policy_excess = excess.shown;
    // The authority has supplied the figure, so it is nothing left to confirm.
    if (excess.tbc) patch.excess_tbc = false;
  }

  // Who accounts for the VAT decides whether it is billed to the insurer or paid by
  // the customer, so the authority's own answer fills a claim that hasn't got one,
  // and replaces the claim's only where that was chosen.
  const vat = authorityVatCheck(figures, claim);
  if (vat.fills || (vat.differs && vatChoice === 'authority')) {
    patch.client_vat_status = vat.shown;
  }

  // The contributions the authority holds the customer responsible for are kept
  // against the authority's own entry: they are the authority's figures, not a
  // claim setting, and the expected insurer's invoice is worked out from them.
  const contributions = toNum(figures?.contributions);
  if (contributions !== null) entry.contributions = round2(contributions);

  if (file_url) {
    entry.details_source = { file_url, file_name: file_name || '', at: new Date().toISOString() };
  }
  items[AUTHORITY_ITEM_KEY] = entry;

  if (reinvoice) {
    const invoice = { ...(items[FINAL_INVOICE_KEY] || {}) };
    invoice.reinvoice_requested = {
      at: new Date().toISOString(),
      by: reinvoice.by || '',
      invoice_total: reinvoice.invoice_total,
      authority_amount: reinvoice.authority,
    };
    items[FINAL_INVOICE_KEY] = invoice;
  }

  if (acceptTotal !== null && acceptTotal !== undefined) {
    patch.final_repair_cost = round2(acceptTotal);
  }

  patch.invoice_tracker = { ...source, items };
  return patch;
}

/**
 * The figures of an authority that do NOT land on a field of the claim: the amount,
 * the excess and the customer's VAT status are already in the history as their own
 * field changes, so only what the authority holds itself — its contributions — is
 * logged here.
 */
const AUTHORITY_FIGURE_SLOTS = {
  amount_total: 'authority_cost_gross',
  excess: 'policy_excess',
  customer_vat: 'client_vat_status',
};

/** The activity history lines for an authority: what was read, changed and accepted. */
export function buildAuthorityLog({ item, figures, corrections, accepted }) {
  const label = item?.label || 'Final Authority';
  const total = toNum(figures.amount_total);
  const excess = toNum(figures.excess);

  const entries = [{
    action: 'Authority Read',
    description: `${label}: ${total !== null ? `${fmtGBP(total)} authorised` : 'amount not read'}, vehicle ${figures.reg || 'registration not read'}${excess !== null ? `, excess ${excess === 0 ? 'none shown' : fmtGBP(excess)}` : ''}. Figures read from the uploaded document and checked before saving.`,
  }];

  corrections
    .filter((c) => !AUTHORITY_FIGURE_SLOTS[c.key])
    .forEach((c) => entries.push({
      action: 'Financials Updated',
      fieldName: `${label} — ${c.label}`,
      oldValue: c.from,
      newValue: c.to,
      description: `${label}: ${c.label.toLowerCase()} corrected after reading the authority — ${c.from || '(not read)'} → ${c.to || '(left blank)'}.`,
    }));

  accepted.forEach((a) => entries.push({
    action: 'Financials Updated',
    description: `${label}: ${a}`,
  }));

  return entries;
}