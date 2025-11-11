import { base44 } from '@/api/base44Client';

/**
 * Centralized activity logging utility
 * Automatically logs user actions in the background
 */
export const logActivity = async ({
  action_type,
  entity_type,
  entity_id = null,
  entity_reference = null,
  description = '',
  changes = null,
}) => {
  try {
    // Get current user
    const user = await base44.auth.me();
    
    if (!user) {
      console.warn('Cannot log activity: no user session');
      return;
    }

    // Get browser info
    const userAgent = navigator.userAgent;
    const pageUrl = window.location.href;

    // Prepare log entry
    const logEntry = {
      user_email: user.email,
      user_name: user.full_name || user.email,
      action_type,
      entity_type,
      entity_id,
      entity_reference,
      description,
      changes,
      user_agent: userAgent,
      page_url: pageUrl,
    };

    // Log asynchronously in background (don't block UI)
    base44.entities.ActivityLog.create(logEntry).catch(error => {
      console.error('Failed to log activity:', error);
    });

  } catch (error) {
    // Silently fail - don't disrupt user experience
    console.error('Activity logging error:', error);
  }
};

/**
 * Helper to generate a description of changes
 */
export const generateChangeDescription = (oldData, newData, entityType) => {
  const changedFields = [];
  const changes = {};

  Object.keys(newData).forEach(key => {
    if (oldData[key] !== newData[key]) {
      changedFields.push(key);
      changes[key] = {
        old: oldData[key],
        new: newData[key]
      };
    }
  });

  if (changedFields.length === 0) {
    return { description: 'No changes', changes: {} };
  }

  const description = `Updated ${changedFields.length} field(s): ${changedFields.join(', ')}`;
  return { description, changes };
};

export default { logActivity, generateChangeDescription };