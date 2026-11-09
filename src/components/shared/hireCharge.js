/**
 * Hire to be invoiced.
 *
 * Some jobs carry hire we arranged for the customer — a courtesy vehicle — which is
 * billed to the insurer at the day rate agreed with them, over the days hired.
 *
 * The hire is sometimes split with the client or the repairer: their share of the
 * charge is invoiced to them, and the insurer is billed the rest. Both shares are
 * ordinary invoices out (hire_invoice_out and hire_split_invoice_out), so they are
 * asked for from accounts, locked at the figure they go out at and marked paid with
 * every other invoice on the job.
 *
 * The set-up lives in the claim's invoicing tracker beside the second-referrer and
 * storage settings, so nothing new has to be stored on the claim itself.
 */

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

/** The share the client or repairer is covering, clamped to the charge itself. */
export function hireSplitNet(claim) {
  const { splitParty, splitAmount } = hireSetup(claim);
  const charge = hireChargeNet(claim);
  if (splitParty === 'None' || !(splitAmount > 0) || charge <= 0) return 0;
  return round2(Math.min(splitAmount, charge));
}

/** The share billed to the insurer: the charge less the split, where there is one. */
export const hireInsurerNet = (claim) =>
  round2(Math.max(0, hireChargeNet(claim) - hireSplitNet(claim)));

/** Whether a split invoice is carried: hire invoiced, split with a party, with a share. */
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