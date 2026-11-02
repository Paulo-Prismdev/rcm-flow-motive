// One place for the password rules (the same rules as Agile v2). The browser has a copy
// in src/lib/passwordPolicy.js so people see a problem as they type; this copy counts.

export const PASSWORD_MAX_AGE_DAYS = 90;
export const PASSWORD_WARN_DAYS = 7;
export const PASSWORD_MIN_LENGTH = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

// Returns a plain-English problem, or '' when the password is fine.
export function passwordProblem(newPassword: string, currentPassword: string, email: string): string {
  const pw = String(newPassword || '');
  if (pw.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (pw.length > 128) return 'Use 128 characters or fewer.';
  if (/^(.)\1+$/.test(pw)) return 'Choose something less repetitive.';
  if (currentPassword && pw === currentPassword) return 'Choose a password you have not used just now.';
  if (email && pw.toLowerCase() === String(email).toLowerCase()) return 'Your password cannot be your email address.';
  return '';
}

export function expiryInfo(changedAtIso: string | null | undefined, now = Date.now()) {
  const changed = changedAtIso ? Date.parse(changedAtIso) : NaN;
  if (Number.isNaN(changed)) return null;
  const expiresAt = changed + PASSWORD_MAX_AGE_DAYS * DAY_MS;
  const msLeft = expiresAt - now;
  const daysLeft = Math.max(0, Math.ceil(msLeft / DAY_MS));
  return {
    expired: msLeft <= 0,
    days_left: daysLeft,
    warn: msLeft > 0 && daysLeft <= PASSWORD_WARN_DAYS,
    expires_at: new Date(expiresAt).toISOString(),
  };
}
