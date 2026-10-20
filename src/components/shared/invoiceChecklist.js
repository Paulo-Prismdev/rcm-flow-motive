/**
 * Shared definition + logic for the claim invoicing flow.
 *
 * The invoices live in the Financials section and are INTERNAL ONLY. Their
 * uploaded files are stored as ClaimDocument rows under an `inv_` item key,
 * which the general Docs checklist ignores, so they never surface in the Docs
 * area or in the referrer / repairer / client portals.
 *
 * Amounts are worked out from the job figures (final repair cost, excess, VAT
 * status, referrer and repairer fees, credit repair rates) exactly as the party
 * cards used to, so there is only one place each figure is entered. An invoice
 * can be adjusted by hand on a single claim, and once it has been sent or
 * received its amount is locked at the figure it went out at — with a deliberate
 * unlock and a "calculated vs invoiced" warning if the job figures later move.
 *
 * Where an item overlaps an existing Financials field (invoice amount, invoice
 * sent date, payment received, excess contribution paid, authority received…)
 * the item reads from and writes to that same claim field rather than keeping
 * its own copy, so each date and each paid status is recorded in exactly one
 * place.
 */

import {
  isCreditRepairClaim,
  creditRepairHireFee,
  creditRepairCommission,
  claimLockedRates,
  fmtGBP,
  VAT_RATE,
} from './creditRepairRates';

export const INVOICE_FILE_PREFIX = 'inv_';

export const invoiceDocKey = (itemKey) => `${INVOICE_FILE_PREFIX}${itemKey}`;

export const isInvoiceDocKey = (key) =>
  typeof key === 'string' && key.startsWith(INVOICE_FILE_PREFIX);

/** Recipient of "Request from accounts" when settings hold nothing else. */
export const DEFAULT_ACCOUNTS_EMAIL = 'accounts@rcmltd.co.uk';

/** Accounts email lives in AppConfig under this key, editable in Settings. */
export const ACCOUNTS_EMAIL_CONFIG_KEY = 'accounts_email';

export const INVOICE_SECTIONS = [
  { key: 'in', label: 'Invoices In', hint: 'Invoices we receive and pay' },
  { key: 'out', label: 'Invoices Out', hint: 'Invoices we send and get paid for' },
  { key: 'closeout', label: 'Close-out', hint: "The job's final step" },
];

/**
 * The invoice items that can appear on a claim.
 * - kind 'document' → close-out paperwork. It is only ever received/sent (with a
 *   date and a file): no amount, no paid tick, and nothing in the owed totals.
 * - direction 'in'  → an invoice we receive and pay (money we owe)
 * - direction 'out' → an invoice we send and get paid for (money owed to us)
 * - requires       → visibility gate on the claim / client
 * - amountSource   → the amount is worked out from the job figures
 * - party          → who the invoice is to or from
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
    requires: 'not_credit_repair',
    party: 'authorising_party',
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
    requires: 'not_credit_repair',
    bindings: { date: 'authority_received' },
  },
  {
    key: 'collection_note',
    label: 'Collection Note',
    section: 'closeout',
    kind: 'document',
    direction: 'out',
    dateLabel: 'Sent',
    requires: 'not_credit_repair',
  },
  {
    key: 'referrer_invoice_in',
    label: 'Referrer Invoice In',
    section: 'in',
    direction: 'in',
    dateLabel: 'Received',
    requires: 'referrer',
    party: 'referrer',
    amountSource: 'referrer_fee',
    varianceReason: 'Referrer fee or repair cost changed',
  },
  {
    key: 'second_referrer_invoice_in',
    label: 'Second Referrer Invoice In',
    section: 'in',
    direction: 'in',
    dateLabel: 'Received',
    requires: 'second_referrer',
    party: 'second_referrer',
  },
  {
    key: 'vat_excess_invoice_in',
    label: 'VAT & Excess Invoice In',
    section: 'in',
    direction: 'in',
    dateLabel: 'Received',
    requires: 'vat_excess',
    party: 'client',
    amountSource: 'vat_excess',
    bindings: {
      paid: 'excess_contribution_paid',
      paid_date: 'excess_contribution_paid_date',
    },
    date_flag: 'excess_contribution_invoice_received',
    varianceReason: 'Repair cost, excess or VAT status changed',
  },
  {
    key: 'referral_invoice_out',
    label: 'Referral Invoice Out',
    section: 'out',
    direction: 'out',
    dateLabel: 'Sent',
    requires: ['not_credit_repair', 'repairer_referral'],
    party: 'repairer',
    amountSource: 'repairer_referral_fee',
    varianceReason: 'Referral fee or repair cost changed',
  },
  {
    key: 'vat_excess_invoice_out',
    label: 'VAT & Excess Invoice Out',
    section: 'out',
    direction: 'out',
    dateLabel: 'Sent',
    requires: 'vat_excess',
    party: 'client',
    amountSource: 'vat_excess',
    varianceReason: 'Repair cost, excess or VAT status changed',
  },
  // Credit repair claims: we invoice the credit repair company for our cut, from
  // two separate invoices. Both amounts are derived (hire category rate and
  // commission on the final repair cost), so they are never hand-entered here.
  {
    key: 'cr_hire_fee',
    label: 'Upfront Hire Fee',
    section: 'out',
    direction: 'out',
    dateLabel: 'Sent',
    requires: 'credit_repair',
    party: 'credit_repair',
    amountSource: 'credit_repair_hire_fee',
    varianceReason: 'Hire category or hire fee changed',
  },
  {
    key: 'cr_repair_commission',
    label: 'Repair Commission',
    section: 'out',
    direction: 'out',
    dateLabel: 'Sent',
    requires: 'credit_repair',
    party: 'credit_repair',
    amountSource: 'credit_repair_commission',
    varianceReason: 'Final repair cost or commission rate changed',
  },
];

export const isInvoiceDocument = (item) => item?.kind === 'document';

/** The invoices we raise, which "Request from accounts" applies to. */
export const canRequestInvoice = (item) =>
  !!item && !isInvoiceDocument(item) && item.direction === 'out' && item.section === 'out';

export const INVOICE_STATUS_META = {
  'Not Ready for Invoicing': { label: 'Figures missing', tone: 'warning' },
  'Ready to Invoice': { label: 'Ready to invoice', tone: 'neutral' },
  'Invoice Required - Pending': { label: 'Invoices outstanding', tone: 'warning' },
  Invoiced: { label: 'Invoiced', tone: 'positive' },
  'Invoice Paid': { label: 'Paid', tone: 'positive' },
  'Invoice Overdue': { label: 'Overdue', tone: 'negative' },
  'Not Applicable': { label: 'Not applicable', tone: 'faded' },
};

const toNum = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

const isStored = (v) => v !== null && v !== undefined && v !== '';
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const today = () => new Date().toISOString().split('T')[0];

/** The repair cost with VAT taken out of it. */
export const repairNet = (claim) => round2(toNum(claim?.final_repair_cost) / (1 + VAT_RATE));
/** The VAT content of the final repair cost. */
export const repairVat = (claim) => round2(toNum(claim?.final_repair_cost) - repairNet(claim));

const PRIVATE_TYPES = ['Paying Privately', '3rd Party Paying Privately'];

export const isPrivatePayingClaim = (claim) => PRIVATE_TYPES.includes(claim?.claim_type);

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
    hasSecondReferrerName: !!tracker.second_referrer_name,
    vatExcess: !!vatExcess,
    hasReferralFee: toNum(claim?.referral_fee_repairer) > 0 || toNum(claim?.referral_fee_repairer_gbp) > 0,
    creditRepair: isCreditRepairClaim(claim),
    hasRepairer: !!claim?.bodyshop || !!claim?.bodyshop_id,
    privatePaying: isPrivatePayingClaim(claim),
  };
}

/** Context worked out from the claim alone, for the claims list. */
export function claimInvoiceContext(claim) {
  return invoiceContext(claim, claim?.client_vat_excess_handled === true);
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

/**
 * Whether a repairer referral fee is expected: money the repairer pays us for
 * the referral. Only on jobs where a repairer is on the claim, the job isn't
 * credit repair, and the customer isn't paying us privately.
 */
export const repairerReferralApplies = (claim, ctx) =>
  !ctx.creditRepair && !ctx.privatePaying && (ctx.hasRepairer || ctx.hasReferralFee);

function matchesRequirement(requirement, ctx) {
  switch (requirement) {
    case 'referrer': return !!ctx.hasReferrer;
    case 'second_referrer': return !!ctx.secondReferrerEnabled;
    case 'vat_excess': return !!ctx.vatExcess;
    case 'referral_fee': return !!ctx.hasReferralFee;
    case 'repairer_referral':
      return !!ctx.hasReferralFee || (!ctx.privatePaying && !ctx.creditRepair && !!ctx.hasRepairer);
    case 'credit_repair': return !!ctx.creditRepair;
    case 'not_credit_repair': return !ctx.creditRepair;
    default: return true;
  }
}

export function isInvoiceItemVisible(item, ctx = {}) {
  const requirements = Array.isArray(item.requires) ? item.requires : [item.requires];
  return requirements.every((requirement) => matchesRequirement(requirement, ctx));
}

/** Who an invoice is to (out) or from (in). */
export function invoicePartyName(claim, item) {
  const tracker = claim?.invoice_tracker || {};
  switch (item?.party) {
    case 'referrer': return claim?.referrer || '';
    case 'second_referrer': return tracker.second_referrer_name || 'Second referrer';
    case 'repairer': return claim?.bodyshop || '';
    case 'client': return claim?.client_name || '';
    case 'credit_repair': return claim?.credit_repair_company_name || '';
    case 'authorising_party':
      return claim?.authorising_party_name || claim?.insurer || claim?.referrer || claim?.client_name || '';
    default: return '';
  }
}

/* ── Amount workings ───────────────────────────────────────────────────────
 * Every calculated invoice returns its workings, so each row can show exactly
 * how its amount was reached.
 */

const awaiting = (hint) => ({
  amount: 0, ex: 0, vat: 0, total: 0,
  derived: true, awaiting: true, hint, workings: [],
});

const withVat = (ex, workings, hint) => {
  const net = round2(ex);
  const vat = round2(net * VAT_RATE);
  return {
    amount: round2(net + vat), ex: net, vat, total: round2(net + vat),
    derived: true, awaiting: false, hint, workings,
  };
};

const AMOUNT_RESOLVERS = {
  // The referrer invoices us their agreed share of the repair cost (ex VAT).
  referrer_fee: (claim) => {
    if (toNum(claim.final_repair_cost) <= 0) return awaiting('Enter the final repair cost');
    const pct = toNum(claim.percent_to_referrer);
    if (pct <= 0) return awaiting('Set the referrer fee %');
    const net = repairNet(claim);
    const fee = round2(net * pct / 100);
    const vat = round2(fee * VAT_RATE);
    return withVat(fee, [
      { label: 'Repair cost ex VAT', value: fmtGBP(net) },
      { label: `Referrer fee (${pct}%)`, value: fmtGBP(fee) },
      { label: 'VAT (20%)', value: fmtGBP(vat) },
      { label: 'Total', value: fmtGBP(round2(fee + vat)), total: true },
    ], `${pct}% of the repair cost ex VAT`);
  },
  // The repairer pays us a referral fee: a fixed £ figure where one is set,
  // otherwise the agreed percentage of the repair cost ex VAT.
  repairer_referral_fee: (claim) => {
    const fixed = toNum(claim.referral_fee_repairer_gbp);
    if (fixed > 0) {
      return withVat(fixed, [
        { label: 'Fixed referral fee (ex VAT)', value: fmtGBP(fixed) },
        { label: 'VAT (20%)', value: fmtGBP(round2(fixed * VAT_RATE)) },
        { label: 'Total', value: fmtGBP(round2(fixed * (1 + VAT_RATE))), total: true },
      ], 'Fixed referral fee');
    }
    if (toNum(claim.final_repair_cost) <= 0) return awaiting('Enter the final repair cost');
    const pct = toNum(claim.referral_fee_repairer);
    if (pct <= 0) return awaiting('Set the repairer referral fee');
    const net = repairNet(claim);
    const fee = round2(net * pct / 100);
    const vat = round2(fee * VAT_RATE);
    return withVat(fee, [
      { label: 'Repair cost ex VAT', value: fmtGBP(net) },
      { label: `Referral fee (${pct}%)`, value: fmtGBP(fee) },
      { label: 'VAT (20%)', value: fmtGBP(vat) },
      { label: 'Total', value: fmtGBP(round2(fee + vat)), total: true },
    ], `${pct}% of the repair cost ex VAT`);
  },
  // The VAT content of the repair plus the customer's policy excess. A non-VAT
  // customer has no VAT to recover, so only their excess is billed.
  vat_excess: (claim) => {
    const gross = toNum(claim.final_repair_cost);
    if (gross <= 0) return awaiting('Enter the final repair cost');
    const vatReg = claim.client_vat_status === 'VAT Registered';
    const vatContent = repairVat(claim);
    const excess = isStored(claim.policy_excess) ? round2(toNum(claim.policy_excess)) : 0;
    const vat = vatReg ? vatContent : 0;
    const total = round2(excess + vat);
    return {
      amount: total, ex: excess, vat, total, derived: true, awaiting: false,
      hint: vatReg
        ? 'Customer excess plus the VAT content of the repair'
        : 'Customer excess only — non-VAT customer',
      workings: [
        { label: 'Repair cost inc VAT', value: fmtGBP(gross) },
        { label: 'VAT content of the repair', value: fmtGBP(vatContent) },
        { label: 'Customer VAT status', value: claim.client_vat_status || 'Not set' },
        ...(vatReg ? [] : [{ label: 'Non-VAT — no VAT recoverable', value: '—' }]),
        { label: 'Policy excess', value: fmtGBP(excess) },
        { label: 'Total', value: fmtGBP(total), total: true },
      ],
    };
  },
  // Credit repair: a single agreed fee we invoice the partner for.
  credit_repair_hire_fee: (claim) => creditRepairWorkings(creditRepairHireFee(claim), 'Upfront hire fee'),
  credit_repair_commission: (claim) => creditRepairWorkings(creditRepairCommission(claim), 'Repair commission'),
};

function creditRepairWorkings(result, label) {
  if (!result || result.awaiting) {
    return { ...awaiting(result?.hint || `Awaiting the ${label.toLowerCase()}`), workings: [] };
  }
  const amount = round2(result.amount);
  return {
    amount, ex: amount, vat: 0, total: amount, derived: true, awaiting: false,
    hint: result.hint,
    workings: [
      { label, value: fmtGBP(amount) },
      { label: 'Total', value: fmtGBP(amount), total: true },
    ],
  };
}

/** The amount an item works out to, or null when it is entered by hand. */
export function resolveInvoiceAmount(item, claim) {
  if (!item?.amountSource) return null;
  const resolver = AMOUNT_RESOLVERS[item.amountSource];
  return resolver ? resolver(claim) : null;
}

/** The amount stored against an item (bound claim field or tracker entry). */
function storedAmount(item, claim) {
  const entry = (claim?.invoice_tracker?.items || {})[item.key] || {};
  const bound = item.bindings?.amount ? claim?.[item.bindings.amount] : null;
  if (item.bindings?.amount && isStored(bound)) return toNum(bound);
  return isStored(entry.amount) ? toNum(entry.amount) : null;
}

/** Split a total that had no workings of its own (a hand-entered amount). */
const splitGross = (total) => {
  const ex = round2(total / (1 + VAT_RATE));
  return { ex, vat: round2(total - ex) };
};

/**
 * Resolve an item's tracked values, reading bound claim fields where they exist.
 * `hasFiles` marks whether the item already has an uploaded file, which is what
 * makes a close-out document "received" even before a date is recorded.
 */
export function getInvoiceItemState(item, claim, hasFiles = false) {
  const entry = (claim?.invoice_tracker?.items || {})[item.key] || {};
  const b = item.bindings || {};
  const asDocument = isInvoiceDocument(item);
  const calc = resolveInvoiceAmount(item, claim);
  const stored = asDocument ? null : storedAmount(item, claim);

  const date = (b.date ? claim?.[b.date] : entry.date) || '';
  const paidDate = asDocument ? '' : ((b.paid_date ? claim?.[b.paid_date] : entry.paid_date) || '');

  let paid = false;
  if (!asDocument) {
    paid = b.paid ? claim?.[b.paid] === true : entry.paid === true;
    if (!b.paid && b.paid_date) paid = !!paidDate;
    if (item.status_field && claim?.[item.status_field] === item.paid_status) paid = true;
  }

  const awaiting = !!calc && calc.awaiting && stored === null;
  // A calculated invoice locks to the figure it was sent or received at, so a
  // later change to the job figures cannot move an invoice already gone out.
  const locked = !!calc && stored !== null && (!!date || paid);
  const adjusted = !!calc && stored !== null && !locked;
  const variance = locked && !calc.awaiting && Math.abs(calc.amount - stored) >= 0.01
    ? { invoiced: stored, calculated: calc.amount, reason: item.varianceReason }
    : null;

  const amount = asDocument ? 0 : (stored !== null ? stored : (calc?.amount ?? 0));
  const ex = asDocument ? 0
    : awaiting ? 0
      : stored !== null ? (entry.ex != null ? toNum(entry.ex) : splitGross(stored).ex)
        : calc?.ex ?? 0;
  const vat = asDocument ? 0
    : awaiting ? 0
      : stored !== null ? (entry.vat != null ? toNum(entry.vat) : splitGross(stored).vat)
        : calc?.vat ?? 0;

  const workings = calc?.workings?.length
    ? calc.workings
    : (amount > 0
      ? [
        { label: 'Amount entered (total inc VAT)', value: fmtGBP(amount) },
        { label: 'Ex VAT', value: fmtGBP(ex) },
        { label: 'VAT (20%)', value: fmtGBP(vat) },
      ]
      : []);

  return {
    amount,
    ex,
    vat,
    total: amount,
    derived: !!calc,
    awaiting,
    hint: calc?.hint || null,
    workings,
    date,
    paid,
    paidDate,
    received: asDocument ? (!!date || !!hasFiles) : false,
    notApplicable: entry.not_applicable === true,
    locked,
    adjusted,
    variance,
    requested: entry.requested === true,
    requestedAt: entry.requested_at || '',
  };
}

export function invoiceItemStatus(item, state) {
  if (state.notApplicable) return 'not_applicable';
  if (isInvoiceDocument(item)) {
    if (!state.received) return 'outstanding';
    return item.direction === 'in' ? 'received' : 'sent';
  }
  if (state.paid) return 'paid';
  if (state.requested) return 'requested';
  if (state.amount > 0 || state.date) return item.direction === 'in' ? 'received' : 'sent';
  return 'outstanding';
}

/** Whether an invoice is done: paid, or (for close-out paperwork) received. */
const isItemComplete = (item, state) =>
  state.notApplicable || (isInvoiceDocument(item) ? state.received : state.paid);

/**
 * Whether the invoice has been dealt with — requested from accounts, sent,
 * received, paid, or (for an invoice whose amount is typed in rather than
 * worked out) recorded at an amount. A calculated amount on its own is not
 * "dealt with": the invoice still has to go out.
 */
const isItemHandled = (item, state) =>
  isInvoiceDocument(item)
    ? state.received || !!state.date
    : state.paid || !!state.date || state.requested || (!state.derived && state.amount > 0);

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

    if (isItemComplete(item, state)) { complete += 1; continue; }
    outstanding += 1;
    if (isInvoiceDocument(item)) continue;
    if (item.direction === 'out') owedToUs += state.amount;
    else weOwe += state.amount;
  }

  return {
    rows,
    complete,
    total,
    outstanding,
    owedToUs: round2(owedToUs),
    weOwe: round2(weOwe),
    allComplete: total > 0 && complete === total,
    missing: missingJobFigures(claim, ctx),
  };
}

/** Summary for the claims list, where the linked client isn't loaded. */
export function claimInvoiceSummary(claim) {
  return computeInvoiceSummary(claim, claimInvoiceContext(claim));
}

/**
 * The job figures this claim needs before its invoices can be raised. Only the
 * figures that apply to the claim's type and set-up are ever listed.
 */
export function missingJobFigures(claim, ctx) {
  const missing = [];
  if (toNum(claim?.final_repair_cost) <= 0) {
    missing.push({ key: 'final_repair_cost', label: 'Final repair cost' });
  }

  if (ctx.creditRepair) {
    const rates = claimLockedRates(claim);
    if (!claim?.hire_category) missing.push({ key: 'hire_category', label: 'Hire category' });
    if (!rates || rates.hireFee === null) missing.push({ key: 'hire_fee', label: 'Partner hire fee' });
    if (!rates || rates.commissionPercent === null) missing.push({ key: 'commission_percent', label: 'Partner commission %' });
    if (rates && !rates.commissionBasis) missing.push({ key: 'commission_basis', label: 'Commission basis (net or gross)' });
    return missing;
  }

  if (ctx.hasReferrer && toNum(claim?.percent_to_referrer) <= 0) {
    missing.push({ key: 'percent_to_referrer', label: 'Referrer fee %' });
  }
  if (repairerReferralApplies(claim, ctx) && !ctx.hasReferralFee) {
    missing.push({ key: 'referral_fee', label: 'Repairer referral fee (or fixed £ fee)' });
  }
  // Excess and VAT status only matter where we bill the customer's VAT and
  // excess — and a customer paying us privately has no policy excess to bill.
  if (ctx.vatExcess) {
    if (!claim?.client_vat_status || claim.client_vat_status === 'Unknown') {
      missing.push({ key: 'client_vat_status', label: 'Customer VAT status' });
    }
    if (!ctx.privatePaying && !isStored(claim?.policy_excess)) {
      missing.push({ key: 'policy_excess', label: 'Policy excess' });
    }
  }
  return missing;
}

/**
 * The claim's overall invoicing status, worked out from the invoices themselves:
 * it can never read "Invoiced" while invoices are still to be raised or figures
 * are still missing.
 */
export function deriveInvoiceStatus(claim, hasFile = () => false) {
  const ctx = claimInvoiceContext(claim);
  const summary = computeInvoiceSummary(claim, ctx, hasFile);
  const rows = summary.rows.filter((r) => !r.state.notApplicable);

  if (rows.length === 0) return 'Not Applicable';
  if (summary.missing.length > 0) return 'Not Ready for Invoicing';
  if (summary.complete === summary.total) return 'Invoice Paid';

  // Only the invoices themselves decide whether the claim has been invoiced;
  // the close-out paperwork is tracked by the progress count.
  const invoices = rows.filter(({ item }) => !isInvoiceDocument(item));
  if (!invoices.some(({ item, state }) => isItemHandled(item, state))) return 'Ready to Invoice';
  if (invoices.some(({ item, state }) => !isItemHandled(item, state))) return 'Invoice Required - Pending';

  const finalUnpaid = claim?.invoice_sent_date && !claim?.invoice_payment_received;
  const overdue = finalUnpaid && claim?.invoice_due_date && claim.invoice_due_date < today();
  return overdue ? 'Invoice Overdue' : 'Invoiced';
}

/**
 * Claims the old "Email Accounts" button marked Invoiced while their invoices
 * are still outstanding, or their figures are still missing. Listed for review —
 * never changed automatically.
 */
export function invoiceStatusNeedsReview(claim) {
  const stored = claim?.invoice_status;
  if (stored !== 'Invoiced' && stored !== 'Invoice Paid') return null;
  const derived = deriveInvoiceStatus(claim);
  if (derived === 'Invoiced' || derived === 'Invoice Paid') return null;
  return { stored, derived, outstanding: claimInvoiceSummary(claim).outstanding };
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
    // A hand-entered amount has no workings of its own, so any split held from
    // the calculated figure is dropped and worked out from the new total.
    entry.ex = null;
    entry.vat = null;
  }

  if (has('date')) {
    write('date', changes.date || null);
    // Marking a calculated invoice as sent or received locks it to the figure it
    // goes out at, split and all, so its workings survive the lock.
    if (item.amountSource && changes.date && !isStored(getInvoiceItemState(item, claim).date) && storedAmount(item, claim) === null) {
      const calc = resolveInvoiceAmount(item, claim);
      if (calc && !calc.awaiting) {
        if (b.amount) patch[b.amount] = calc.amount;
        else entry.amount = calc.amount;
        entry.ex = calc.ex;
        entry.vat = calc.vat;
      }
    }
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

/**
 * Patch that records (or clears) an accounts request for one invoice. Only that
 * invoice is touched — the claim's own invoice status is left alone.
 */
export function buildInvoiceRequestPatch(claim, itemKey, { requested, requested_at, requested_by }) {
  const source = claim.invoice_tracker || {};
  const items = { ...(source.items || {}) };
  const entry = { ...(items[itemKey] || {}) };
  entry.requested = !!requested;
  entry.requested_at = requested ? (requested_at || new Date().toISOString()) : null;
  entry.requested_by = requested ? (requested_by || '') : null;
  items[itemKey] = entry;
  return { invoice_tracker: { ...source, items } };
}