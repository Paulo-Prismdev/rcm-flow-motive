/**
 * Sign-in and account events, written to the audit log (ActivityLog) against the
 * user's own record, by the server. Best effort: a failed log never blocks sign-in.
 */
export async function auditUser(
  base44: any,
  target: { id: string; email?: string },
  action: string,
  description: string,
  by?: { email?: string; full_name?: string; display_name?: string } | null,
  extra: { field?: string; old_value?: string; new_value?: string } = {},
) {
  try {
    await base44.asServiceRole.entities.ActivityLog.create({
      parent_id: target.id,
      parent_type: 'User',
      action,
      field_name: extra.field || '',
      old_value: extra.old_value || '',
      new_value: extra.new_value || '',
      description: `${description}${target.email ? ` (${target.email})` : ''}`,
      user_email: by?.email || target.email || '',
      user_name: by?.display_name || by?.full_name || by?.email || target.email || '',
    });
  } catch (_e) {
    // best effort
  }
}
