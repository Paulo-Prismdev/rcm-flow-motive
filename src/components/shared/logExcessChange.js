import { logChanges } from '@/components/shared/useActivityLogger';

/** The activity-history labels for the three-way excess choice. */
export const EXCESS_FIELD_LABELS = {
  policy_excess: 'Policy excess',
  excess_tbc: 'Excess on authority (TBC)',
};

/**
 * Records a change between the three excess options on the claim's activity
 * history. Used by the screens that save the claim directly rather than through
 * the claim screen's own update, so ticking TBC, choosing Waived or entering a
 * figure is never silent wherever it is done.
 */
// (The person is stamped server-side; `user` is kept for existing callers.)
// eslint-disable-next-line no-unused-vars
export async function logExcessChange(claim, patch, user) {
  if (!claim?.id) return;
  await logChanges({
    parentId: claim.id,
    parentType: 'Claim',
    oldData: claim,
    newData: patch,
    fieldLabels: EXCESS_FIELD_LABELS,
  });
}