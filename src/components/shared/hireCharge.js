/**
 * Hire to be invoiced.
 *
 * Where the incident is someone else's fault the replacement vehicle is charged to
 * the insurer, at the day rate agreed with them, over the days hired. The vehicle
 * itself may have come from us, the client or the repairer.
 *
 * Where it came from the client or the repairer, a share of the hire is theirs: the
 * insurer still pays us the whole charge (it is covering the cost), and that share is
 * paid out to them. The payout is tracked as an invoice in from them, so it is
 * received and paid like every other invoice we settle.
 *
 * The set-up lives in the claim's invoicing tracker beside the second-referrer and
 * storage settings, so nothing new has to be stored on the claim itself.
 */

import { fmtGBP } from './creditRepairRates';

export const HIRE_TRACKER_KEY = 'hire';

/** Who the hire charge may be split with, besides the insurer. */
export const HIRE_SPLIT_PARTIES = ['None', 'Client', 'Repairer'];

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const num = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** The hire set-up on this claim, or what it is until it is set. */
export function hireSetup(claim) {
  const stored = claim?.invoice_tracker?.[HIRE_TRACKER_KEY] || {};
  return {
    invoiced: stored.invoiced === true,
    dayRate: num(stored.day_rate),
    days: num(stored.days),
    splitParty: HIRE_SPLIT_PARTIES.includes(stored.split_party) ? stored.split_party : 'None',
    splitAmount: num(stored.split_amount),
  };
}

/** Whether this job has hire to invoice at all. */
export const hireFlagged = (claim) => hireSetup(claim).invoiced;

/** The whole hire charge, ex VAT: the day rate over the days hired. */
export function hireChargeNet(claim) {
  const { dayRate, days } = hireSetup(claim);
  if (!(dayRate > 0) || !(days > 0)) return 0;
  return round2(dayRate * days);
}

/** The share of the hire paid out to the client or repairer, clamped to the charge. */
export function hireSplitNet(claim) {
  const { splitParty, splitAmount } = hireSetup(claim);
  const charge = hireChargeNet(claim);
  if (splitParty === 'None' || !(splitAmount > 0) || charge <= 0) return 0;
  return round2(Math.min(splitAmount, charge));
}

/** Whether a share is paid out: hire invoiced, split with a party, with a share set. */
export const hireSplitApplies = (claim) =>
  hireFlagged(claim) && hireSetup(claim).splitParty !== 'None' && hireSplitNet(claim) > 0;

/** Who the hire is split with, named as the claim holds them. */
export function hireSplitPartyName(claim) {
  const { splitParty } = hireSetup(claim);
  if (splitParty === 'Repairer') return claim?.bodyshop || '';
  if (splitParty === 'Client') return claim?.client_name || '';
  return '';
}

/**
 * The hire switch as the claim's own forms hold it ('Yes' / 'No'). A form keeps the
 * answer under hire_invoiced while it is open; once saved it lives in the tracker.
 */
export const hireInvoicedSwitch = (holder) => {
  if (holder?.hire_invoiced === 'Yes' || holder?.hire_invoiced === 'No') return holder.hire_invoiced;
  return hireSetup(holder).invoiced ? 'Yes' : 'No';
};

/**
 * The patch recording the switch being set from the claim's own details — the same
 * setting Financials shows. Nothing is written while the switch stays off on a claim
 * that has never carried hire, so claims that don't use hire are left untouched.
 */
export function hireInvoicedPatch(claim, value) {
  const base = claim?.invoice_tracker || {};
  if (value !== 'Yes' && !base[HIRE_TRACKER_KEY]) return null;
  return buildHirePatch(claim, { hire_invoiced: value });
}

/** The claim with its hire switch set as a form currently holds it, unsaved. */
export const withHireSwitch = (holder, value) => ({
  ...holder,
  invoice_tracker: {
    ...(holder?.invoice_tracker || {}),
    [HIRE_TRACKER_KEY]: {
      ...((holder?.invoice_tracker || {})[HIRE_TRACKER_KEY] || {}),
      invoiced: value === 'Yes',
    },
  },
});

/** The hire on the claim in one line, for the claim's own details. */
export function hireSummaryText(claim) {
  const setup = hireSetup(claim);
  if (!setup.invoiced) return 'No';
  const charge = hireChargeNet(claim);
  if (charge > 0) {
    return `Yes — ${fmtGBP(setup.dayRate)} × ${setup.days} day${setup.days === 1 ? '' : 's'} (${fmtGBP(charge)} ex VAT)`;
  }
  if (setup.dayRate > 0 || setup.days > 0) return 'Yes — rate or days still to set';
  return 'Yes — day rate and days to set';
}

/**
 * The patch recording one change to the hire set-up. The rows come from the figure
 * group as typed text ('Yes'/'No' for the switch), so each is read into the shape
 * the tracker holds. With no split party there is no share to record.
 */
export function buildHirePatch(claim, changes) {
  const tracker = claim?.invoice_tracker || {};
  const stored = tracker[HIRE_TRACKER_KEY] || {};
  const next = {
    invoiced: stored.invoiced === true,
    day_rate: num(stored.day_rate),
    days: num(stored.days),
    split_party: HIRE_SPLIT_PARTIES.includes(stored.split_party) ? stored.split_party : 'None',
    split_amount: num(stored.split_amount),
  };

  const has = (key) => changes[key] !== undefined;
  if (has('hire_invoiced')) next.invoiced = changes.hire_invoiced === 'Yes';
  if (has('hire_day_rate')) next.day_rate = num(changes.hire_day_rate);
  if (has('hire_days')) next.days = num(changes.hire_days);
  if (has('hire_split_party')) next.split_party = changes.hire_split_party || 'None';
  if (has('hire_split_amount')) next.split_amount = num(changes.hire_split_amount);
  if (next.split_party === 'None') next.split_amount = null;

  return { invoice_tracker: { ...tracker, [HIRE_TRACKER_KEY]: next } };
}