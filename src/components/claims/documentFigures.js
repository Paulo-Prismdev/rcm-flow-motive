import { fmtGBP } from '@/components/shared/creditRepairRates';
import { authorityVatCheck, excessCheck } from '@/components/claims/financials/authorityReview';
import {
  VAT_RATE,
  checkArithmetic,
  correctionsFromReview,
  figuresForReview,
  figuresNeedingReview,
  normaliseDate,
  round2,
  snippetsFromExtraction,
  squash,
  toNum,
} from '@/components/claims/financials/invoiceReview';

/**
 * Reading the estimates and authorities that arrive in a claim's Documents panel.
 *
 * Four documents are read the same way: the initial estimate and authority, and the
 * supplementary pair that follows them. Each supplies the date printed on it (never
 * the upload date), its own totals, and — on an authority — the customer's own
 * position from the "customer is responsible for" section. Every figure is put to the
 * user with the document beside it, anything uncertain has to be checked, and nothing
 * is written to the claim until the review is confirmed.
 *
 * Each document's figures are kept as its own record, in the claim's tracker:
 *
 *   invoice_tracker.documents.<item_key> = { date, net, gross, reference,
 *                                            contributions, customer_vat, details_source }
 *
 * The initial estimate and authority ALSO write the claim's own estimate and
 * authorised costs (and fill the Estimate Completed / Authority Received key dates),
 * because those are the figures the rest of the app reads. The supplementary pair
 * keeps to its own record, and the final authority keeps to the one it already has, so
 * one never overwrites another. What the Final Insurer Invoice is measured against is
 * worked out from them — see invoiceAuthorityCheck.authorityTotals.
 */

export const READ_DOCUMENT_KEYS = [
  'initial_estimate',
  'initial_authority',
  'supplementary_estimate',
  'supplementary_authority',
];

export const readsClaimFigures = (itemKey) => READ_DOCUMENT_KEYS.includes(itemKey);

const isAuthority = (itemKey) => String(itemKey || '').includes('authority');

const isSupplementary = (itemKey) => String(itemKey || '').includes('supplementary');

/** What is read off an estimate: the date it carries, its totals and its reference. */
const ESTIMATE_FIELDS = [
  { key: 'reg', label: 'Vehicle reg', prompt: 'the vehicle registration the estimate is for, exactly as printed' },
  { key: 'document_date', label: 'Estimate date', type: 'date', prompt: 'the date printed on the estimate itself, not the date it was uploaded or received' },
  { key: 'amount_ex_vat', label: 'Total ex VAT', type: 'number', prompt: 'the estimate total excluding VAT, as a number. Leave it empty where the estimate does not print it separately' },
  { key: 'vat_amount', label: 'VAT', type: 'number', prompt: 'the VAT amount on the estimate, as a number. Leave it empty where it is not printed separately' },
  { key: 'amount_total', label: 'Total inc VAT', type: 'number', prompt: 'the estimate total including VAT, as a number' },
  { key: 'reference', label: 'Estimate ref', prompt: 'the estimate, assessment or Audatex reference number printed on it, if any' },
];

/**
 * What is read off an authority: the date it carries, the authorised totals, and the
 * customer's excess, contributions and VAT status from its own "customer is
 * responsible for" section — the same things the Final Authority is read for.
 */
const AUTHORITY_FIELDS = [
  { key: 'reg', label: 'Vehicle reg', prompt: 'the vehicle registration the authority covers, exactly as printed' },
  { key: 'document_date', label: 'Authority date', type: 'date', prompt: 'the date printed on the authority itself, not the date it was uploaded or received' },
  { key: 'amount_ex_vat', label: 'Authorised ex VAT', type: 'number', prompt: 'the authorised amount excluding VAT, as a number. Leave it empty where the authority does not print it separately' },
  { key: 'vat_amount', label: 'VAT', type: 'number', prompt: 'the VAT amount on the authority, as a number. Leave it empty where it is not printed separately' },
  { key: 'amount_total', label: 'Authorised inc VAT', type: 'number', prompt: 'the authorised total including VAT, as a number' },
  {
    key: 'customer_vat',
    label: 'Customer VAT',
    prompt: 'who accounts for the VAT, from what the authority says about the customer: "VAT Registered" where it says the customer is VAT registered or responsible for the VAT, "Non-VAT" where it says they are not. Empty where it says nothing about it',
  },
  { key: 'excess', label: 'Excess', type: 'number', prompt: 'the excess the authority says the customer is responsible for, as a number. Leave it empty where it shows none' },
  { key: 'contributions', label: 'Contributions', type: 'number', prompt: 'any other amount the same section says the customer is responsible for (a contribution, betterment or similar), read on its own and never added to the excess' },
];

/** The figures read off one of these documents, in the order they are reviewed. */
export const documentFields = (itemKey) => (isAuthority(itemKey) ? AUTHORITY_FIELDS : ESTIMATE_FIELDS);

/** The one figure a document cannot be recorded without. */
export const documentRequired = (itemKey) => ({
  amount_total: isAuthority(itemKey) ? 'Enter the authorised total inc VAT' : 'Enter the estimate total inc VAT',
});

export const emptyDocumentFigures = (itemKey) =>
  Object.fromEntries(documentFields(itemKey).map((f) => [f.key, '']));

const figureMap = (fields) => Object.fromEntries(fields.map((f) => [f.key, { type: 'string' }]));

export const documentExtractionSchema = (itemKey) => {
  const fields = documentFields(itemKey);
  return {
    type: 'object',
    properties: {
      readable: {
        type: 'boolean',
        description: `True if this is a legible ${isAuthority(itemKey) ? 'authority or authorisation' : 'estimate or assessment'} document. False if the file cannot be read at all.`,
      },
      ...Object.fromEntries(fields.map((f) => [f.key, {
        type: f.type === 'number' ? 'number' : 'string',
        description: f.prompt,
      }])),
      _vat_basis: {
        type: 'string',
        description: 'How VAT appears on the document: "none" where VAT is not mentioned at all, "split" where the amount excluding VAT and the VAT amount are both printed, "included" where it says VAT is included but those two amounts are not printed separately.',
      },
      _confidence: {
        type: 'object',
        description: 'How certain you are of each figure: "high", "medium" or "low". Use "low" for anything blurred, cut off, ambiguous or worked out rather than read.',
        properties: figureMap(fields),
      },
      _source_snippets: {
        type: 'object',
        description: 'For each figure, the text from the document where you found it, a few words either side. Empty string for figures you could not find.',
        properties: figureMap(fields),
      },
    },
  };
};

export function buildDocumentPrompt({ itemKey, item, claim }) {
  const authority = isAuthority(itemKey);
  const which = `${isSupplementary(itemKey) ? 'supplementary' : 'initial'} ${authority ? 'authority' : 'estimate'}`;

  return `Read this document and extract the figures from it. It is filed against "${item?.label}" on claim ${claim?.job_number || ''} for vehicle ${claim?.reg || ''}. It is the ${which} for this repair.

Return only these things:
${documentFields(itemKey).map((f) => `- ${f.prompt}`).join('\n')}
- how VAT appears on the document: not mentioned at all, or the amount excluding VAT and the VAT amount both printed, or VAT included without those two amounts being shown separately

Rules:
- Only return what is actually printed. Use an empty string for anything that is not there.
- Amounts as numbers with no currency symbols. Keep every amount separate: never add two of them together, and never split one between two of them.
- VAT: return only what the document shows. Where no VAT is mentioned on it at all, the amount excluding VAT is the total and the VAT amount is 0. Where it says VAT is included but the ex-VAT amount and the VAT amount are not printed separately, leave both empty for the user to fill in. Never work VAT out from the total yourself.
- The date is the one printed on the document itself, never the date it was uploaded.
- The VAT status is one of the two answers exactly as written above, from what the document says about the customer. Leave it empty where it says nothing about it. Never work it out from an amount.
- For every figure, give a confidence of "high", "medium" or "low" ("low" for anything blurred, cut off, ambiguous or worked out), and the snippet of text from the document where you found it.
- Set readable to false only if the document cannot be read at all.`;
}

/** What the review screen starts with: the figures, the strings they are highlighted by, and the AI's confidence. */
export function documentFiguresForReview(extracted, itemKey) {
  const read = figuresForReview(extracted || {}, documentFields(itemKey));
  return { ...read, snippets: snippetsFromExtraction(extracted || {}) };
}

export const documentNeedsReview = (itemKey, figures, confidence) =>
  figuresNeedingReview(figures, confidence, documentFields(itemKey));

export const documentCorrections = (itemKey, figures, raw, derived) =>
  correctionsFromReview(figures, raw, derived || [], documentFields(itemKey));

/**
 * The figures as printed that do not add up, where the ex-VAT amount, the VAT and the
 * total are all on the page. Nothing is blocked on it: it is a second look at the
 * figures before they land on the claim.
 */
export const documentArithmetic = (figures) => checkArithmetic(figures);

/** The registration check: one of these documents is only worth anything on its own job. */
export function checkDocumentReg({ itemKey, item, figures, claim }) {
  const printed = String(figures?.reg || '').trim();
  const name = isAuthority(itemKey) ? 'authority' : 'estimate';
  if (!claim?.reg) return null;
  if (!printed) {
    return {
      kind: 'missing',
      text: `No registration was found on this ${name}, so it can't be matched to ${claim.reg} on this claim.`,
    };
  }
  if (squash(printed) !== squash(claim.reg)) {
    return {
      kind: 'mismatch',
      text: `This ${name} is for ${printed}, but the vehicle on this claim is ${claim.reg}. It is being filed as the ${item?.label || name} for this job.`,
    };
  }
  return null;
}

/**
 * Where each document's figures land. The initial estimate and authority also write
 * the claim's own figures — those are what the rest of the app reads — while the
 * supplementary pair and the final authority keep their amounts to their own records.
 * Every document's date goes to its own Key Dates field, so it is the same value on
 * the document's card and in Key Dates.
 */
const TARGETS = {
  initial_estimate: {
    date: { label: 'Estimate Completed', field: 'estimate_completed' },
    net: 'estimate_cost_net',
    gross: 'estimate_cost_gross',
    reference: true,
  },
  initial_authority: {
    date: { label: 'Authority Received', field: 'authority_received' },
    net: 'authority_cost_net',
    gross: 'authority_cost_gross',
  },
  supplementary_estimate: {
    date: { label: 'Supplementary Estimate Completed', field: 'supplementary_estimate_completed' },
    reference: true,
  },
  supplementary_authority: {
    date: { label: 'Supplementary Authority Received', field: 'supplementary_authority_received' },
  },
};

export const documentTarget = (itemKey) => TARGETS[itemKey] || null;

/** The document's own record on the claim, where its figures are kept. */
export const documentRecord = (claim, itemKey) =>
  claim?.invoice_tracker?.documents?.[itemKey] || {};

/** The date a document is recorded at, from wherever that document keeps it. */
export const documentKeyDate = (itemKey, claim) => {
  const target = documentTarget(itemKey);
  if (!target) return null;
  return (target.date.field ? claim?.[target.date.field] : null) || documentRecord(claim, itemKey).date || null;
};

/** The patch that records a date typed straight onto a document's card. */
export function documentDatePatch(itemKey, claim, value) {
  const target = documentTarget(itemKey);
  if (!target) return {};
  if (target.date.field) return { [target.date.field]: value || null };
  const entry = { ...documentRecord(claim, itemKey), date: value || null };
  const documents = { ...(claim?.invoice_tracker?.documents || {}), [itemKey]: entry };
  return { invoice_tracker: { ...(claim?.invoice_tracker || {}), documents } };
}

/**
 * The document's own totals: the total inc VAT as printed, and the amount ex VAT as
 * printed — or, where only the total is on the page, worked back out of it the way the
 * claim's own figures already are.
 */
export function readTotals(figures) {
  const readGross = toNum(figures?.amount_total);
  const readNet = toNum(figures?.amount_ex_vat);
  const gross = readGross !== null ? round2(readGross) : readNet !== null ? round2(readNet * (1 + VAT_RATE)) : null;
  const net = readNet !== null ? round2(readNet) : gross !== null ? round2(gross / (1 + VAT_RATE)) : null;
  return { gross, net, netDerived: readNet === null && gross !== null };
}

const blank = (v) => v === null || v === undefined || v === '';

/**
 * Nothing has been entered on the claim: the field is empty, or it holds a nought —
 * an estimate or an authority is never a nil figure, so a nought means the same as
 * blank. Those figures are filled in from the document without asking; only a real
 * figure that differs is put to the user to settle.
 */
const nothingEntered = (v) => blank(v) || toNum(v) === 0;

const differs = (type, shown, stored) => {
  if (nothingEntered(stored)) return false;
  if (type === 'number') {
    const a = toNum(shown);
    const b = toNum(stored);
    return a === null || b === null ? false : Math.abs(a - b) >= 0.01;
  }
  return String(shown).trim() !== String(stored).trim();
};

/** The choice a row starts on: a date goes to the document, every other figure to the claim. */
export const defaultChoice = (row) => (row?.preferDocument ? 'document' : 'claim');

/** The choice actually in force for a row. */
export const chosenValue = (row, choices = {}) => choices[row.id] || defaultChoice(row);

/** The value as the screen shows it: money with its symbol, everything else as it stands. */
export function displayValue(row, value = row.shown) {
  if (blank(value)) return 'not read';
  return row.money ? fmtGBP(toNum(value) || 0) : String(value);
}

/**
 * What this document offers the claim, row by row: the date printed on it, its totals
 * and its reference. A row the claim already holds a different figure for is marked as
 * a difference — the review shows both and the user chooses; nothing is overwritten on
 * its own.
 */
export function documentRows({ claim, itemKey, figures }) {
  const target = documentTarget(itemKey);
  if (!target) return [];
  const record = documentRecord(claim, itemKey);
  const totals = readTotals(figures);
  const rows = [];

  const row = ({ entryKey, claimKey, label, type, money, shown, stored, preferDocument }) => ({
    id: claimKey || entryKey,
    entryKey,
    claimKey,
    label,
    type: type || 'text',
    money: !!money,
    preferDocument: !!preferDocument,
    shown,
    stored: nothingEntered(stored) ? '' : stored,
    differs: !!claimKey && differs(type || 'text', shown, stored),
  });

  const date = normaliseDate(figures?.document_date);
  if (date) {
    rows.push(row({
      entryKey: 'date',
      claimKey: target.date.field,
      label: target.date.label,
      type: 'date',
      // The date printed on the document is what the Key Dates field is for, so where
      // the two disagree it is the one used unless the user keeps the claim's.
      preferDocument: true,
      shown: date,
      stored: target.date.field ? normaliseDate(claim?.[target.date.field]) : normaliseDate(record.date),
    }));
  }
  if (totals.net !== null) {
    rows.push(row({
      entryKey: 'net',
      claimKey: target.net,
      label: isAuthority(itemKey) ? 'Authorised ex VAT' : 'Total ex VAT',
      type: 'number',
      money: true,
      shown: totals.net,
      stored: target.net ? toNum(claim?.[target.net]) : toNum(record.net),
    }));
  }
  if (totals.gross !== null) {
    rows.push(row({
      entryKey: 'gross',
      claimKey: target.gross,
      label: isAuthority(itemKey) ? 'Authorised inc VAT' : 'Total inc VAT',
      type: 'number',
      money: true,
      shown: totals.gross,
      stored: target.gross ? toNum(claim?.[target.gross]) : toNum(record.gross),
    }));
  }
  const reference = String(figures?.reference || '').trim();
  if (target.reference && reference) {
    rows.push(row({ entryKey: 'reference', label: 'Estimate ref', shown: reference, stored: record.reference }));
  }
  return rows;
}

/** The customer's own position, read the same way the Final Authority reads it. */
export function documentCustomerChecks({ itemKey, figures, claim }) {
  if (!isAuthority(itemKey)) return { vat: null, excess: null };
  return { vat: authorityVatCheck(figures, claim), excess: excessCheck(figures, claim) };
}

/**
 * The excess as an initial or supplementary authority may act on it: a claim waiting on
 * a figure has it settled by the Final Authority, so these never clear a TBC themselves.
 */
export const excessForDocument = (check) => (check && check.tbc
  ? { ...check, fills: false, offersWaive: false }
  : check);

/**
 * Everything the review settles, as the patch that records it: the claim's own fields,
 * and the document's own record on the claim. What was taken off the document and what
 * was left as it was are both handed back, so the activity history can say which.
 */
export function buildDocumentPatch({
  claim, itemKey, figures, choices = {}, excessChoice, vatChoice, file,
}) {
  const target = documentTarget(itemKey);
  const patch = {};
  const applied = [];
  const kept = [];
  const totals = readTotals(figures);

  const entry = { ...documentRecord(claim, itemKey) };
  for (const row of documentRows({ claim, itemKey, figures })) {
    // The document's own record always holds what was read off it.
    if (row.entryKey) entry[row.entryKey] = row.shown;
    const useDocument = !row.differs || chosenValue(row, choices) === 'document';
    if (!useDocument) { kept.push(row); continue; }
    if (row.claimKey) patch[row.claimKey] = row.shown;
    applied.push(row);
  }

  if (isAuthority(itemKey)) {
    const { vat, excess } = documentCustomerChecks({ itemKey, figures, claim });
    const contributions = toNum(figures?.contributions);
    if (contributions !== null) entry.contributions = round2(contributions);
    if (vat.shown) entry.customer_vat = vat.shown;

    if (vat.fills || (vat.differs && vatChoice === 'authority')) {
      patch.client_vat_status = vat.shown;
      applied.push({
        id: 'client_vat_status',
        label: 'Customer VAT status',
        type: 'text',
        money: false,
        shown: vat.shown,
        stored: vat.stored || '',
        differs: vat.differs,
      });
      if (vat.differs) {
        applied[applied.length - 1].note = `taken from this authority — the claim held ${vat.stored === 'VAT Registered' ? 'VAT registered' : 'not VAT registered'}`;
      }
    }
    if (!excess.tbc && (excess.fills || (excess.differs && excessChoice === 'authority'))) {
      patch.policy_excess = excess.shown;
      applied.push({
        id: 'policy_excess',
        label: 'Policy excess',
        type: 'number',
        money: true,
        shown: excess.shown,
        stored: excess.stored,
        differs: excess.differs,
        note: excess.differs ? `taken from this authority — the claim held ${excess.storedLabel}` : '',
      });
    }
  }

  if (file?.file_url) {
    entry.details_source = {
      file_url: file.file_url,
      file_name: file.file_name || '',
      at: new Date().toISOString(),
      by: file.by || '',
    };
  }
  const documents = { ...(claim?.invoice_tracker?.documents || {}), [itemKey]: entry };
  patch.invoice_tracker = { ...(claim?.invoice_tracker || {}), documents };

  return { patch, applied, kept, totals, target };
}

/**
 * Every authorised figure the claim holds, each on its own line: the initial and
 * supplementary authorities with their combined total, the estimate the same way, and
 * the final authority standing apart from them. Worked out from the claim's own fields
 * and its document records, so it is the same figure wherever it is shown.
 */
export function combinedTotalsRows(claim) {
  const records = claim?.invoice_tracker?.documents || {};
  const num = (v) => (toNum(v) === null ? null : round2(toNum(v)));
  const rows = [];

  const add = ({ key, label, initial, supplementary, final, initialNet, supplementaryNet }) => {
    const first = num(initial);
    const extra = num(supplementary);
    const last = num(final);
    const combined = (first === null && extra === null) ? null : round2((first || 0) + (extra || 0));
    // The figure the job stands on: the Final Authority's where one has arrived, and
    // otherwise the initial and supplementary figures added together.
    const total = last !== null ? last : combined;
    if (total === null) return;
    const netFirst = num(initialNet);
    const netExtra = num(supplementaryNet);
    rows.push({
      key,
      label,
      initial: first,
      supplementary: extra,
      combined,
      total,
      netTotal: (netFirst === null && netExtra === null) ? null : round2((netFirst || 0) + (netExtra || 0)),
      final: last,
    });
  };

  add({
    key: 'estimate',
    label: 'Estimate',
    initial: claim?.estimate_cost_gross,
    supplementary: records.supplementary_estimate?.gross ?? claim?.supplementary_estimate_cost_gross,
    initialNet: claim?.estimate_cost_net,
    supplementaryNet: records.supplementary_estimate?.net ?? claim?.supplementary_estimate_cost_net,
  });

  const finalAuthority = num(claim?.invoice_tracker?.items?.final_authority?.amount);
  add({
    key: 'authority',
    label: 'Authorised',
    // Once a Final Authority has arrived it is the figure the job stands on, so the
    // claim's own authorised cost is only shown beside it where an initial authority
    // was actually read into it.
    initial: finalAuthority !== null
      ? (records.initial_authority ? (claim?.authority_cost_gross ?? records.initial_authority.gross) : null)
      : (claim?.authority_cost_gross ?? records.initial_authority?.gross),
    supplementary: records.supplementary_authority?.gross ?? claim?.supplementary_authority_cost_gross,
    final: finalAuthority,
    initialNet: records.initial_authority?.net,
    supplementaryNet: records.supplementary_authority?.net ?? claim?.supplementary_authority_cost_net,
  });

  return rows;
}

/**
 * The activity history lines for a document that was read: what it was read as, the
 * figures that had to be corrected, the differences the user chose to keep as they
 * were, and what was accepted from it. Every figure that lands on a field of the claim
 * is already in the history as that field's own change, so it is not repeated here.
 */
export function buildDocumentLog({ item, itemKey, figures, corrections, applied, kept }) {
  const label = item?.label || (isAuthority(itemKey) ? 'Authority' : 'Estimate');
  const authority = isAuthority(itemKey);
  const totals = readTotals(figures);
  const date = normaliseDate(figures?.document_date);

  const entries = [{
    action: 'Document Read',
    description: `${label}: read from the uploaded document — ${date ? `${authority ? 'authority' : 'estimate'} dated ${date}` : 'no date printed'}, vehicle ${figures.reg || 'registration not read'}${totals.gross !== null ? `, total ${fmtGBP(totals.gross)} inc VAT (${fmtGBP(totals.net)} ex VAT)` : ', total not read'}. The figures were checked on the review screen before anything was saved.`,
  }];

  corrections.forEach((c) => entries.push({
    action: 'Document Read',
    fieldName: `${label} — ${c.label}`,
    oldValue: c.from,
    newValue: c.to,
    description: `${label}: ${c.label.toLowerCase()} corrected after reading the document — ${c.from || '(not read)'} → ${c.to || '(left blank)'}.`,
  }));

  kept.forEach((row) => entries.push({
    action: 'Document Read',
    description: `${label}: the claim's ${row.label.toLowerCase()} of ${displayValue(row, row.stored)} kept as it was against the ${displayValue(row, row.shown)} on this document.`,
  }));

  applied
    .filter((row) => row.note)
    .forEach((row) => entries.push({
      action: 'Financials Updated',
      description: `${label}: ${row.label === 'Policy excess' ? 'the policy excess' : "the customer's VAT status"} ${row.note}.`,
    }));

  return entries;
}