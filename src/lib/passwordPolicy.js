// Browser copy of base44/shared/passwordPolicy.ts, so people see a problem as they type.
// The server repeats the check. Keep the two the same.

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_AGE_DAYS = 90;

export const PASSWORD_HINT = `At least ${PASSWORD_MIN_LENGTH} characters. Passwords must be changed every ${PASSWORD_MAX_AGE_DAYS} days.`;

// A plain-English problem, or '' when the password is fine.
export function passwordProblem(newPassword, currentPassword = '', email = '') {
  const pw = String(newPassword || '');
  if (pw.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (pw.length > 128) return 'Use 128 characters or fewer.';
  if (/^(.)\1+$/.test(pw)) return 'Choose something less repetitive.';
  if (currentPassword && pw === currentPassword) return 'Choose a password you have not used just now.';
  if (email && pw.toLowerCase() === String(email).toLowerCase()) return 'Your password cannot be your email address.';
  return '';
}

// Flags that carry "this sign-in was by password / after an email reset" across the
// page reload that follows signing in.
const LOGIN_FLAG = 'pw_login_pending';
const RESET_FLAG = 'pw_reset_done';

export function markPasswordLogin(email) {
  try { localStorage.setItem(LOGIN_FLAG, String(email || '').trim().toLowerCase() || '1'); } catch { /* storage unavailable */ }
}

// Set after a successful reset by email. The next password sign-in counts as a fresh password.
export function markPasswordReset() {
  try { localStorage.setItem(RESET_FLAG, '1'); } catch { /* storage unavailable */ }
}

// Read and clear the flags once, after a fresh sign-in. Null when this wasn't a password sign-in.
export function takePasswordLoginFlags() {
  try {
    const login = localStorage.getItem(LOGIN_FLAG);
    if (!login) return null;
    const reset = !!localStorage.getItem(RESET_FLAG);
    localStorage.removeItem(LOGIN_FLAG);
    localStorage.removeItem(RESET_FLAG);
    return { reset };
  } catch {
    return null;
  }
}
