import { base44 } from '@/api/base44Client';

// Helper to log activity
export async function logActivity({ parentId, parentType, action, fieldName, oldValue, newValue, description, user }) {
  try {
    // Use service role so activity logging always succeeds regardless of user RLS.
    // The user identity (email/name) is captured explicitly in the record fields.
    await base44.asServiceRole.entities.ActivityLog.create({
      parent_id: parentId,
      parent_type: parentType,
      action,
      field_name: fieldName || '',
      old_value: oldValue !== undefined ? String(oldValue) : '',
      new_value: newValue !== undefined ? String(newValue) : '',
      description,
      user_email: user?.email || '',
      user_name: user?.full_name || '',
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// Helper to detect changes between two objects and log them
export async function logChanges({ parentId, parentType, oldData, newData, user, fieldLabels = {} }) {
  const changes = [];
  
  for (const key of Object.keys(newData)) {
    const oldVal = oldData[key];
    const newVal = newData[key];
    
    // Skip if values are the same
    if (oldVal === newVal) continue;
    if (oldVal == null && newVal == null) continue;
    if (oldVal === '' && newVal == null) continue;
    if (oldVal == null && newVal === '') continue;
    
    // Skip internal fields
    if (['id', 'created_date', 'updated_date', 'created_by'].includes(key)) continue;
    
    const label = fieldLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    changes.push({
      field: key,
      label,
      oldValue: oldVal,
      newValue: newVal,
    });
  }
  
  if (changes.length === 0) return;
  
  // Log individual field changes
  for (const change of changes) {
    await logActivity({
      parentId,
      parentType,
      action: 'Field Updated',
      fieldName: change.label,
      oldValue: change.oldValue,
      newValue: change.newValue,
      description: `Changed ${change.label}`,
      user,
    });
  }
}