import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { PASSWORD_MAX_AGE_DAYS, expiryInfo, passwordProblem } from '../../shared/passwordPolicy.ts';
import { auditUser } from '../../shared/userAudit.ts';

/**
 * The 90-day password change (the same approach as Agile v2).
 *
 *   noteLogin  after an email-and-password sign-in (or right after a reset): marks the
 *              account as a password account and starts the clock. (Sign-in is by email
 *              and password only; an account counts once it has signed in that way.)
 *   status     is the password expired, or due within 7 days?
 *   change     checks the new password, changes it on the platform, restarts the clock.
 *
 * Base44 has no password-age rule of its own to hook into, so the app enforces it: an
 * expired password stops at a "choose a new password" screen until it is changed.
 */
async function loadUser(base44: any) {
  const me = await base44.auth.me().catch(() => null);
  if (!me) return null;
  return (await base44.asServiceRole.entities.User.get(me.id).catch(() => null)) || me;
}

async function statusFor(base44: any, user: any) {
  if (!user.password_user) return { applies: false, max_age_days: PASSWORD_MAX_AGE_DAYS };
  let changedAt = user.password_changed_at;
  if (!changedAt) {
    changedAt = new Date().toISOString();
    await base44.asServiceRole.entities.User.update(user.id, { password_changed_at: changedAt });
  }
  return { applies: true, max_age_days: PASSWORD_MAX_AGE_DAYS, ...expiryInfo(changedAt)! };
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const user = await loadUser(base44);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (body.action === 'noteLogin') {
      const patch: Record<string, unknown> = {};
      if (!user.password_user) patch.password_user = true;
      // A reset by email means the password was just set; otherwise only start a clock that hasn't started.
      if (body.reset === true || !user.password_changed_at) patch.password_changed_at = new Date().toISOString();
      if (Object.keys(patch).length) await base44.asServiceRole.entities.User.update(user.id, patch);
      if (body.reset === true) await auditUser(base44, user, 'Password Changed', 'Password reset by email');
      return Response.json({ ok: true });
    }

    if (body.action === 'status') return Response.json(await statusFor(base44, user));

    if (body.action === 'change') {
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');
      if (!currentPassword) return Response.json({ error: 'Enter your current password.', field: 'currentPassword' }, { status: 400 });
      const problem = passwordProblem(newPassword, currentPassword, user.email);
      if (problem) return Response.json({ error: problem, field: 'newPassword' }, { status: 400 });

      try {
        await base44.auth.changePassword({ userId: user.id, currentPassword, newPassword });
      } catch (e: any) {
        const status = e?.response?.status ?? e?.status ?? 400;
        const wrongCurrent = status === 400 || status === 401 || status === 403;
        return Response.json({
          error: wrongCurrent ? 'Your current password is not right.' : 'We could not change your password just now. Please try again.',
          field: wrongCurrent ? 'currentPassword' : undefined,
        }, { status: wrongCurrent ? 400 : 502 });
      }
      const now = new Date().toISOString();
      await base44.asServiceRole.entities.User.update(user.id, { password_changed_at: now, password_user: true });
      await auditUser(base44, user, 'Password Changed', 'Password changed');
      return Response.json({ ok: true, ...(await statusFor(base44, { ...user, password_user: true, password_changed_at: now })) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('passwordManage error:', error?.message);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
