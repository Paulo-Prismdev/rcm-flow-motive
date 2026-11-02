// Turns what the sign-in service sends back into something a person can act on.
export function authErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const status = err?.response?.status ?? err?.status;
  const raw = String(err?.response?.data?.message || err?.response?.data?.detail || err?.response?.data?.error || err?.message || '');

  if (status === 429) return 'Too many attempts. Wait a few minutes, then try again.';
  if (!err?.response && /network|failed to fetch|timeout/i.test(raw)) return "We couldn't reach the server. Check your connection and try again.";
  if (status === 401 || /invalid (email|credentials|password)|incorrect|wrong password|credentials/i.test(raw)) return "That email or password isn't right.";
  if (/not registered|not invited|no access/i.test(raw)) return "This email doesn't have access to RCM Flowmotive. Please contact RCM Automotive.";
  return raw || fallback;
}
