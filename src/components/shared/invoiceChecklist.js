/**
 * Shared definition + logic for the per-claim Invoicing Tracker.
 *
 * The tracker lives in the Financials section and is INTERNAL ONLY. Its
 * uploaded files are stored as ClaimDocument rows under an `inv_` item key,
 * which the general Docs checklist ignores, so they never surface in the Docs
 * area or in the referrer / repairer / client portals.
 *
 * Where an item overlaps an existing Financials field (invoice sent date,
 * payment received, excess contribution paid, authority received…) the tracker
 * reads from and writes to that same claim field rather than keeping its own
 * copy, so each date and each paid status is recorded in exactly one place.
 */

export const INVOICE_FILE_PREFIX = 'inv_';

export const invoiceDocKey = (itemKey) => `${INVOICE_FILE_PREFIX}${itemKey}`;

export const isInvoiceDocKey = (key) =>
  typeof key === 'string' && key.startsWith(INVOICE_FILE_PREFIX);

export const INVOICE_SECTIONS = [
  { key: 'closeout', label: 'Job close-out' },
  { key: 'in', label: 'Invoices In', hint: 'Invoices we receive and pay' },
  { key: 'out', label: 'Invoices Out', hint: 'Invoices we send and get paid for' },
];

/**
 * The invoice items that can appear on a claim.
 * - kind 'document' → close-out paperwork. It is only ever received/sent (with a
 *   date and a file): no amount, no paid tick, and nothing in the owed totals.
 * - direction 'in'  → an invoice we receive and pay (money we owe)
 * - direction 'out' → an invoice we send and get paid for (money owed to us)
 * - requires       → visibility gate on the claim / client
 * - bindings       → claim fields that ARE the single source of truth for that value
 * - status_field   → existing invoice_status-style field kept in sync with "paid"
 */
export const INVOICE_ITEMS = [
  {
    key: 'final_invoice',
    label: 'Final Invoice',
    section: 'closeout',
    direction: 'out',
    dateLabel: 'Sent',
    bindings: {
      amount: 'invoice_amount',
      date: 'invoice_sent_date',
      paid_date: 'invoice_payment_received',
    },
    status_field: 'invoice_status',
    paid_status: 'Invoice Paid',
    unpaid_status: 'Invoiced',
    date_status_field: 'invoice_status',
    date_status_value: 'Invoiced',
  },
  {
    key: 'final_authority',
    label: 'Final Authority',
    section: 'closeout',
    kind: 'document',
    direction: 'in',
    dateLabel: 'Received',
    bindings: { date: 'authority_received' },
  },
  {
    key: 'collection_note',
    label: 'Collection Note',
    section: 'closeout',
    kind: 'document',
    direction: 'out',
    dateLabel: 'Sent',
  },
  {
    key: 'referrer_invoice_in',
    label: 'Referrer Invoice In',
    section: 'in',
    direction: 'in',
    dateLabel: 'Received',
    requires: 'referrer',
  },
  {
    key: 'second_referrer_invoice_in',
    label: 'Second Referrer Invoice In',
    section: 'in',
    direction: 'in',
    dateLabel: 'Received',
    requires: 'second_referrer',
  },
  {
    key: 'vat_excess_invoice_in',
    label: 'VAT & Excess Invoice In',
    section: 'in',
    direction: 'in',
    dateLabel: 'Received',
    requires: 'vat_excess',
    bindings: {
      amount: 'excess_contribution_amount',
      paid: 'excess_contribution_paid',
      paid_date: 'excess_contribution_paid_date',
    },
    date_flag: 'excess_contribution_invoice_received',
  },
  {
    key: 'referral_invoice_out',
    label: 'Referral Invoice Out',
    section: 'out',
    direction: 'out',
    dateLabel: 'Sent',
    requires: 'referral_fee',
  },
  {
    key: 'vat_excess_invoice_out',
    label: 'VAT & Excess Invoice Out',
    section: 'out',
    direction: 'out',
    dateLabel: 'Sent',
    requires: 'vat_excess',
  },
];

export const isInvoiceDocument = (item) => item?.kind === 'document';

export const INVOICE_STATUS_META = {
  paid: { label: 'paid', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  received: { label: 'received', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  sent: { label: 'sent', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  outstanding: { label: 'outstanding', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  not_applicable: { label: 'n/a', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', dot: 'bg-gray-400' },
};

const toNum = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

export const today = () => new Date().toISOString().split('T')[0];

/**
 * Visibility context for a claim. `vatExcess` comes from the claim's stored
 * snapshot of the linked client's "we handle their VAT and excess" flag, falling
 * back to the client record where one is loaded.
 */
export function invoiceContext(claim, vatExcess) {
  const tracker = claim?.invoice_tracker || {};
  return {
    hasReferrer: !!claim?.referrer,
    secondReferrerEnabled: tracker.second_referrer_enabled === true,
    vatExcess: !!vatExcess,
    hasReferralFee: toNum(claim?.referral_fee_repairer) > 0 || toNum(claim?.referral_fee_repairer_gbp) > 0,
  };
}

/**
 * The claim's VAT/excess applicability, preferring the snapshot held on the
 * claim itself and falling back to the loaded client record.
 */
export function claimHandlesVatExcess(claim, client) {
  const stored = claim?.client_vat_excess_handled;
  if (stored === true || stored === false) return stored;
  return client?.handles_vat_excess === true;
}

export function isInvoiceItemVisible(item, ctx = {}) {
  switch (item.requires) {
    case 'referrer': return !!ctx.hasReferrer;
    case 'second_referrer': return !!ctx.secondReferrerEnabled;
    case 'vat_excess': return !!ctx.vatExcess;
    case 'referral_fee': return !!ctx.hasReferralFee;
    default: return true;
  }
}

/**
 * Resolve an item's tracked values, reading bound claim fields where they exist.
 * `hasFiles` marks whether the item already has an uploaded file, which is what
 * makes a close-out document "received" even before a date is recorded.
 */
export function getInvoiceItemState(item, claim, hasFiles = false) {
  const source = claim?.invoice_tracker || {};
  const entry = (source.items || {})[item.key] || {};
  const b = item.bindings || {};
  const asDocument = isInvoiceDocument(item);

  const amount = asDocument ? 0 : (b.amount ? toNum(claim?.[b.amount]) : toNum(entry.amount));
  const date = (b.date ? claim?.[b.date] : entry.date) || '';
  const paidDate = asDocument ? '' : ((b.paid_date ? claim?.[b.paid_date] : entry.paid_date) || '');

  let paid = false;
  if (!asDocument) {
    paid = b.paid ? claim?.[b.paid] === true : entry.paid === true;
    if (!b.paid && b.paid_date) paid = !!paidDate;
    if (item.status_field && claim?.[item.status_field] === item.paid_status) paid = true;
  }

  const received = asDocument ? (!!date || !!hasFiles) : false;

  return { amount, date, paid, paidDate, received, notApplicable: entry.not_applicable === true };
}

export function invoiceItemStatus(item, state) {
  if (state.notApplicable) return 'not_applicable';
  if (isInvoiceDocument(item)) {
    if (!state.received) return 'outstanding';
    return item.direction === 'in' ? 'received' : 'sent';
  }
  if (state.paid) return 'paid';
  if (state.amount > 0 || state.date) return item.direction === 'in' ? 'received' : 'sent';
  return 'outstanding';
}

/**
 * Summary across the items visible on this claim.
 * `hasFile(itemKey)` reports whether an invoice item already holds a file — the
 * claims list has no documents loaded, so there an item counts as outstanding
 * until its date is recorded (uploading sets that date automatically).
 */
export function computeInvoiceSummary(claim, ctx, hasFile = () => false) {
  const rows = INVOICE_ITEMS
    .filter((item) => isInvoiceItemVisible(item, ctx))
    .map((item) => ({ item, state: getInvoiceItemState(item, claim, hasFile(item.key)) }));

  let complete = 0;
  let total = 0;
  let outstanding = 0;
  let owedToUs = 0;
  let weOwe = 0;

  for (const { item, state } of rows) {
    if (state.notApplicable) continue;
    total += 1;

    if (isInvoiceDocument(item)) {
      // Close-out paperwork is complete once it is received — there is nothing to pay.
      if (state.received) complete += 1;
      else outstanding += 1;
      continue;
    }

    if (state.paid) { complete += 1; continue; }
    outstanding += 1;
    if (item.direction === 'out') owedToUs += state.amount;
    else weOwe += state.amount;
  }

  return { rows, complete, total, outstanding, owedToUs, weOwe, allComplete: total > 0 && complete === total };
}

/**
 * Summary for the claims list, where the linked client isn't loaded. The
 * VAT/excess items are gated on the snapshot stored on the claim itself.
 */
export function claimInvoiceSummary(claim) {
  return computeInvoiceSummary(claim, {
    hasReferrer: !!claim?.referrer,
    secondReferrerEnabled: claim?.invoice_tracker?.second_referrer_enabled === true,
    vatExcess: claim?.client_vat_excess_handled === true,
    hasReferralFee: toNum(claim?.referral_fee_repairer) > 0 || toNum(claim?.referral_fee_repairer_gbp) > 0,
  });
}

/**
 * Build the claim patch for a single change to one invoice item.
 * Bound values are written to their claim field; everything else is stored in
 * invoice_tracker.items so there is still only one place per value.
 * Amount and paid changes are ignored for close-out documents.
 */
export function buildInvoiceItemPatch(item, claim, changes, ctx) {
  const asDocument = isInvoiceDocument(item);
  const b = item.bindings || {};
  const source = claim.invoice_tracker || {};
  const items = { ...(source.items || {}) };
  const entry = { ...(items[item.key] || {}) };
  const patch = {};

  const write = (slot, value) => {
    if (b[slot]) patch[b[slot]] = value;
    else entry[slot] = value;
  };

  const has = (key) => Object.prototype.hasOwnProperty.call(changes, key);

  if (!asDocument && has('amount')) {
    const raw = changes.amount;
    const n = raw === '' || raw === null || raw === undefined ? null : Number(raw);
    write('amount', n === null || Number.isNaN(n) ? null : n);
  }

  if (has('date')) {
    write('date', changes.date || null);
    // Keep the existing flags that mean the same thing in step with the date,
    // so the tracker and the Financials fields never disagree.
    if (!getInvoiceItemState(item, claim).paid) {
      if (item.date_flag) patch[item.date_flag] = !!changes.date;
      if (item.date_status_field && changes.date) {
        patch[item.date_status_field] = item.date_status_value;
      }
    }
  }

  if (!asDocument && has('paid')) {
    const paid = !!changes.paid;
    const current = getInvoiceItemState(item, claim);
    write('paid', paid);
    write('paid_date', paid ? (current.paidDate || today()) : null);
    if (item.status_field) patch[item.status_field] = paid ? item.paid_status : item.unpaid_status;
  }

  if (!asDocument && has('paid_date')) {
    write('paid_date', changes.paid_date || null);
  }

  if (has('not_applicable')) {
    entry.not_applicable = !!changes.not_applicable;
  }

  items[item.key] = entry;
  return { patch: { ...patch, invoice_tracker: { ...source, items } } };
}

/** Patch for tracker-level settings (the second-referrer switch and its name). */
export function buildTrackerMetaPatch(claim, changes) {
  const source = claim.invoice_tracker || {};
  return { invoice_tracker: { ...source, ...changes } };
}