import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Writes audit log lines for changes staff make in the app. The person is taken from
 * the signed-in session, never from what the browser sends, and the audit log itself
 * can only be written here (and by other server functions): it can't be edited or
 * deleted by anyone, staff included.
 *
 *   { entries: [{ parent_id, parent_type, action, field_name?, old_value?, new_value?, description }] }
 */
const PARENT_TYPES = new Set([
  'Claim', 'Estimate', 'Engineering', 'Part', 'User', 'System',
  'Client', 'Bodyshop', 'Insurer', 'Broker', 'Supplier', 'CreditRepairCompany', 'Referrer', 'Company', 'Task', 'Settings',
]);
// Values that must never sit in the log in full.
const SECRET_FIELD = /(_token$|signature|password|secret|^webauthn_|^twofa_)/i;
const MAX_ENTRIES = 60;

const clip = (v: unknown, max: number) => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > max ? `${s.slice(0, max)}…` : s;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me().catch(() => null);
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (me.user_type !== 'internal') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const entries = Array.isArray(body?.entries) ? body.entries.slice(0, MAX_ENTRIES) : [];
    let written = 0;
    for (const e of entries) {
      if (!e || typeof e.parent_id !== 'string' || !e.parent_id || !PARENT_TYPES.has(e.parent_type)) continue;
      const secret = SECRET_FIELD.test(String(e.field_name || ''));
      await base44.asServiceRole.entities.ActivityLog.create({
        parent_id: clip(e.parent_id, 100),
        parent_type: e.parent_type,
        action: clip(e.action || 'Updated', 60),
        field_name: clip(e.field_name, 100),
        old_value: secret ? (e.old_value ? '(hidden)' : '') : clip(e.old_value, 500),
        new_value: secret ? (e.new_value ? '(hidden)' : '') : clip(e.new_value, 500),
        description: clip(e.description, 500),
        user_email: me.email || '',
        user_name: me.display_name || me.full_name || me.email || '',
      }).then(() => { written++; }).catch((err: any) => console.warn('recordActivity: write failed', err?.message));
    }
    return Response.json({ ok: true, written });
  } catch (error: any) {
    console.error('recordActivity error:', error?.message);
    return Response.json({ error: 'Could not record the activity' }, { status: 500 });
  }
});
