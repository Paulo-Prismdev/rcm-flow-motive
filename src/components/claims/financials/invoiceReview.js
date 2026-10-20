import { fmtGBP } from '@/components/shared/creditRepairRates';
import {
  INVOICE_ITEMS,
  getInvoiceItemState,
  invoicePartyName,
  resolveInvoiceAmount,
} from '@/components/shared/invoiceChecklist';

/**
 * Reading an invoice off the document the user uploaded: the figures we ask the
 * AI for, the prompts and schemas, and the fail-safes that run over what it
 * found before anything is saved to the claim.
 */

export const VAT_RATE = 0.2;
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const toNum = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isNaN(n) ? null : n;
};

/** The figures we read off an invoice, in the order they are reviewed. */
export const INVOICE_FIGURES = [
  { key: 'invoice_number', label: 'Invoice number' },
  { key: 'invoice_date', label: 'Invoice date', type: 'date' },
  { key: 'party_from', label: 'From' },
  { key: 'party_to', label: 'To' },
  { key: 'amount_ex_vat', label: 'Amount ex VAT', type: 'number' },
  { key: 'vat_amount', label: 'VAT', type: 'number' },
  { key: 'amount_total', label: 'Total inc VAT', type: 'number' },
  { key: 'reg', label: 'Vehicle reg' },
  { key: 'job_number', label: 'Job number' },
];

/** Figures we cannot record an invoice without. */
export const REQUIRED_FIGURES = {
  invoice_number: 'Enter the invoice number',
  invoice_date: 'Enter the invoice date',
  amount_total: 'Enter the invoice total',
};

/** What the AI is asked for, figure by figure. */
const FIGURE_DESCRIPTIONS = {
  invoice_number: 'Invoice or credit note number, exactly as printed',
  invoice_date: 'Invoice date, exactly as it is printed on the document (e.g. 14/10/2026)',
  party_from: 'The company or person who issued the invoice',
  party_to: 'The company or person the invoice is addressed to',
  amount_ex_vat: 'The amount excluding VAT, as a number',
  vat_amount: 'The VAT amount, as a number',
  amount_total: 'The total including VAT, as a number',
  reg: 'Vehicle registration printed on the invoice, if any',
  job_number: 'Job, claim or reference number printed on the invoice, if any',
};

// Named properties rather than a free-form map: the figures are only flagged for
// checking when the AI actually reports how sure it was of each one.
const FIGURE_MAP_PROPERTIES = Object.fromEntries(INVOICE_FIGURES.map((f) => [f.key, { type: 'string' }]));

export const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    readable: {
      type: 'boolean',
      description: 'True if this is a legible invoice or credit note. False if the file cannot be read at all.',
    },
    ...Object.fromEntries(INVOICE_FIGURES.map((f) => [f.key, {
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

/**
 * Second pass, used only when the reading pass came back without the snippets:
 * asks the AI where each figure it did find appears on the document.
 */
export async function fetchSourceSnippets(base44, fileUrl, figures) {
  const found = INVOICE_FIGURES
    .filter((f) => !isEmpty(figures[f.key]))
    .map((f) => `${f.key}: ${figures[f.key]}`)
    .join('\n');
  if (!found) return {};

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Look at this document. For each figure below, find the exact text in the document where that value appears. Return a JSON object mapping each figure key to a short snippet of the document text (about 10 to 30 words) showing where the value was found. Use an empty string for figures you cannot find.\n\nFigures:\n${found}`,
    file_urls: [fileUrl],
    response_json_schema: {
      type: 'object',
      properties: FIGURE_MAP_PROPERTIES,
    },
  });
  return result || {};
}

export function buildExtractionPrompt({ item, claim, party }) {
  const direction = item?.direction === 'in'
    ? `an invoice we have received (from ${party || 'the other party'})`
    : `an invoice we have sent (to ${party || 'the other party'})`;

  return `Read this document and extract the figures from it. It is filed against "${item?.label}" on claim ${claim?.job_number || ''} for vehicle ${claim?.reg || ''} — ${direction}.

Return:
- the invoice or credit note number, exactly as printed
- the invoice date, exactly as printed on the document
- who the invoice is from and who it is addressed to
- the amount excluding VAT, the VAT amount, and the total including VAT, as numbers with no currency symbols
- any vehicle registration printed on the document
- any job, claim or reference number printed on the document

Rules:
- Only return what is actually printed. Use an empty string for anything that is not there.
- If only a total including VAT is shown, work the ex-VAT and VAT amounts out from it at 20% VAT and mark those figures as low confidence.
- For every figure, give a confidence of "high", "medium" or "low" ("low" for anything blurred, cut off, ambiguous or worked out).
- For every figure, give the snippet of text from the document where you found it.
- Set readable to false only if the document cannot be read at all.`;
}

const isEmpty = (v) => v === null || v === undefined || v === '';

export const emptyFigures = () => Object.fromEntries(INVOICE_FIGURES.map((f) => [f.key, '']));

/** Day-first dates, because the documents are UK invoices. */
export function normaliseDate(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
}

/** The AI's answer, tidied into the values the review screen starts with. */
export function figuresFromExtraction(extracted = {}) {
  const figures = {};
  for (const field of INVOICE_FIGURES) {
    const value = extracted[field.key];
    if (field.type === 'number') {
      const n = toNum(value);
      figures[field.key] = n === null ? '' : String(round2(n));
    } else if (field.type === 'date') {
      figures[field.key] = normaliseDate(value);
    } else {
      figures[field.key] = isEmpty(value) ? '' : String(value).trim();
    }
  }
  return figures;
}

/** The raw strings as printed, used to highlight them on the document. */
export function rawFromExtraction(extracted = {}) {
  const raw = {};
  for (const field of INVOICE_FIGURES) {
    raw[field.key] = isEmpty(extracted[field.key]) ? '' : String(extracted[field.key]).trim();
  }
  return raw;
}

export const confidenceFromExtraction = (extracted = {}) => {
  const map = extracted._confidence || {};
  const out = {};
  for (const field of INVOICE_FIGURES) {
    const value = map[field.key];
    out[field.key] = isEmpty(value) ? 'missing' : String(value).toLowerCase();
  }
  return out;
};

export const snippetsFromExtraction = (extracted = {}) => extracted._source_snippets || {};

/** Figures the AI read but was not certain about: these must be checked or corrected. */
export function figuresNeedingReview(figures, confidence) {
  return INVOICE_FIGURES
    .filter((f) => !isEmpty(figures[f.key]) && confidence[f.key] !== 'high')
    .map((f) => f.key);
}

export const normalise = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
export const squash = (v) => normalise(v).replace(/ /g, '');

const sameFigure = (field, a, b) => {
  if (field.type === 'number') {
    const na = toNum(a);
    const nb = toNum(b);
    if (na === null && nb === null) return true;
    return na !== null && nb !== null && Math.abs(na - nb) < 0.01;
  }
  if (field.type === 'date') return normaliseDate(a) === normaliseDate(b);
  return normalise(a) === normalise(b);
};

/** What the user changed after the AI read it. */
export function correctionsFromReview(figures, raw) {
  return INVOICE_FIGURES
    .map((field) => {
      const from = raw[field.key] || '';
      const to = figures[field.key] ?? '';
      if (sameFigure(field, from, to)) return null;
      return { label: field.label, from, to };
    })
    .filter(Boolean);
}

/** Fail-safe 1: the figures have to add up. */
export function checkArithmetic(figures) {
  const issues = [];
  const ex = toNum(figures.amount_ex_vat);
  const vat = toNum(figures.vat_amount);
  const total = toNum(figures.amount_total);
  if (ex === null || vat === null || total === null) return issues;

  if (Math.abs(round2(ex + vat) - round2(total)) > 0.01) {
    issues.push(`The figures don't add up: ${fmtGBP(ex)} ex VAT + ${fmtGBP(vat)} VAT = ${fmtGBP(round2(ex + vat))}, but the invoice total reads ${fmtGBP(total)}.`);
  }
  if (vat > 0) {
    const expectedVat = round2(ex * VAT_RATE);
    if (Math.abs(expectedVat - vat) > 0.02) {
      issues.push(`The VAT of ${fmtGBP(vat)} is not 20% of ${fmtGBP(ex)} ex VAT, which would be ${fmtGBP(expectedVat)}.`);
    }
  } else if (total > 0 && Math.abs(round2(total - ex)) > 0.01) {
    issues.push(`No VAT was read, but the total ${fmtGBP(total)} is not the same as the amount ex VAT ${fmtGBP(ex)}.`);
  }
  return issues;
}

/** What our own records say this invoice should be, and where that comes from. */
export function expectedInvoice(item, claim) {
  if (!item || !claim) return { amount: null, note: '' };
  const state = getInvoiceItemState(item, claim, false);
  const amount = state.amount > 0 ? state.amount : null;
  if (!amount) return { amount: null, note: '' };

  const calc = resolveInvoiceAmount(item, claim);
  const basis = (calc?.workings || []).find((w) => !w.total && !/^vat/i.test(w.label));
  const note = [calc?.hint, basis ? `${basis.label} ${basis.value}` : ''].filter(Boolean).join(' · ');
  return { amount, note };
}

/** Fail-safe 2: is this the invoice we asked for? */
export function checkRightInvoice(figures, claim, item) {
  const issues = [];
  const printed = squash(INVOICE_FIGURES.map((f) => figures[f.key]).filter(Boolean).join(' '));

  if (claim?.reg && !printed.includes(squash(claim.reg))) {
    issues.push(`The claim's registration ${claim.reg} doesn't appear anywhere on this invoice.`);
  }
  if (claim?.job_number && !printed.includes(squash(claim.job_number))) {
    issues.push(`The claim's job number ${claim.job_number} doesn't appear anywhere on this invoice.`);
  }

  const expectedParty = invoicePartyName(claim, item);
  const printedParty = item?.direction === 'in' ? figures.party_from : figures.party_to;
  if (expectedParty && printedParty && !partiesMatch(printedParty, expectedParty)) {
    issues.push(item.direction === 'in'
      ? `This invoice is from "${printedParty}", but the ${item.label} is expected from "${expectedParty}".`
      : `This invoice is addressed to "${printedParty}", but the ${item.label} is expected to go to "${expectedParty}".`);
  }
  return issues;
}

function partiesMatch(a, b) {
  const na = normalise(a);
  const nb = normalise(b);
  if (!na || !nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const words = nb.split(' ').filter((w) => w.length > 3);
  return words.length > 0 && words.some((w) => na.includes(w));
}

/**
 * Fail-safe 3: has this invoice number already been recorded on another claim?
 * Looks in each invoice's own tracker entry; a failure here never blocks the
 * review, it just means no duplicate warning can be shown.
 */
export async function findInvoiceNumberElsewhere(base44, invoiceNumber, claimId) {
  const number = String(invoiceNumber || '').trim();
  if (number.length < 3) return [];
  const clauses = INVOICE_ITEMS.map((item) => ({ [`invoice_tracker.items.${item.key}.invoice_number`]: number }));
  try {
    const page = await base44.entities.Claim.filter(
      { $or: clauses, id: { $ne: claimId } },
      { limit: 5, fields: ['id', 'job_number', 'reg', 'invoice_tracker'] }
    );
    return (page?.items || []).map((c) => ({ id: c.id, job_number: c.job_number, reg: c.reg }));
  } catch (e) {
    console.error('Duplicate invoice number check failed', e);
    return null;
  }
}

/** The activity history lines that record what was read, changed and accepted. */
export function buildReviewLog({ item, figures, corrections, accepted }) {
  const entries = [];
  const from = figures.party_from || 'not read';
  const to = figures.party_to || 'not read';
  const money = `${fmtGBP(toNum(figures.amount_ex_vat) || 0)} ex VAT + ${fmtGBP(toNum(figures.vat_amount) || 0)} VAT = ${fmtGBP(toNum(figures.amount_total) || 0)}`;

  entries.push({
    action: 'Invoice Read',
    description: `${item.label}: invoice ${figures.invoice_number || 'number not read'}, dated ${figures.invoice_date || 'date not read'}, from ${from} to ${to} — ${money}. Figures read from the uploaded document and checked before saving.`,
  });

  corrections.forEach((c) => {
    entries.push({
      action: 'Financials Updated',
      fieldName: `${item.label} — ${c.label}`,
      oldValue: c.from,
      newValue: c.to,
      description: `${item.label}: ${c.label.toLowerCase()} corrected after reading the invoice — ${c.from || '(not read)'} → ${c.to || '(left blank)'}.`,
    });
  });

  accepted.forEach((a) => {
    entries.push({
      action: 'Financials Updated',
      description: `${item.label}: accepted a mismatch on the invoice — ${a}`,
    });
  });

  return entries;
}