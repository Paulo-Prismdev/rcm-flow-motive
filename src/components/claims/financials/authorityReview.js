import { fmtGBP } from '@/components/shared/creditRepairRates';
import { excessMode } from '@/components/shared/excessState';
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
 * authorised at, and the excess it shows. Nothing else is read off it, and none
 * of the invoice's own checks — its number, its parties, the VAT split — apply.
 */

export const AUTHORITY_FIGURES = [
  { key: 'reg', label: 'Vehicle reg' },
  { key: 'amount_total', label: 'Authorised amount (total inc VAT)', type: 'number' },
  { key: 'excess', label: 'Excess shown', type: 'number' },
];

/** The one figure an authority cannot be recorded without. */
export const AUTHORITY_REQUIRED = {
  amount_total: 'Enter the final authorised amount',
};

const FIGURE_DESCRIPTIONS = {
  reg: 'The vehicle registration the authority covers, exactly as printed',
  amount_total: 'The final authorised amount — the total the repair is authorised at, including VAT, as a number',
  excess: 'The policy excess the authority shows, as a number. Leave empty where it shows none.',
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

Return only these three things:
- the vehicle registration the authority covers
- the final authorised amount: the total the repair is authorised at, including VAT
- the excess the authority shows, where it shows one

Rules:
- Only return what is actually printed. Use an empty string for anything that is not there.
- Amounts as numbers with no currency symbols.
- Nothing else is needed: no invoice number, no parties, no VAT split.
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
 * authorised cost, the customer's excess where the authority supplies or
 * corrects it, the file the figures were read from — and, where the comparison
 * with the Final Insurer Invoice was settled here, the re-invoice request left
 * against
 * that invoice and the repair cost an accepted invoice total becomes.
 */
export function buildAuthorityReviewPatch(claim, figures, options = {}) {
  const { file_url, file_name, excessChoice, acceptTotal, reinvoice } = options;
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
 * The figures of an authority that do NOT land on a field of the claim: the
 * amount and the excess are already in the history as their own field changes,
 * so only what the authority holds itself is logged here.
 */
const AUTHORITY_FIGURE_SLOTS = { amount_total: 'authority_cost_gross', excess: 'policy_excess' };

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