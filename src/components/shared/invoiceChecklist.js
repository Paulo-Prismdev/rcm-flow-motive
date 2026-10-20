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
import { excessMode } from './excessState';

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
 * - setsRepairCost → the total read off this document is offered as the claim's
 *   final repair cost.
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
    label: 'Final Insurer Invoice',
    section: 'closeout',
    // The repairer's Final Insurer Invoice to the insurer: we keep a copy on file
    // and the repair cost is read off it — the whole of it on a job where the
    // client's VAT and excess are not handled by us, otherwise the part the
    // insurer pays, with the VAT & excess invoice beside it — but we are not
    // paid on it ourselves, so it is close-out paperwork like the Final
    // Authority: green on a copy, with no paid step.
    kind: 'document',
    direction: 'out',
    dateLabel: 'Sent',
    requires: 'not_credit_repair',
    party: 'authorising_party',
    // Its date is the date printed on the invoice itself, never the upload date.
    bindings: { date: 'invoice_sent_date' },
    // The job is invoiced once the Final Insurer Invoice itself is on file.
    date_status_field: 'invoice_status',
    date_status_value: 'Invoiced',
    setsRepairCost: true,
  },
  {
    // Where we handle a client's VAT and excess, the repairer bills us for the
    // VAT content of their repair plus the excess they collected. That invoice
    // arrives with their Final Insurer Invoice, so it is filed on the close-out step
    // beside it — named from the repairer, and checked the same way as any other
    // invoice that comes in. It is still an invoice we pay: it keeps its own
    // received date and its paid step alongside the rest of them.
    key: 'vat_excess_invoice_in',
    label: 'VAT & Excess Invoice In',
    section: 'closeout',
    direction: 'in',
    dateLabel: 'Received',
    requires: 'vat_excess',
    party: 'repairer',
    amountSource: 'vat_excess',
    bindings: {
      paid: 'excess_contribution_paid',
      paid_date: 'excess_contribution_paid_date',
    },
    date_flag: 'excess_contribution_invoice_received',
    varianceReason: 'Repair cost, excess or VAT status changed',
  },
  {
    key: 'final_authority',
    label: 'Final Authority',
    section: 'closeout',
    kind: 'document',
    direction: 'in',
    dateLabel: 'Received',
    requires: 'not_credit_repair',
    // Its own date: "Authority Received" is the initial authority, which belongs
    // to the Initial Authority document, not to this one.
    bindings: { date: 'final_authority_received' },
    // Its own short read: the registration it covers, the amount the repair was
    // authorised at and the excess it shows. None of the invoice's own checks
    // apply to it.
    readsAuthority: true,
  },
  {
    key: 'collection_note',
    label: 'Collection Note',
    section: 'closeout',
    kind: 'document',
    direction: 'out',
    dateLabel: 'Sent',
    requires: 'not_credit_repair',
    // Recommended, not required: a copy is encouraged and nudged in amber until
    // it is filed, but the job's invoicing finishes without one. "Not available"
    // records why there won't be one, and stops the nudge.
    recommended: true,
    // Nothing is read off it and it carries no figures: uploading it stores the
    // copy, and that is the whole of it.
    storeOnly: true,
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
    amountSource: 'second_referrer_fee',
    varianceReason: 'Second referrer fee or repair cost changed',
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

/**
 * What happens when a document is uploaded:
 * - 'store'     → the copy is stored and nothing is read off it (Collection Note)
 * - 'authority' → its own short read: registration, authorised amount, excess
 * - 'invoice'   → the full invoice read
 */
export const invoiceDocumentKind = (item) =>
  item?.storeOnly ? 'store' : item?.readsAuthority ? 'authority' : 'invoice';

/**
 * Recommended items are encouraged but never required: while one is missing its
 * card is amber rather than red, it is left out of the job's progress, and it
 * never leaves the job looking incomplete.
 */
export const isRecommendedItem = (item) => item?.recommended === true;

/** The invoices we raise, which "Request from accounts" applies to. */
export const canRequestInvoice = (item) =>
  !!item && !isInvoiceDocument(item) && item.direction === 'out' && item.section === 'out';

export const INVOICE_STATUS_META = {
  'Not Ready for Invoicing': { label: 'Figures missing', tone: 'warning' },
  'Ready to Invoice': { label: 'Ready to invoice', tone: 'neutral' },
  'Invoice Required - Pending': { label: 'Pending invoices', tone: 'warning' },
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

/** A date the way the tracker shows and writes it: 14 Oct 2026. */
export const formatInvoiceDay = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** The repair cost with VAT taken out of it. */
export const repairNet = (claim) => round2(toNum(claim?.final_repair_cost) / (1 + VAT_RATE));
/** The VAT content of the final repair cost. */
export const repairVat = (claim) => round2(toNum(claim?.final_repair_cost) - repairNet(claim));

/** The second referrer's agreed share of the repair, set on this claim. */
export const secondReferrerPercent = (claim) => toNum(claim?.invoice_tracker?.second_referrer_percent);

/**
 * A referrer's VAT status, which decides whether VAT goes on their invoice: a
 * non-VAT referrer invoices their fee alone, so the expected amount matches what
 * they actually bill. The status sits on the referrer's own record, is carried
 * onto the claim when they are picked, and is synced from the referrer directory.
 * Until it is set otherwise, a referrer reads as VAT registered.
 */
export const referrerVatRegistered = (claim) => claim?.referrer_vat_registered !== false;
export const secondReferrerVatRegistered = (claim) => claim?.invoice_tracker?.second_referrer_vat_registered !== false;

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
    // Their own record's name, so the invoice's party, and the check that the
    // invoice came from the company we asked, both read off the referrer.
    case 'second_referrer': return tracker.second_referrer_name || '';
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

/** The same amount with no VAT on it, for a party that isn't VAT registered. */
const withoutVat = (ex, workings, hint) => {
  const net = round2(ex);
  return {
    amount: net, ex: net, vat: 0, total: net,
    derived: true, awaiting: false, hint, workings,
  };
};

const AMOUNT_RESOLVERS = {
  // The referrer invoices us their agreed share of the repair cost (ex VAT) — with
  // VAT on it only where the referrer is VAT registered.
  referrer_fee: (claim) => {
    if (toNum(claim.final_repair_cost) <= 0) return awaiting('Enter the final repair cost');
    const pct = toNum(claim.percent_to_referrer);
    if (pct <= 0) return awaiting('Set the referrer fee %');
    const net = repairNet(claim);
    const fee = round2(net * pct / 100);
    const vatReg = referrerVatRegistered(claim);
    const workings = [
      { label: 'Repair cost ex VAT', value: fmtGBP(net) },
      { label: `Referrer fee (${pct}%)`, value: fmtGBP(fee) },
      { label: 'Referrer VAT status', value: vatReg ? 'VAT registered' : 'Not VAT registered' },
    ];
    if (!vatReg) {
      return withoutVat(fee, [
        ...workings,
        { label: 'Non-VAT referrer — no VAT charged', value: '—' },
        { label: 'Total', value: fmtGBP(fee), total: true },
      ], `${pct}% of the repair cost ex VAT — no VAT on it, the referrer isn't VAT registered`);
    }
    const vat = round2(fee * VAT_RATE);
    return withVat(fee, [
      ...workings,
      { label: 'VAT (20%)', value: fmtGBP(vat) },
      { label: 'Total', value: fmtGBP(round2(fee + vat)), total: true },
    ], `${pct}% of the repair cost ex VAT`);
  },
  // A second referrer invoices us their own share, worked out exactly as the
  // main referrer's is: their % of the repair cost ex VAT, plus VAT.
  second_referrer_fee: (claim) => {
    if (toNum(claim.final_repair_cost) <= 0) return awaiting('Enter the final repair cost');
    const pct = secondReferrerPercent(claim);
    if (pct <= 0) return awaiting('Set the second referrer fee %');
    const net = repairNet(claim);
    const fee = round2(net * pct / 100);
    const vatReg = secondReferrerVatRegistered(claim);
    const workings = [
      { label: 'Repair cost ex VAT', value: fmtGBP(net) },
      { label: `Second referrer fee (${pct}%)`, value: fmtGBP(fee) },
      { label: 'Referrer VAT status', value: vatReg ? 'VAT registered' : 'Not VAT registered' },
    ];
    if (!vatReg) {
      return withoutVat(fee, [
        ...workings,
        { label: 'Non-VAT referrer — no VAT charged', value: '—' },
        { label: 'Total', value: fmtGBP(fee), total: true },
      ], `${pct}% of the repair cost ex VAT — no VAT on it, the referrer isn't VAT registered`);
    }
    const vat = round2(fee * VAT_RATE);
    return withVat(fee, [
      ...workings,
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
    // An excess marked TBC on authority is not £0 (0 means waived): the invoice
    // waits for the figure rather than billing the VAT content on its own.
    if (claim.excess_tbc === true) return awaiting('The policy excess is TBC on authority — this invoice waits for the figure');
    const vatReg = claim.client_vat_status === 'VAT Registered';
    const vatContent = repairVat(claim);
    // A waived excess is £0 — nothing payable — so the item bills the VAT content
    // alone and says so, rather than reading as a figure of nothing.
    const waived = excessMode(claim) === 'waived';
    const excess = isStored(claim.policy_excess) ? round2(toNum(claim.policy_excess)) : 0;
    const vat = vatReg ? vatContent : 0;
    const total = round2(excess + vat);
    return {
      amount: total, ex: excess, vat, total, derived: true, awaiting: false,
      hint: waived
        ? (vatReg ? 'Excess waived — the VAT content of the repair only' : 'Excess waived — nothing payable')
        : vatReg
          ? 'Customer excess plus the VAT content of the repair'
          : 'Customer excess only — non-VAT customer',
      workings: [
        { label: 'Repair cost inc VAT', value: fmtGBP(gross) },
        { label: 'VAT content of the repair', value: fmtGBP(vatContent) },
        { label: 'Customer VAT status', value: claim.client_vat_status || 'Not set' },
        ...(vatReg ? [] : [{ label: 'Non-VAT — no VAT recoverable', value: '—' }]),
        { label: 'Policy excess', value: waived ? 'Waived — nothing payable' : fmtGBP(excess) },
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
  // A close-out document records the total read off it, which never counts as
  // money owed, but is what the authority is checked against.
  const stored = storedAmount(item, claim);

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
    ? {
      invoiced: stored,
      calculated: calc.amount,
      reason: item.varianceReason,
      // Our own invoices are locked at the figure they went out at, so their
      // warning says what moved underneath them. An invoice we received is simply
      // what the other party billed, so it reads as the amount it came in at
      // against the amount that was expected.
      text: item.direction === 'in'
        ? `Invoice is ${fmtGBP(round2(Math.abs(stored - calc.amount)))} ${stored < calc.amount ? 'less' : 'more'} than expected (calculated ${fmtGBP(calc.amount)}, invoiced ${fmtGBP(stored)})`
        : `${item.varianceReason} — calculated ${fmtGBP(calc.amount)}, invoiced ${fmtGBP(stored)}`,
    }
    : null;

  const amount = asDocument
    ? (stored !== null ? stored : 0)
    : (stored !== null ? stored : (calc?.amount ?? 0));
  const ex = asDocument
    ? (stored !== null ? (entry.ex != null ? toNum(entry.ex) : splitGross(stored).ex) : 0)
    : awaiting ? 0
      : stored !== null ? (entry.ex != null ? toNum(entry.ex) : splitGross(stored).ex)
        : calc?.ex ?? 0;
  const vat = asDocument
    ? (stored !== null ? (entry.vat != null ? toNum(entry.vat) : splitGross(stored).vat) : 0)
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
    paidBy: entry.paid_by || '',
    // A close-out document is only received/sent once a copy is actually filed:
    // its date on its own is not enough.
    received: asDocument ? !!hasFiles : false,
    // The copy itself, on file. A raise or collect step finishes on this and
    // nothing else, and a paid invoice that is still missing it says so.
    copyAttached: !!hasFiles,
    dateRecordedNoCopy: asDocument && !hasFiles && !!date,
    // A copy is on file but is waiting to be replaced by a corrected one: the
    // item stays amber until the corrected copy lands.
    reinvoice: entry.reinvoice_requested || null,
    awaitingCorrected: !!entry.reinvoice_requested,
    notApplicable: entry.not_applicable === true,
    notApplicableReason: entry.not_applicable_reason || '',
    invoiceNumber: entry.invoice_number || '',
    // The file the details were read from, and whether those details are still
    // recorded with no copy left behind them.
    detailsSource: entry.details_source || null,
    keptDetailsWithoutCopy: !asDocument && !!entry.details_source && !hasFiles,
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
 * The copy mirror for a claim, built from its filed Invoice Documents: the items
 * holding a copy, and nothing for those that don't.
 */
export function invoiceCopyMap(files = []) {
  const map = {};
  for (const file of files) {
    if (isInvoiceDocKey(file?.item_key)) map[file.item_key.slice(INVOICE_FILE_PREFIX.length)] = true;
  }
  return map;
}

/** Whether two copy mirrors list the same invoices. */
export function sameInvoiceCopies(a, b) {
  const held = (map) => Object.keys(map || {}).filter((key) => map[key]).sort();
  const ours = held(a);
  const theirs = held(b);
  return ours.length === theirs.length && ours.every((key, i) => key === theirs[i]);
}

/**
 * "A copy is filed" for a claim whose documents aren't loaded, read from the mirror
 * the claim carries of them (invoice_copies). The claims list judges an invoice by
 * it exactly as the Financials screen judges it by the files themselves.
 */
export function claimCopyOnFile(claim) {
  const copies = claim?.invoice_copies || {};
  return (itemKey) => copies[itemKey] === true;
}

/**
 * Summary across the items visible on this claim.
 * `hasFile(itemKey)` reports whether an invoice item already holds a copy: the
 * claim's filed documents on the Financials screen, or the copy mirror recorded on
 * the claim itself everywhere else. Either way an invoice is only finished once its
 * copy is attached and it is paid, and anything still missing its copy is listed in
 * `copiesMissing`. `ignoreCopies` judges the invoices on their money and dates
 * alone, for readings that predate the mirror.
 */
export function computeInvoiceSummary(claim, ctx, hasFile = claimCopyOnFile(claim), { ignoreCopies = false } = {}) {
  const rows = INVOICE_ITEMS
    .filter((item) => isInvoiceItemVisible(item, ctx))
    .map((item) => ({ item, state: getInvoiceItemState(item, claim, hasFile(item.key)) }));

  let complete = 0;
  let total = 0;
  let outstanding = 0;
  let owedToUs = 0;
  let weOwe = 0;
  let toCollect = 0;
  let toPay = 0;
  const copiesMissing = [];

  for (const { item, state } of rows) {
    // Recommended items are encouraged separately: they are left out of the
    // progress, of what is still outstanding and of what is owed or to pay, so a
    // missing Collection Note can never leave the job looking unfinished.
    if (state.notApplicable || isRecommendedItem(item)) continue;
    total += 1;

    // A copy on file: for a close-out document that is the whole of it, for an
    // invoice it is what the raise and collect steps finish on.
    const attached = isInvoiceDocument(item) ? state.received : state.copyAttached;
    if (!ignoreCopies && !attached) copiesMissing.push({ key: item.key, label: item.label });

    // Paid (or, for a document, received). A copy is part of being done: an invoice
    // without its copy is still outstanding, whichever screen is asking.
    const settled = isItemComplete(item, state);
    if (settled && (ignoreCopies || attached)) { complete += 1; continue; }

    outstanding += 1;
    if (isInvoiceDocument(item) || settled) continue;
    if (item.direction === 'out') {
      owedToUs += state.amount;
      toCollect += 1;
    } else {
      weOwe += state.amount;
      toPay += 1;
    }
  }

  return {
    rows,
    complete,
    total,
    outstanding,
    copiesMissing,
    owedToUs: round2(owedToUs),
    weOwe: round2(weOwe),
    // How many invoices the two totals above are still waiting on, counted off
    // the very rows those totals are made of — so the count and the money can
    // never disagree: every invoice paid reads 0, and the close-out paperwork
    // (never money) counts as neither.
    toCollect,
    toPay,
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

  // A second referrer's fee is needed wherever a second referrer is paying —
  // credit repair included — and is asked for like any other figure the invoices
  // are worked out from.
  if (ctx.secondReferrerEnabled && secondReferrerPercent(claim) <= 0) {
    missing.push({ key: 'second_referrer_percent', label: 'Second referrer fee %' });
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
    if (!ctx.privatePaying && claim?.excess_tbc === true) {
      missing.push({ key: 'policy_excess', label: 'Policy excess (TBC on authority)' });
    } else if (!ctx.privatePaying && !isStored(claim?.policy_excess)) {
      missing.push({ key: 'policy_excess', label: 'Policy excess' });
    }
  }
  return missing;
}

/**
 * The claim's overall invoicing status, worked out from the invoices themselves:
 * it can never read "Invoiced" while invoices are still to be raised, copies are
 * still to be filed or figures are still missing.
 */
export function deriveInvoiceStatus(claim, hasFile = claimCopyOnFile(claim), { financialsView = false, ignoreCopies = false } = {}) {
  const ctx = claimInvoiceContext(claim);
  const summary = computeInvoiceSummary(claim, ctx, hasFile, { ignoreCopies });
  const rows = summary.rows.filter((r) => !r.state.notApplicable);

  if (rows.length === 0) return 'Not Applicable';
  if (summary.missing.length > 0) return 'Not Ready for Invoicing';

  // Overdue means one of our own invoices has gone out and is still unpaid past
  // the due date. The Final Insurer Invoice is the repairer's, not ours, so it takes no
  // part in this.
  const unpaidOut = rows.some(({ item, state }) =>
    !isInvoiceDocument(item) && item.direction === 'out' && !!state.date && !state.paid);
  const overdue = unpaidOut && !!claim?.invoice_due_date && claim.invoice_due_date < today();

  // An invoice that has been paid while its copy is still missing is not finished
  // work: the claim reads as pending, exactly as it does on its own Financials
  // screen, until the copy is filed.
  const paidWaitingCopy = !ignoreCopies && rows.some(({ item, state }) =>
    !isInvoiceDocument(item) && state.paid && !state.copyAttached);

  // The Financials screen reads the job's invoicing as one line of progress, so it
  // is never "Ready to invoice" or "Invoiced": it is finished only once every
  // applicable invoice is attached and paid — the Collection Note aside, which is
  // recommended rather than required. Short of that it reads "Pending invoices",
  // with what is missing listed beside it.
  if (financialsView) {
    if (summary.complete === summary.total) return 'Invoice Paid';
    return overdue ? 'Invoice Overdue' : 'Invoice Required - Pending';
  }

  if (summary.complete === summary.total) return 'Invoice Paid';

  // Only the invoices themselves decide whether the claim has been invoiced;
  // the close-out paperwork is tracked by the progress count.
  const invoices = rows.filter(({ item }) => !isInvoiceDocument(item));
  if (!invoices.some(({ item, state }) => isItemHandled(item, state))) return 'Ready to Invoice';
  if (invoices.some(({ item, state }) => !isItemHandled(item, state)) || paidWaitingCopy) {
    return 'Invoice Required - Pending';
  }

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
  // Judged on the invoices' own money and dates, with the copies left out: this
  // review is about a status set before the claim mirrored its copies, and an
  // invoice that has been paid is invoiced, copy or no copy.
  const ctx = claimInvoiceContext(claim);
  const copies = claimCopyOnFile(claim);
  const derived = deriveInvoiceStatus(claim, copies, { ignoreCopies: true });
  if (derived === 'Invoiced' || derived === 'Invoice Paid') return null;
  return {
    stored,
    derived,
    outstanding: computeInvoiceSummary(claim, ctx, copies, { ignoreCopies: true }).outstanding,
  };
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

  // The split read off an invoice itself, kept alongside that invoice's total.
  if (!asDocument && has('ex')) {
    const n = changes.ex === '' || changes.ex === null || changes.ex === undefined ? null : Number(changes.ex);
    entry.ex = n === null || Number.isNaN(n) ? null : n;
  }
  if (!asDocument && has('vat')) {
    const n = changes.vat === '' || changes.vat === null || changes.vat === undefined ? null : Number(changes.vat);
    entry.vat = n === null || Number.isNaN(n) ? null : n;
  }

  // The invoice's own number, recorded against the item it belongs to.
  if (has('invoice_number')) {
    entry.invoice_number = changes.invoice_number || '';
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

  // The paid date is asked for, never assumed: a payment is only recorded with
  // the date the money landed, and marking it unpaid clears that date again.
  if (!asDocument && has('paid')) {
    const paid = !!changes.paid;
    const current = getInvoiceItemState(item, claim);
    write('paid', paid);
    write('paid_date', paid ? (changes.paid_date || current.paidDate || null) : null);
    write('paid_by', paid ? (changes.paid_by || current.paidBy || '') : null);
    if (item.status_field) patch[item.status_field] = paid ? item.paid_status : item.unpaid_status;
  }

  if (!asDocument && has('paid_date')) {
    write('paid_date', changes.paid_date || null);
  }

  if (has('not_applicable')) {
    entry.not_applicable = !!changes.not_applicable;
    // A recommended item that won't be coming records why, so the reason sits on
    // its card and in the history; needing it again clears it.
    entry.not_applicable_reason = changes.not_applicable ? (changes.not_applicable_reason || null) : null;
  }

  items[item.key] = entry;
  return { patch: { ...patch, invoice_tracker: { ...source, items } } };
}

/**
 * Patch that records an invoice read off an uploaded document: its number and
 * figures, and the date that marks it received or sent — which locks the amount,
 * as it always has. The amount is written first, so the date locks the invoice's
 * own figure rather than the calculated one.
 *
 * `origin` is the file the details were read from, remembered against the item so
 * the copy behind a recorded invoice can always be pointed at later — and so
 * removing that copy can take the details with it. Where the invoice's total also
 * became the claim's final repair cost, the file that supplied it is remembered
 * the same way. Where the invoice total was left waiting on a corrected copy, the
 * re-invoice request is recorded against the item here too.
 */
export function buildInvoiceReviewPatch(item, claim, figures, origin) {
  const amountPatch = buildInvoiceItemPatch(item, claim, {
    amount: figures.amount_total,
    ex: figures.amount_ex_vat,
    vat: figures.vat_amount,
  }).patch;

  const withAmount = { ...claim, ...amountPatch };
  const date = figures.invoice_date || '';
  const datePatch = date ? buildInvoiceItemPatch(item, withAmount, { date }).patch : {};

  const source = datePatch.invoice_tracker || amountPatch.invoice_tracker || claim.invoice_tracker || {};
  const items = { ...(source.items || {}) };
  const entry = { ...(items[item.key] || {}) };
  entry.invoice_number = figures.invoice_number || '';
  // A close-out document's own figures are kept on its entry: they never count
  // as money owed, but the Final Insurer Invoice's total is what the authority is
  // checked against — and a corrected copy clears the request for one.
  if (isInvoiceDocument(item)) {
    const total = toNum(figures.amount_total);
    entry.amount = total === null ? null : round2(total);
    entry.ex = toNum(figures.amount_ex_vat);
    entry.vat = toNum(figures.vat_amount);
    entry.reinvoice_requested = origin?.reinvoice || null;
  }
  if (origin?.file_url) {
    const at = new Date().toISOString();
    entry.details_source = {
      file_url: origin.file_url,
      file_name: origin.file_name || '',
      at,
    };
    if (origin.repair_cost) {
      entry.repair_cost_source = {
        file_url: origin.file_url,
        file_name: origin.file_name || '',
        amount: origin.repair_cost,
        at,
      };
    }
  }
  items[item.key] = entry;

  return { ...amountPatch, ...datePatch, invoice_tracker: { ...source, items } };
}

/**
 * Clear everything an item's details were read off the file being removed: the
 * amounts read from it and their split, its invoice number, the date it set and
 * the status that date drives, the reminder of where the details came from and
 * the amount lock the date created.
 *
 * What was never read off the invoice deliberately stays: a payment and an
 * accounts request are separate decisions, so undoing a payment still takes the
 * paid action. A final repair cost that came from this invoice is never moved
 * behind anyone's back either — it is left standing and flagged for checking, and
 * the claim's own invoicing status is worked out from the invoices as usual.
 */
export function buildInvoiceDetailsClearPatch(item, claim, { fileUrl, clearedBy } = {}) {
  const asDocument = isInvoiceDocument(item);
  const b = item.bindings || {};
  const source = claim.invoice_tracker || {};
  const items = { ...(source.items || {}) };
  const entry = { ...(items[item.key] || {}) };
  const state = getInvoiceItemState(item, claim);
  const calc = resolveInvoiceAmount(item, claim);
  const patch = {};
  const clearPoints = [];

  if (!asDocument && (entry.amount != null || entry.ex != null || entry.vat != null)) {
    entry.amount = null;
    entry.ex = null;
    entry.vat = null;
    clearPoints.push(calc && !calc.awaiting
      ? `the amount read from it, back to the calculated ${fmtGBP(calc.amount)}`
      : 'the amount read from it');
  }

  // A close-out document's own figures go with the details read off its copy,
  // and the authorised cost it recorded goes with them too.
  if (asDocument && (entry.amount != null || entry.ex != null || entry.vat != null)) {
    entry.amount = null;
    entry.ex = null;
    entry.vat = null;
    clearPoints.push('the figures read from it');
  }
  if (asDocument && item.readsAuthority && isStored(claim.authority_cost_gross)) {
    patch.authority_cost_gross = null;
    patch.authority_cost_net = null;
    clearPoints.push(`the authorised cost it recorded (${fmtGBP(toNum(claim.authority_cost_gross))})`);
  }
  if (entry.reinvoice_requested) {
    entry.reinvoice_requested = null;
    clearPoints.push('the re-invoice request left against it');
  }

  if (state.invoiceNumber) {
    entry.invoice_number = '';
    clearPoints.push(`the invoice number it recorded (${state.invoiceNumber})`);
  }
  if (state.locked) clearPoints.push('the amount lock, so the calculated figure shows again');

  if (state.date) {
    if (b.date) patch[b.date] = null;
    else entry.date = null;
    if (item.date_flag) patch[item.date_flag] = false;
    const dateWord = (item.dateLabel || (item.direction === 'in' ? 'Received' : 'Sent')).toLowerCase();
    clearPoints.push(`the ${dateWord} date it set (${formatInvoiceDay(state.date)})`);
  }

  // A final repair cost read off this invoice stands, flagged rather than moved.
  const repairSource = entry.repair_cost_source || null;
  const repairCostFlagged = !!repairSource && (!fileUrl || repairSource.file_url === fileUrl);
  if (repairCostFlagged) {
    entry.repair_cost_source = null;
    entry.repair_cost_check = {
      reason: `Read from the ${item.label} copy that was removed`,
      amount: repairSource.amount,
      at: new Date().toISOString(),
      by: clearedBy || '',
    };
    clearPoints.push(`the final repair cost of ${fmtGBP(repairSource.amount)} left as it is and flagged for checking`);
  }

  // The record of where the details came from goes with them.
  entry.details_source = null;

  items[item.key] = entry;
  patch.invoice_tracker = { ...source, items };

  // The claim is invoiced once the Final Insurer Invoice is on file, so reverting that
  // date reverts the status it set — worked out from the invoices themselves.
  if (item.date_status_field && claim[item.date_status_field] === item.date_status_value) {
    patch[item.date_status_field] = deriveInvoiceStatus({ ...claim, ...patch });
    clearPoints.push('the invoiced status it set');
  }

  if (!state.paid) {
    clearPoints.push(state.requested
      ? 'put the item back to Requested, as it was'
      : 'put the item back to outstanding');
  }

  return { patch, clearPoints, repairCostFlagged };
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