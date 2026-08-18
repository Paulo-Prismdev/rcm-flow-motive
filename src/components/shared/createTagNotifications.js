import { base44 } from '@/api/base44Client';

/**
 * Creates an in-app Notification record for each tagged user after a ClaimUpdate
 * is created. Resolves user IDs to emails via the allUsers list.
 *
 * @param {Object} params
 * @param {string[]} params.taggedUserIds - Array of user IDs tagged in the update
 * @param {Array} params.allUsers - Full user list (to resolve IDs to emails)
 * @param {Object} params.claim - The claim object (for context in the message)
 * @param {string} params.claimId - The claim ID
 * @param {string} params.updateType - The update type label
 * @param {string} params.description - The update description
 * @param {string} params.createdByName - Display name of the user who created the update
 * @param {string} params.createdByEmail - Email of the user who created the update (to skip self)
 * @returns {Promise<void>}
 */
export async function createTagNotifications({
  taggedUserIds,
  allUsers,
  claim,
  claimId,
  updateType,
  description,
  createdByName,
  createdByEmail,
}) {
  if (!taggedUserIds || taggedUserIds.length === 0 || !allUsers || allUsers.length === 0) return;

  const taggedEmails = allUsers
    .filter(u => taggedUserIds.includes(u.id) && u.email && u.email !== createdByEmail)
    .map(u => u.email);

  if (taggedEmails.length === 0) return;

  const regPart = claim?.reg ? ` [${claim.reg}]` : '';
  const preview = (description || '').slice(0, 120);

  await Promise.all(
    taggedEmails.map(email =>
      base44.entities.Notification.create({
        user_email: email,
        title: `${createdByName || 'Someone'} tagged you in a claim update${regPart}`,
        message: `${updateType}: ${preview}${description && description.length > 120 ? '...' : ''}`,
        type: 'tagged',
        related_item_type: 'Claim',
        related_item_id: claimId,
        link: `/claims?id=${claimId}`,
        is_read: false,
      }).catch(() => {})
    )
  );
}