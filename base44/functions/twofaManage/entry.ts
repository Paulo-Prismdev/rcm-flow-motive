import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { buildBrandedHtml, deliverEmail } from '../../shared/brandedEmail.ts';
import { auditUser } from '../../shared/userAudit.ts';

/**
 * Two-step sign-in by emailed code (the same approach as Agile v2).
 *
 *   login     after a fresh sign-in: clears the verified state and emails the first code
 *   status    is a second step needed, and is this sign-in verified?
 *   initiate  / resend: email a new code (30-second wait, 5 wrong tries locks for 15 minutes)
 *   verify    check a code; on success the sign-in is verified
 *   ping      activity heartbeat (keeps the 30-minute inactivity window open)
 *   clear     at sign-out
 *   reset     staff admins: clear someone's second step and lockout
 *
 * Face ID / fingerprint (passkeyManage) is the other way through the same second step.
 *   cleanup   scheduled: lapse sessions that are over 12 hours old or 30 minutes idle
 *
 * Who needs it: all RCM staff (user type internal). Portal users don't, for now.
 * The verified flag lives on the user record, can only be set here (service role), and
 * the staff access rules check it, so a password alone never opens staff data.
 */
const CODE_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 30;
const SESSION_TIMEOUT_HOURS = 12;
const INACTIVITY_TIMEOUT_MINUTES = 30;

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Six digits from the secure generator, without the bias a plain modulo would add.
function generateCode() {
  let out = '';
  while (out.length < 6) {
    const buf = new Uint8Array(1);
    crypto.getRandomValues(buf);
    if (buf[0] < 250) out += String(buf[0] % 10);
  }
  return out;
}

const nowIso = () => new Date().toISOString();
const minutesFromNow = (min: number) => new Date(Date.now() + min * 60000).toISOString();
const isExpired = (iso?: string | null) => !iso || Date.parse(iso) < Date.now();
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });

const isRequired = (user: any) => user?.user_type === 'internal';

/** Whether the user has any Face ID / fingerprint device set up (see passkeyManage). */
async function hasPasskeys(base44: any, userId: string) {
  const raw = await base44.asServiceRole.entities.PasskeyCredential.filter({ user_id: userId }).catch(() => []);
  const list = Array.isArray(raw) ? raw : (raw?.items || []);
  return list.length > 0;
}

async function loadUser(base44: any) {
  const me = await base44.auth.me().catch(() => null);
  if (!me) return null;
  return (await base44.asServiceRole.entities.User.get(me.id).catch(() => null)) || me;
}

async function checkAndClearExpired(base44: any, user: any) {
  if (!user.twofa_verified) return false;
  const verifiedAt = user.twofa_verified_at;
  const lastActivity = user.twofa_last_activity_at;
  const sessionExpired = !verifiedAt || Date.parse(verifiedAt) + SESSION_TIMEOUT_HOURS * 3600000 < Date.now();
  const inactiveExpired = !lastActivity || Date.parse(lastActivity) + INACTIVITY_TIMEOUT_MINUTES * 60000 < Date.now();
  if (sessionExpired || inactiveExpired) {
    await base44.asServiceRole.entities.User.update(user.id, {
      twofa_verified: false, twofa_verified_at: null, twofa_last_activity_at: null,
    });
    return true;
  }
  return false;
}

async function checkUserLockout(base44: any, user: any) {
  const lockedUntil = user.twofa_locked_until;
  if (lockedUntil && !isExpired(lockedUntil)) return { locked: true, lockedUntil, justExpired: false };
  if (lockedUntil && isExpired(lockedUntil)) {
    await base44.asServiceRole.entities.User.update(user.id, { twofa_attempt_count: 0, twofa_locked_until: null });
    return { locked: false, lockedUntil: null, justExpired: true };
  }
  return { locked: false, lockedUntil: null, justExpired: false };
}

async function openCodes(base44: any, userId: string) {
  const codes = await base44.asServiceRole.entities.TwoFactorCode.filter({ user_id: userId, consumed_at: null }).catch(() => []);
  return Array.isArray(codes) ? codes : (codes?.items || []);
}

async function hasActiveCode(base44: any, userId: string) {
  return (await openCodes(base44, userId)).some((c: any) => !isExpired(c.expires_at));
}

async function createAndSendCode(base44: any, user: any) {
  const code = generateCode();
  const expiresAt = minutesFromNow(CODE_EXPIRY_MINUTES);
  await base44.asServiceRole.entities.TwoFactorCode.create({
    user_id: user.id,
    code_hash: await sha256(code),
    channel: 'email',
    expires_at: expiresAt,
    last_sent_at: nowIso(),
  });

  const name = user.display_name || user.full_name || user.email;
  const content = `<p>Hi ${String(name).replace(/[<>&"]/g, '')},</p>
<p>Use this code to finish signing in to RCM Flowmotive. It expires in ${CODE_EXPIRY_MINUTES} minutes and works once.</p>
<p style="text-align:center;margin:24px 0;"><span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:8px;padding:16px 24px;background:#f4f4f5;border-radius:8px;font-family:ui-monospace,Menlo,Monaco,monospace;">${code}</span></p>
<p style="color:#65758b;font-size:13px;">If you didn't try to sign in, you can ignore this email, but please tell us, as someone may know your password. Never share this code with anyone.</p>`;
  const sent = await deliverEmail({
    base44,
    to: user.email,
    subject: `Your RCM Flowmotive sign-in code: ${code}`,
    html: buildBrandedHtml(content),
    text: `Your RCM Flowmotive sign-in code is ${code}. It expires in ${CODE_EXPIRY_MINUTES} minutes and works once. If you didn't try to sign in, ignore this email and tell us.`,
    fromName: 'RCM Automotive',
  });
  if (!sent.ok) return { error: `We could not email your code just now. ${sent.error || ''}`.trim() };
  return { sent: true, expires_at: expiresAt };
}

// Only one code is sent at a time: a short lock on the user, which lapses after 10
// seconds. (The earlier conditional bulk update never took the lock on this platform, so
// every "Send a new code" was refused; this reads, sets and re-reads instead. Two taps in
// the same instant could both get through, which at worst sends two codes.)
async function acquireInitiateLock(base44: any, userId: string) {
  const current = await base44.asServiceRole.entities.User.get(userId).catch(() => null);
  if (!current) return null;
  const heldAt = current.twofa_initiate_lock_at ? Date.parse(current.twofa_initiate_lock_at) : 0;
  if (current.twofa_initiate_lock && Date.now() - heldAt < 10000) return null;
  const token = crypto.randomUUID();
  await base44.asServiceRole.entities.User.update(userId, { twofa_initiate_lock: token, twofa_initiate_lock_at: nowIso() }).catch(() => {});
  const locked = await base44.asServiceRole.entities.User.get(userId).catch(() => null);
  return locked?.twofa_initiate_lock === token ? token : null;
}

const releaseInitiateLock = (base44: any, userId: string) =>
  base44.asServiceRole.entities.User.update(userId, { twofa_initiate_lock: null, twofa_initiate_lock_at: null }).catch(() => {});

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action } = body || {};

    // Scheduled maintenance: no sign-in needed, and all it can do is lapse old sessions.
    if (action === 'cleanup') {
      const raw = await base44.asServiceRole.entities.User.filter({ twofa_verified: true }).catch(() => []);
      const users = Array.isArray(raw) ? raw : (raw?.items || []);
      let cleared = 0;
      for (const u of users) {
        if (await checkAndClearExpired(base44, u)) cleared++;
      }
      await base44.asServiceRole.entities.TwoFactorCode.deleteMany({
        expires_at: { $lt: new Date(Date.now() - 3600000).toISOString() },
      }).catch(() => {});
      return Response.json({ cleared, checked: users.length });
    }

    const user = await loadUser(base44);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (action === 'login') {
      // A fresh sign-in always needs the second step again. Attempts, lockouts and
      // the resend wait carry over, so signing in again never buys extra guesses.
      await base44.asServiceRole.entities.User.update(user.id, {
        twofa_login_at: nowIso(), twofa_verified: false, twofa_verified_at: null, twofa_last_activity_at: null,
      });
      await auditUser(base44, user, 'Signed In', 'Signed in');
      // Someone with Face ID / fingerprint set up isn't emailed a code automatically:
      // the screen offers Face ID first, and a code is one tap away if they need it.
      if (isRequired(user) && !(await hasPasskeys(base44, user.id)) && !(await hasActiveCode(base44, user.id))) {
        const lockout = await checkUserLockout(base44, user);
        if (!lockout.locked) await createAndSendCode(base44, user);
      }
      return Response.json({ ok: true });
    }

    if (action === 'status') {
      const required = isRequired(user);
      const cleared = await checkAndClearExpired(base44, user);
      let verified = cleared ? false : !!user.twofa_verified;
      if (verified && user.twofa_login_at && user.twofa_verified_at
        && Date.parse(user.twofa_login_at) > Date.parse(user.twofa_verified_at)) {
        await base44.asServiceRole.entities.User.update(user.id, {
          twofa_verified: false, twofa_verified_at: null, twofa_last_activity_at: null,
        });
        verified = false;
      }
      const lockout = await checkUserLockout(base44, user);
      const attempts = lockout.justExpired ? 0 : (user.twofa_attempt_count || 0);
      return Response.json({
        required,
        verified,
        locked_until: lockout.locked ? lockout.lockedUntil : null,
        attempts_remaining: lockout.locked ? 0 : Math.max(0, MAX_ATTEMPTS - attempts),
        code_active: required && !verified ? await hasActiveCode(base44, user.id) : false,
        has_passkeys: required ? await hasPasskeys(base44, user.id) : false,
      });
    }

    if (action === 'initiate' || action === 'resend') {
      if (!isRequired(user)) return Response.json({ sent: false, not_required: true });
      const cleared = await checkAndClearExpired(base44, user);
      if (!cleared && user.twofa_verified) return Response.json({ sent: false, already_verified: true });

      const lockout = await checkUserLockout(base44, user);
      if (lockout.locked) {
        return Response.json({
          error: `Too many wrong codes. Try again after ${timeOf(lockout.lockedUntil)}.`,
          locked_until: lockout.lockedUntil, locked: true,
        }, { status: 423 });
      }

      const latest = (await openCodes(base44, user.id))
        .filter((c: any) => c.last_sent_at)
        .sort((a: any, b: any) => Date.parse(b.last_sent_at) - Date.parse(a.last_sent_at))[0];
      if (latest) {
        const elapsed = (Date.now() - Date.parse(latest.last_sent_at)) / 1000;
        if (elapsed < RESEND_COOLDOWN_SECONDS) {
          const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
          return Response.json({ error: `Please wait ${wait} seconds before asking for a new code.`, cooldown_remaining: wait }, { status: 429 });
        }
      }

      const lock = await acquireInitiateLock(base44, user.id);
      if (!lock) return Response.json({ error: 'A code is already being sent. Please wait a moment.', cooldown_remaining: 5 }, { status: 429 });
      try {
        const result = await createAndSendCode(base44, user);
        if (result.error) return Response.json({ error: result.error }, { status: 502 });
        return Response.json({ sent: true, expires_at: result.expires_at });
      } finally {
        await releaseInitiateLock(base44, user.id);
      }
    }

    if (action === 'verify') {
      const code = typeof body.code === 'string' ? body.code.trim() : '';
      if (!/^\d{6}$/.test(code)) return Response.json({ error: 'Enter the 6-digit code.' }, { status: 400 });

      const lockout = await checkUserLockout(base44, user);
      if (lockout.locked) {
        return Response.json({
          error: `Too many wrong codes. Try again after ${timeOf(lockout.lockedUntil)}.`,
          locked_until: lockout.lockedUntil, locked: true,
        }, { status: 423 });
      }

      const active = (await openCodes(base44, user.id))
        .filter((c: any) => !isExpired(c.expires_at))
        .sort((a: any, b: any) => Date.parse(b.created_date || b.expires_at) - Date.parse(a.created_date || a.expires_at))[0];
      if (!active) return Response.json({ error: 'That code has expired. Ask for a new one.', no_code: true }, { status: 400 });

      const submitted = await sha256(code);
      if (submitted !== active.code_hash) {
        // A code from an earlier email gets a clearer message than "wrong".
        const recentRaw = await base44.asServiceRole.entities.TwoFactorCode.filter({
          user_id: user.id, created_date: { $gte: new Date(Date.now() - 10 * 60000).toISOString() },
        }).catch(() => []);
        const recent = Array.isArray(recentRaw) ? recentRaw : (recentRaw?.items || []);
        const older = recent.find((c: any) => c.id !== active.id && c.code_hash === submitted);
        if (older) {
          return Response.json({
            error: older.consumed_at
              ? 'That code has already been used. Use the latest code from your email.'
              : 'A newer code was sent. Use the latest code from your email.',
            superseded: true,
          }, { status: 400 });
        }

        const before = lockout.justExpired ? 0 : (user.twofa_attempt_count || 0);
        const attempts = before + 1;
        const lockUntil = attempts >= MAX_ATTEMPTS ? minutesFromNow(LOCKOUT_MINUTES) : null;
        await base44.asServiceRole.entities.User.update(user.id, {
          twofa_attempt_count: attempts, ...(lockUntil ? { twofa_locked_until: lockUntil } : {}),
        });
        await auditUser(base44, user, 'Sign-in Code Wrong', `Wrong sign-in code (${attempts} of ${MAX_ATTEMPTS})`);
        if (lockUntil) {
          await auditUser(base44, user, 'Sign-in Locked', `Sign-in locked for ${LOCKOUT_MINUTES} minutes after ${MAX_ATTEMPTS} wrong codes`);
          return Response.json({ error: `Too many wrong codes. Locked for ${LOCKOUT_MINUTES} minutes.`, locked_until: lockUntil, locked: true }, { status: 423 });
        }
        return Response.json({
          error: `That code isn't right. ${MAX_ATTEMPTS - attempts} ${MAX_ATTEMPTS - attempts === 1 ? 'try' : 'tries'} left.`,
          attempts_remaining: MAX_ATTEMPTS - attempts,
        }, { status: 400 });
      }

      await base44.asServiceRole.entities.TwoFactorCode.update(active.id, { consumed_at: nowIso() });
      const now = nowIso();
      await base44.asServiceRole.entities.User.update(user.id, {
        twofa_verified: true, twofa_verified_at: now, twofa_last_activity_at: now,
        twofa_attempt_count: 0, twofa_locked_until: null,
      });
      await auditUser(base44, user, 'Sign-in Verified', 'Completed the emailed-code sign-in step');
      return Response.json({ verified: true, verified_at: now });
    }

    if (action === 'ping') {
      if (!user.twofa_verified) return Response.json({ ok: false, not_verified: true });
      // A late ping never revives a lapsed session.
      if (await checkAndClearExpired(base44, user)) return Response.json({ ok: false, not_verified: true });
      await base44.asServiceRole.entities.User.update(user.id, { twofa_last_activity_at: nowIso() });
      return Response.json({ ok: true });
    }

    if (action === 'clear') {
      await base44.asServiceRole.entities.User.update(user.id, {
        twofa_verified: false, twofa_verified_at: null, twofa_last_activity_at: null,
      });
      await auditUser(base44, user, 'Signed Out', body.reason === 'inactivity' ? 'Signed out after 30 minutes without activity' : 'Signed out');
      return Response.json({ ok: true });
    }

    if (action === 'reset') {
      const isStaffAdmin = user.user_type === 'internal' && ['super_admin', 'admin'].includes(user.role);
      if (!isStaffAdmin) return Response.json({ error: 'Only RCM admins can reset a sign-in step.' }, { status: 403 });
      const targetId = typeof body.target_user_id === 'string' ? body.target_user_id : '';
      const target = targetId ? await base44.asServiceRole.entities.User.get(targetId).catch(() => null) : null;
      if (!target) return Response.json({ error: 'User not found' }, { status: 404 });
      await base44.asServiceRole.entities.User.update(target.id, {
        twofa_verified: false, twofa_verified_at: null, twofa_last_activity_at: null,
        twofa_attempt_count: 0, twofa_locked_until: null,
      });
      await base44.asServiceRole.entities.TwoFactorCode.deleteMany({ user_id: target.id, consumed_at: null }).catch(() => {});
      await auditUser(base44, target, 'Sign-in Reset', 'Sign-in step and lockout reset by an admin', user);
      return Response.json({ ok: true, reset_user: target.email });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('twofaManage error:', error?.message);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
