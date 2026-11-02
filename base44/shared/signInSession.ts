/**
 * The second sign-in step, shared by the emailed code (twofaManage) and Face ID /
 * fingerprint (passkeyManage), so both mark a sign-in verified in exactly the same way.
 */
export const MAX_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

export const nowIso = () => new Date().toISOString();
export const minutesFromNow = (min: number) => new Date(Date.now() + min * 60000).toISOString();
export const isExpired = (iso?: string | null) => !iso || Date.parse(iso) < Date.now();

/** Marks this sign-in as having passed the second step, and clears wrong attempts. */
export async function markVerified(base44: any, userId: string) {
  const now = nowIso();
  await base44.asServiceRole.entities.User.update(userId, {
    twofa_verified: true, twofa_verified_at: now, twofa_last_activity_at: now,
    twofa_attempt_count: 0, twofa_locked_until: null,
  });
  return now;
}

/** Whether the user is locked out after too many failed attempts (and tidies an ended lockout). */
export async function lockoutState(base44: any, user: any) {
  const lockedUntil = user.twofa_locked_until;
  if (lockedUntil && !isExpired(lockedUntil)) return { locked: true, lockedUntil, justExpired: false };
  if (lockedUntil && isExpired(lockedUntil)) {
    await base44.asServiceRole.entities.User.update(user.id, { twofa_attempt_count: 0, twofa_locked_until: null });
    return { locked: false, lockedUntil: null, justExpired: true };
  }
  return { locked: false, lockedUntil: null, justExpired: false };
}

/** Counts a failed second step; returns the lockout time when it reaches the limit. */
export async function recordFailure(base44: any, user: any, justExpired = false) {
  const attempts = (justExpired ? 0 : (user.twofa_attempt_count || 0)) + 1;
  const lockUntil = attempts >= MAX_ATTEMPTS ? minutesFromNow(LOCKOUT_MINUTES) : null;
  await base44.asServiceRole.entities.User.update(user.id, {
    twofa_attempt_count: attempts, ...(lockUntil ? { twofa_locked_until: lockUntil } : {}),
  });
  return { attempts, lockUntil, remaining: Math.max(0, MAX_ATTEMPTS - attempts) };
}
