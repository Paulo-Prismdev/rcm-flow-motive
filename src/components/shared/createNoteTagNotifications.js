import { base44 } from '@/api/base44Client';

/**
 * Creates an in-app Notification record for each tagged user after an internal
 * Note (internal update) is created. Works across all parent types.
 *
 * @param {Object} params
 * @param {string[]} params.taggedEmails - Array of user emails tagged in the note
 * @param {string} params.parentType - "Claim" | "Estimate" | "Engineering" | "Part"
 * @param {string} params.parentId - ID of the parent record
 * @param {string} params.updateType - The update type label
 * @param {string} params.description - The note content
 * @param {string} params.createdByName - Display name of the creator
 * @param {string} params.createdByEmail - Email of the creator (to skip self)
 * @returns {Promise<void>}
 */
export async function createNoteTagNotifications({
  taggedEmails,
  parentType,
  parentId,
  updateType,
  description,
  createdByName,
  createdByEmail,
}) {
  if (!taggedEmails || taggedEmails.length === 0) return;

  const linkMap = {
    Claim: `/Claims?id=${parentId}`,
    Estimate: '/Estimating',
    Engineering: '/Engineering',
    Part: '/Parts',
  };
  const link = linkMap[parentType] || '';
  const preview = (description || '').slice(0, 120);

  await Promise.all(
    taggedEmails
      .filter((email) => email && email !== createdByEmail)
      .map((email) =>
        base44.entities.Notification.create({
          user_email: email,
          title: `${createdByName || 'Someone'} tagged you in an internal update`,
          message: `${updateType || 'Internal'}: ${preview}${
            description && description.length > 120 ? '...' : ''
          }`,
          type: 'tagged',
          related_item_type: parentType,
          related_item_id: parentId,
          link,
          is_read: false,
        }).catch(() => {})
      )
  );
}