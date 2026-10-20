/**
 * The steps of the invoicing flow a job has been taken past while their invoices
 * were not to hand. Kept on the claim itself, in the internal invoicing tracker,
 * so the choice survives the claim being closed and opened again: the invoices
 * stay outstanding, the step stays amber with what it is waiting on, and the
 * step does not jump back to being the job's next work.
 *
 * Nothing here changes an invoice: this only remembers that the work moved on.
 */
export const STEP_MOVED_PAST_KEY = 'steps_moved_past';

/** The steps moved past on this claim, keyed by step. */
export function readStepsMovedPast(claim) {
  const skips = claim?.invoice_tracker?.[STEP_MOVED_PAST_KEY];
  return skips && typeof skips === 'object' ? skips : {};
}

export function isStepMovedPast(claim, stepKey) {
  return !!readStepsMovedPast(claim)[stepKey];
}

/** Records that the job has moved past a step, and what that step was waiting on. */
export function buildStepMovedPastPatch(claim, stepKey, { outstanding = [], by = '' } = {}) {
  const source = claim?.invoice_tracker || {};
  const skips = { ...readStepsMovedPast(claim) };
  skips[stepKey] = {
    at: new Date().toISOString(),
    by: by || '',
    outstanding,
  };
  return { invoice_tracker: { ...source, [STEP_MOVED_PAST_KEY]: skips } };
}

/** Puts a step back as the job's own next work, clearing the reminder with it. */
export function buildStepReopenPatch(claim, stepKey) {
  const source = claim?.invoice_tracker || {};
  const skips = { ...readStepsMovedPast(claim) };
  delete skips[stepKey];
  return { invoice_tracker: { ...source, [STEP_MOVED_PAST_KEY]: skips } };
}