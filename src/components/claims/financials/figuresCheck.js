import {
  buildTrackerMetaPatch,
  canRequestInvoice,
  finalInvoiceLabel,
  formatInvoiceDay,
  referrerFixedFee,
  repairerReferralApplies,
  salvageStorageCharge,
} from '@/components/shared/invoiceChecklist';
import { excessMode } from '@/components/shared/excessState';
import { NO_FEE_DISPLAY, feeState } from '@/components/shared/feeState';
import { authorityTotals, finalInvoiceTotal } from './invoiceAuthorityCheck';

/**
 * The check on the job figures — the deliberate look at the figures every invoice
 * is worked out from, before any invoice is asked for.
 *
 * The figures themselves are not stored twice: they are read off the claim where
 * they already live, so the summary can never disagree with the card beside it.
 * What IS stored is the confirmation: who checked them and when, together with the
 * figures as they stood at that moment. Comparing that snapshot with the figures as
 * they are now is what says whether the confirmation still holds — a figure that
 * has moved since is named, and the job asks to be checked again.
 */

/** Stored on the claim, in the internal invoicing tracker. */
export const FIGURES_CHECKED_KEY = 'figures_checked';

const trackerOf = (claim) => claim?.invoice_tracker || {};

const num = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** The confirmation the claim holds, or null where it has never been checked. */
export function figuresChecked(claim) {
  const stored = trackerOf(claim)[FIGURES_CHECKED_KEY];
  return stored && typeof stored === 'object' && stored.at ? stored : null;
}

/** "checked by Paul, 26 Oct 2026" — what the step says once it is done. */
export function figuresCheckedLine(record) {
  if (!record?.at) return 'to check';
  const when = formatInvoiceDay(String(record.at).slice(0, 10));
  return `checked by ${record.by || 'someone'}${when ? `, ${when}` : ''}`;
}

/**
 * Where a figure came off a document, where that is what happened — so the figures
 * read automatically are the ones the eye is drawn to. Worked out from the claim
 * itself: the figure still agrees with the document it was read from.
 */
export function figureSourceNote(claim, key) {
  const tracker = trackerOf(claim);
  const value = num(claim?.final_repair_cost);
  const authority = authorityTotals(claim);
  const finalAuthority = num(tracker.items?.final_authority?.amount) > 0 || !!claim?.final_authority_received;
  const authorityOn = !!authority || finalAuthority || !!tracker.items?.final_authority?.details_source;

  switch (key) {
    case 'final_repair_cost': {
      const invoice = finalInvoiceTotal(claim);
      const sources = [];
      if (invoice !== null && value !== null && Math.abs(value - invoice) <= 0.05) sources.push(finalInvoiceLabel(claim));
      // Only the Final Authority is ever the authorised figure an invoice is worked
      // from; the initial and supplementary authorities are records only.
      if (authority && value !== null && Math.abs(value - authority.gross) <= 0.05) {
        sources.push('Final Authority');
      }
      return sources.length > 0 ? `from the ${sources.join(' and the ')}` : '';
    }
    case 'storage_charge':
      return salvageStorageCharge(claim) !== null ? 'from the Salvage Agent Invoice' : '';
    case 'client_vat_status':
    case 'policy_excess':
      // The excess and the customer's VAT status are settled from the authorities: the
      // Final Authority where one has arrived, and otherwise from the authority itself.
      return authorityOn ? (finalAuthority ? 'from the Final Authority' : 'from the authority') : '';
    case 'storage_fee_percent':
      return num(tracker.storage_fee_percent) !== null ? 'set on this claim' : 'from Settings';
    case 'hire_fee':
    case 'commission_percent':
    case 'commission_basis':
      return claim?.credit_repair_rates_locked ? "from the credit repair partner's rates" : '';
    default:
      return '';
  }
}

/**
 * The figures the check covers on this claim — the ones that drive its invoices,
 * and only the ones that apply to it. Each carries the value as the snapshot holds
 * it and the note saying where it came from, where a document supplied it.
 */
export function figureRows({ claim, ctx, storagePercentDefault }) {
  const tracker = trackerOf(claim);
  const locked = claim?.credit_repair_rates_locked || {};
  const rows = [];
  const add = (row) => rows.push({ ...row, source: figureSourceNote(claim, row.key) });

  if (ctx?.totalLoss) {
    // A total loss has no repair: the storage charge read off the salvage invoice is
    // the figure the job stands on, and our share of it is the job's own setting.
    add({ key: 'storage_charge', label: 'Storage charge', value: num(salvageStorageCharge(claim)), money: true });
    add({
      key: 'storage_fee_percent',
      label: 'Our storage share',
      value: num(tracker.storage_fee_percent ?? storagePercentDefault),
      percent: true,
    });
  } else {
    add({ key: 'final_repair_cost', label: 'Final repair cost', value: num(claim?.final_repair_cost), money: true });
  }

  if (!ctx?.creditRepair) {
    add({ key: 'client_vat_status', label: "Customer's VAT status", value: claim?.client_vat_status || '' });
  }

  if (ctx?.vatExcess) {
    const mode = excessMode(claim);
    add({
      key: 'policy_excess',
      label: 'Policy excess',
      value: mode === 'tbc' ? 'TBC' : num(claim?.policy_excess),
      display: mode === 'tbc' ? 'TBC on authority' : mode === 'waived' ? 'Waived' : undefined,
      money: true,
    });
  }

  if (ctx?.hasReferrer) {
    const referrerFee = feeState(claim, 'referrer');
    add({
      key: 'percent_to_referrer',
      label: 'Referrer fee',
      value: num(claim?.percent_to_referrer),
      percent: referrerFee !== 'none',
      display: referrerFee === 'none' ? NO_FEE_DISPLAY : undefined,
    });
    const fixed = num(referrerFixedFee(claim));
    if (fixed > 0) {
      add({ key: 'referrer_fee_gbp', label: 'Referrer fee (fixed)', value: fixed, money: true, note: 'used ahead of the %' });
    }
  }

  if (!ctx?.totalLoss && repairerReferralApplies(claim, ctx)) {
    const repairerFee = feeState(claim, 'repairer_referral');
    add({
      key: 'referral_fee_repairer',
      label: 'Repairer referral fee',
      value: num(claim?.referral_fee_repairer),
      percent: repairerFee !== 'none',
      display: repairerFee === 'none' ? NO_FEE_DISPLAY : undefined,
    });
    const fixed = num(claim?.referral_fee_repairer_gbp);
    if (fixed > 0) {
      add({
        key: 'referral_fee_repairer_gbp',
        label: 'Repairer referral fee (fixed)',
        value: fixed,
        money: true,
        note: 'used ahead of the %',
      });
    }
  }

  if (ctx?.creditRepair) {
    add({ key: 'hire_category', label: 'Hire category', value: claim?.hire_category || '' });
    add({ key: 'hire_fee', label: 'Partner hire fee', value: num(locked.hire_fee), money: true });
    add({ key: 'commission_percent', label: 'Partner commission', value: num(locked.commission_percent), percent: true });
    add({ key: 'commission_basis', label: 'Commission basis', value: locked.commission_basis || '' });
  }

  return rows;
}

/** The figures as they stand, to be kept with the confirmation. */
export const snapshotFromRows = (rows = []) =>
  Object.fromEntries(rows.map((row) => [row.key, row.value]));

const sameValue = (a, b) => a === b
  || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 0.005);

/**
 * An invoice of ours that has already been requested from accounts, sent or paid:
 * the job's invoicing is under way, so its figures are left exactly as they are and
 * the check is not forced on it after the fact. The same rule the accounts request
 * itself is refused by — close-out paperwork we upload and invoices we receive never
 * count, whichever end asks.
 */
const invoicesAlreadyRaised = (summary) =>
  (summary?.rows || []).some(({ item, state }) => canRequestInvoice(item)
    && (state.requested === true || !!state.date || state.paid === true));

/**
 * The check as the claim stands: the figures it covers, the figures that have moved
 * since they were confirmed, who confirmed them — and whether the step is settled.
 * A job whose invoices were already going out before this check existed is kept as
 * it is: nothing was confirmed, and nothing is asked of it.
 */
export function figuresCheckState({ claim, ctx, summary, storagePercentDefault }) {
  const rows = figureRows({ claim, ctx, storagePercentDefault });
  const record = figuresChecked(claim);
  const missing = summary?.missing || [];

  // A figure that was not part of the check when it was confirmed, and is now set,
  // has arrived since — it is just as much a change as one that has moved.
  const changed = record
    ? rows.filter((row) => {
      const had = !!record.snapshot && Object.prototype.hasOwnProperty.call(record.snapshot, row.key);
      if (!had) return row.value !== null && row.value !== '';
      return !sameValue(record.snapshot[row.key], row.value);
    })
    : [];

  return {
    rows,
    record,
    snapshot: snapshotFromRows(rows),
    changed,
    legacy: !record && invoicesAlreadyRaised(summary),
    checkedBy: record?.by || '',
    settled: missing.length === 0 && (!!record ? changed.length === 0 : invoicesAlreadyRaised(summary)),
    canConfirm: missing.length === 0,
  };
}

/** The confirmation itself: who checked the figures, when, and what they were. */
export function buildFiguresCheckedPatch(claim, { by, email, rows }) {
  return buildTrackerMetaPatch(claim, {
    [FIGURES_CHECKED_KEY]: {
      at: new Date().toISOString(),
      by: by || '',
      email: email || '',
      snapshot: snapshotFromRows(rows),
    },
  });
}