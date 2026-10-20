import { base44 } from '@/api/base44Client';
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
export async function logExcessChange(claim, patch, user) {
  if (!claim?.id) return;
  const actor = user || await base44.auth.me();
  await logChanges({
    parentId: claim.id,
    parentType: 'Claim',
    oldData: claim,
    newData: patch,
    user: actor,
    fieldLabels: EXCESS_FIELD_LABELS,
  });
}