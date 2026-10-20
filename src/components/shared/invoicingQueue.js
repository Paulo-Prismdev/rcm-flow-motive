/**
 * The rules behind the Invoicing page: the day's work queue and the aged
 * invoices.
 *
 * Both are read from the same place the claim's own Financials reads — the
 * invoices' own states, worked out by `computeInvoiceSummary` from the claim's
 * fields and the copy mirror it carries (`invoice_copies`), exactly as the claims
 * list reads it. Nothing is stored, nothing is copied and nothing is guessed, so
 * an amount or a status here can never disagree with the claim it came from: an
 * item that does not apply is left out, a recommended item (the Collection Note)
 * is never chased or counted, and an invoice's amount is the figure it was locked
 * at once it went out.
 *
 * Every line is one invoice item on one claim, with the wait that line has been
 * on — counted from the date the job moved, the request went, or the invoice
 * itself was dated.
 */

import {
  canRequestInvoice,
  claimCopyOnFile,
  claimInvoiceContext,
  computeInvoiceSummary,
  formatInvoiceDay,
  invoicePartyName,
  isInvoiceDocument,
  isRecommendedItem,
} from './invoiceChecklist';
import {
  authorityAmount,
  compareToAuthority,
  finalInvoiceTotal,
  vatExcessAuthorityPart,
} from '@/components/claims/financials/invoiceAuthorityCheck';
import { fmtGBP } from './creditRepairRates';

const dayMs = 24 * 60 * 60 * 1000;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const parseDay = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Whole calendar days since a date: 0 today, 1 yesterday. Null with no date. */
export function daysSince(value, now = new Date()) {
  const date = parseDay(value);
  if (!date) return null;
  return Math.max(0, Math.round((startOfDay(now) - startOfDay(date)) / dayMs));
}

/**
 * Whole working days (Monday to Friday) elapsed since a date. What the accounts
 * request is judged on, because three days means three days someone was at work.
 */
export function workingDaysSince(value, now = new Date()) {
  const from = parseDay(value);
  if (!from) return null;
  let cursor = new Date(startOfDay(from).getTime() + dayMs);
  const end = startOfDay(now);
  let count = 0;
  let guard = 0;
  while (cursor <= end && guard < 750) {
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
    cursor = new Date(cursor.getTime() + dayMs);
    guard += 1;
  }
  return count;
}

/** "today", "1 day", "12 days" — and working days said as such. */
export const waitingLabel = (days, working = false) => {
  if (days === null || days === undefined) return '';
  const unit = working ? 'working day' : 'day';
  if (days === 0) return 'today';
  return `${days} ${unit}${days === 1 ? '' : 's'}`;
};

/** The later of two dates, either of which may be missing. */
const laterOf = (a, b) => {
  const first = parseDay(a);
  const second = parseDay(b);
  if (!first) return second ? b : '';
  if (!second) return a;
  return second > first ? b : a;
};

/**
 * The date the vehicle went back to the customer — the point a job is done with
 * us and its paperwork is expected to follow. A rectification hand-over is the
 * later of the two, and is the one that counts once it has happened.
 */
export const returnedDate = (claim) =>
  laterOf(claim?.hand_over_date, claim?.rectification_hand_over_date);

/**
 * When a job became ours to invoice: the day the vehicle went back, or failing
 * that the day the repair was completed or the job first came in. Only used to
 * say how long an invoice has been waiting to be raised.
 */
export const jobAnchorDate = (claim) =>
  returnedDate(claim) || claim?.completion_date || claim?.authority_received || claim?.date_received || '';

/** A claim the queue ignores: filed away, still a draft, or cancelled. */
const ignoredClaim = (claim) =>
  !claim || claim.archived === true || claim.draft === true || claim.secondary_status === 'Cancelled';

/** The close-out paperwork a finished job is expected to hold a copy of. */
const CLOSE_OUT_KEYS = ['final_invoice', 'vat_excess_invoice_in', 'final_authority'];

/** Invoices we are waiting to come in from a party, once the car is back. */
const EXPECTED_IN_KEYS = ['referrer_invoice_in', 'second_referrer_invoice_in'];

/* ── Day thresholds (editable in Settings) ───────────────────────────────── */

export const QUEUE_DAYS_CONFIG_KEY = 'invoicing_queue_days';

export const DEFAULT_QUEUE_DAYS = { accountsWorkingDays: 3, closeoutDays: 7 };

const wholeNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
};

/** The thresholds as stored in AppConfig, falling back to the defaults. */
export function readQueueDays(configs = []) {
  const raw = configs.find((c) => c.config_key === QUEUE_DAYS_CONFIG_KEY)?.config_value;
  let stored = {};
  if (raw) {
    try {
      stored = JSON.parse(raw) || {};
    } catch {
      stored = {};
    }
  }
  return {
    accountsWorkingDays: wholeNumber(stored.accounts_working_days, DEFAULT_QUEUE_DAYS.accountsWorkingDays),
    closeoutDays: wholeNumber(stored.closeout_days, DEFAULT_QUEUE_DAYS.closeoutDays),
  };
}

/** The thresholds as they are written back to AppConfig. */
export const queueDaysConfigValue = (thresholds) => JSON.stringify({
  accounts_working_days: wholeNumber(thresholds?.accountsWorkingDays, DEFAULT_QUEUE_DAYS.accountsWorkingDays),
  closeout_days: wholeNumber(thresholds?.closeoutDays, DEFAULT_QUEUE_DAYS.closeoutDays),
});

/* ── The day's work queue ────────────────────────────────────────────────── */

/** One line of a queue: the claim it sits on, the invoice, and the wait. */
const queueRow = (claim, item, fields) => ({
  id: `${claim.id}:${item.key}:${fields.section}`,
  section: fields.section,
  claimId: claim.id,
  reg: claim.reg || '',
  jobNumber: claim.job_number || '',
  client: claim.client_name || '',
  claimType: claim.claim_type || '',
  division: claim.business_division || '',
  itemKey: item.key,
  invoice: item.label,
  party: fields.party || '',
  amount: fields.amount ?? null,
  note: fields.note || '',
  waitingSince: fields.waitingSince || '',
  days: fields.days ?? null,
  daysAreWorking: fields.daysAreWorking === true,
});

/** Oldest first — the longest wait is the one to pick up first. */
const oldestFirst = (rows) => rows.sort((a, b) =>
  (b.days ?? -1) - (a.days ?? -1) ||
  (a.party || '').localeCompare(b.party || '') ||
  (a.reg || '').localeCompare(b.reg || ''));

/**
 * Everything needing attention, as the sections of the day's queue. Each section
 * carries its own lines, sorted oldest first, with its count and the money it
 * holds.
 */
export function buildInvoicingQueues(claims = [], thresholds = DEFAULT_QUEUE_DAYS, now = new Date()) {
  const accountsDays = wholeNumber(thresholds?.accountsWorkingDays, DEFAULT_QUEUE_DAYS.accountsWorkingDays);
  const closeoutDays = wholeNumber(thresholds?.closeoutDays, DEFAULT_QUEUE_DAYS.closeoutDays);

  const buckets = {
    accounts_ready: [],
    accounts_overdue: [],
    closeout_missing: [],
    in_expected: [],
    paid_no_copy: [],
    warnings: [],
  };

  for (const claim of claims) {
    if (ignoredClaim(claim)) continue;

    const ctx = claimInvoiceContext(claim);
    const summary = computeInvoiceSummary(claim, ctx, claimCopyOnFile(claim));
    const returned = returnedDate(claim);
    const returnedDays = daysSince(returned, now);
    const anchor = jobAnchorDate(claim);
    const anchorDays = daysSince(anchor, now);

    for (const { item, state } of summary.rows) {
      // Not-applicable and recommended items are left out everywhere, exactly as
      // the claim's own progress leaves them out.
      if (state.notApplicable || isRecommendedItem(item)) continue;

      // Ready to request from accounts: figures complete, nothing asked for yet
      // and no copy raised — the same line the claim's raise step offers.
      if (canRequestInvoice(item) && !state.paid && !state.requested && !state.copyAttached && !state.awaiting) {
        buckets.accounts_ready.push(queueRow(claim, item, {
          section: 'accounts_ready',
          amount: state.amount,
          note: state.hint || '',
          waitingSince: anchor,
          days: anchorDays,
          party: invoicePartyName(claim, item),
        }));
      }

      // Requested but not raised: asked for, past the threshold, still no copy.
      if (state.requested && !state.copyAttached) {
        const waited = workingDaysSince(state.requestedAt, now);
        if (waited !== null && waited > accountsDays) {
          buckets.accounts_overdue.push(queueRow(claim, item, {
            section: 'accounts_overdue',
            amount: state.amount,
            note: `Requested from accounts ${formatInvoiceDay(state.requestedAt)}${state.requestedBy ? ` by ${state.requestedBy}` : ''}`,
            waitingSince: state.requestedAt,
            days: waited,
            daysAreWorking: true,
            party: invoicePartyName(claim, item),
          }));
        }
      }

      // Invoices in still to arrive: a referrer's own invoice, expected once the
      // vehicle is back with the customer.
      if (EXPECTED_IN_KEYS.includes(item.key) && returnedDays !== null
        && !state.paid && !state.date && !state.copyAttached && !state.awaiting && state.amount > 0) {
        buckets.in_expected.push(queueRow(claim, item, {
          section: 'in_expected',
          amount: state.amount,
          note: state.hint || '',
          waitingSince: returned,
          days: returnedDays,
          party: invoicePartyName(claim, item),
        }));
      }

      // Paid, with nothing filed behind the payment.
      if (!isInvoiceDocument(item) && state.paid && !state.copyAttached) {
        const paidOn = state.paidDate || state.date;
        buckets.paid_no_copy.push(queueRow(claim, item, {
          section: 'paid_no_copy',
          amount: state.amount,
          note: paidOn ? `Paid ${formatInvoiceDay(paidOn)}` : 'Paid with no date recorded',
          waitingSince: paidOn,
          days: daysSince(paidOn, now),
          party: invoicePartyName(claim, item),
        }));
      }

      // An amount that has moved off the figure that was expected of it.
      if (!isInvoiceDocument(item) && state.variance) {
        buckets.warnings.push(queueRow(claim, item, {
          section: 'warnings',
          amount: state.amount,
          note: state.variance.text,
          waitingSince: state.date || '',
          days: daysSince(state.date, now),
          party: invoicePartyName(claim, item),
        }));
      }
    }

    // Close-out documents missing: the car has been back past the threshold and
    // the paperwork has not followed it.
    if (returnedDays !== null && returnedDays > closeoutDays) {
      for (const key of CLOSE_OUT_KEYS) {
        const row = summary.rows.find((r) => r.item.key === key);
        if (!row || row.state.notApplicable || row.state.copyAttached) continue;
        buckets.closeout_missing.push(queueRow(claim, row.item, {
          section: 'closeout_missing',
          amount: null,
          note: row.state.awaitingCorrected
            ? 'A corrected copy is awaited'
            : `Vehicle returned ${formatInvoiceDay(returned)}`,
          waitingSince: returned,
          days: returnedDays,
          party: invoicePartyName(claim, row.item),
        }));
      }
    }

    // Over authority: the repairer's invoices against what the job was authorised
    // at, on the same workings and the same 5p as the claim's own check.
    const vatRow = summary.rows.find((r) => r.item.key === 'vat_excess_invoice_in');
    const invoiced = finalInvoiceTotal(claim);
    const authorised = authorityAmount(claim);
    if (invoiced !== null && authorised !== null) {
      const comparison = compareToAuthority(invoiced, authorised, vatExcessAuthorityPart(ctx.vatExcess, {
        attached: !!vatRow?.state.copyAttached,
        amount: vatRow?.state?.amount,
      }));
      if (comparison?.status === 'over') {
        buckets.warnings.push(queueRow(claim, { key: 'authority', label: 'Final Insurer Invoice vs authority' }, {
          section: 'warnings',
          amount: comparison.measured,
          note: `Over the authorised ${fmtGBP(comparison.authority)} by ${fmtGBP(Math.abs(comparison.difference))}`,
          waitingSince: claim.invoice_sent_date || '',
          days: daysSince(claim.invoice_sent_date, now),
          party: invoicePartyName(claim, { party: 'authorising_party' }),
        }));
      }
    }

    // An excess still to be confirmed long after the vehicle went back.
    if (claim.excess_tbc === true && returnedDays !== null) {
      buckets.warnings.push(queueRow(claim, { key: 'excess_tbc', label: 'Policy excess' }, {
        section: 'warnings',
        amount: null,
        note: `Still TBC on authority — vehicle returned ${formatInvoiceDay(returned)}`,
        waitingSince: returned,
        days: returnedDays,
        party: invoicePartyName(claim, { party: 'client' }),
      }));
    }
  }

  const sections = [
    {
      key: 'accounts_ready',
      label: 'Ready to request from accounts',
      tone: 'neutral',
      hint: 'Invoices out whose figures are complete, which accounts has not been asked to raise yet.',
    },
    {
      key: 'accounts_overdue',
      label: 'Requested but not raised',
      tone: 'warning',
      hint: `Asked for from accounts more than ${accountsDays} working day${accountsDays === 1 ? '' : 's'} ago, with no copy filed yet.`,
    },
    {
      key: 'closeout_missing',
      label: 'Close-out documents missing',
      tone: 'warning',
      hint: `Returned to the customer more than ${closeoutDays} day${closeoutDays === 1 ? '' : 's'} ago, still missing the Final Insurer Invoice, the VAT & Excess Invoice or the Final Authority.`,
    },
    {
      key: 'in_expected',
      label: 'Invoices in still to arrive',
      tone: 'neutral',
      hint: 'Referrer invoices we are expecting and have not received.',
    },
    {
      key: 'paid_no_copy',
      label: 'Paid but no copy on file',
      tone: 'warning',
      hint: 'Payment recorded with no copy of the invoice behind it.',
    },
    {
      key: 'warnings',
      label: 'Warnings',
      tone: 'negative',
      hint: 'Over-authority invoices, amounts that differ from what was expected, and excesses still TBC on authority.',
    },
  ];

  return sections.map((section) => {
    const rows = oldestFirst(buckets[section.key] || []);
    return {
      ...section,
      rows,
      count: rows.length,
      total: round2(rows.reduce((sum, row) => sum + (row.amount || 0), 0)),
    };
  });
}

/* ── Aged invoices ───────────────────────────────────────────────────────── */

/** The age bands the aged invoices are counted in. */
export const AGE_BANDS = [
  { key: '0-30', label: '0–30 days', min: 0, max: 30 },
  { key: '31-60', label: '31–60 days', min: 31, max: 60 },
  { key: '61-90', label: '61–90 days', min: 61, max: 90 },
  { key: '90+', label: '90+ days', min: 91, max: Infinity },
];

/** Days past this are overdue, and are the ones shown in red. */
export const OVERDUE_DAYS = 60;

export const bandFor = (days) =>
  AGE_BANDS.find((band) => days >= band.min && days <= band.max) || AGE_BANDS[AGE_BANDS.length - 1];

export const isOverdue = (row) => (row?.days ?? 0) > OVERDUE_DAYS;

/**
 * Every invoice that has gone out or come in and is still unpaid, in both
 * directions, aged from its own date. A calculated invoice that has not been sent
 * yet is not owed by anyone, so it is not here — it is in the day's queue instead.
 */
export function buildAgedInvoices(claims = [], now = new Date()) {
  const owedToUs = [];
  const weOwe = [];

  for (const claim of claims) {
    if (ignoredClaim(claim)) continue;

    const ctx = claimInvoiceContext(claim);
    const summary = computeInvoiceSummary(claim, ctx, claimCopyOnFile(claim));

    for (const { item, state } of summary.rows) {
      if (isInvoiceDocument(item) || isRecommendedItem(item) || state.notApplicable) continue;
      if (state.paid || !state.date) continue;

      const days = daysSince(state.date, now) ?? 0;
      const row = {
        id: `${claim.id}:${item.key}`,
        direction: item.direction,
        itemKey: item.key,
        party: invoicePartyName(claim, item) || 'Unnamed party',
        invoice: item.label,
        amount: state.amount,
        date: state.date,
        days,
        band: bandFor(days).key,
        claimId: claim.id,
        reg: claim.reg || '',
        jobNumber: claim.job_number || '',
        client: claim.client_name || '',
        claimType: claim.claim_type || '',
        division: claim.business_division || '',
      };
      (item.direction === 'out' ? owedToUs : weOwe).push(row);
    }
  }

  return { owedToUs, weOwe };
}

/** Party, claim type and division narrow a tab down to the chasing list wanted. */
export function filterAgedRows(rows = [], filters = {}) {
  return rows.filter((row) =>
    (!filters.party || filters.party === 'all' || row.party === filters.party) &&
    (!filters.claimType || filters.claimType === 'all' || row.claimType === filters.claimType) &&
    (!filters.division || filters.division === 'all' || row.division === filters.division));
}

/** The distinct values the filters offer, off the rows themselves. */
export const agedFilterOptions = (rows = []) => ({
  parties: [...new Set(rows.map((row) => row.party).filter(Boolean))].sort(),
  claimTypes: [...new Set(rows.map((row) => row.claimType).filter(Boolean))].sort(),
  divisions: [...new Set(rows.map((row) => row.division).filter(Boolean))].sort(),
});

/** How much is owed in each age band. */
export function bandTotals(rows = []) {
  const totals = {};
  for (const band of AGE_BANDS) totals[band.key] = 0;
  for (const row of rows) totals[row.band] = round2((totals[row.band] || 0) + row.amount);
  return totals;
}

/** The headline figures of one tab: what is outstanding and what is overdue. */
export function agedTotals(rows = []) {
  const bands = bandTotals(rows);
  return {
    count: rows.length,
    parties: new Set(rows.map((row) => row.party)).size,
    total: round2(rows.reduce((sum, row) => sum + row.amount, 0)),
    overdue: round2(AGE_BANDS.filter((band) => band.min > OVERDUE_DAYS)
      .reduce((sum, band) => sum + (bands[band.key] || 0), 0)),
    bands,
  };
}

/** One party's invoices, oldest first, with what it owes in each band. */
export function groupAgedRows(rows = []) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.party)) groups.set(row.party, { party: row.party, rows: [], bands: {} });
    const group = groups.get(row.party);
    group.rows.push(row);
    group.bands[row.band] = round2((group.bands[row.band] || 0) + row.amount);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    rows: [...group.rows].sort((a, b) => b.days - a.days),
    count: group.rows.length,
    oldest: Math.max(...group.rows.map((row) => row.days)),
    total: round2(group.rows.reduce((sum, row) => sum + row.amount, 0)),
    overdue: group.rows.some(isOverdue),
  })).sort((a, b) => b.total - a.total);
}

/** The current view as a spreadsheet, for chasing and for accounts. */
export function buildAgedCsv(rows = []) {
  const head = ['Owed to us / We owe', 'Party', 'Invoice', 'Job number', 'Vehicle reg', 'Client',
    'Claim type', 'Business division', 'Invoice date', 'Age (days)', 'Age band', 'Amount'];
  const line = (row) => [
    row.direction === 'out' ? 'Owed to us' : 'We owe',
    row.party,
    row.invoice,
    row.jobNumber,
    row.reg,
    row.client,
    row.claimType,
    row.division,
    formatInvoiceDay(row.date),
    String(row.days),
    bandFor(row.days).label,
    row.amount.toFixed(2),
  ];
  const escape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [head, ...rows.map(line)].map((values) => values.map(escape).join(',')).join('\n');
}

/** Hand a CSV to the browser as a download. */
export function downloadCsv(filename, csv) {
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}