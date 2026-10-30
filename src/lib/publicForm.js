/**
 * Helpers shared by the public forms (the pages people open without signing in).
 */

/** The message the server sent back with a refused request, or `fallback`. */
export function serverMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.error || error?.data?.error || fallback;
}

/** Why the server refused a link: 'invalid', 'expired' or 'used', when it said. */
export function serverReason(error) {
  return error?.response?.data?.reason || error?.data?.reason || null;
}

/**
 * Basic protection for the open forms: the time the page was opened, and a hidden
 * field real people never see or fill in. Spread `antiSpamFields(startedAt, honeypot)`
 * into the request body.
 */
export const antiSpamFields = (startedAt, honeypot) => ({ _started_at: startedAt, _hp: honeypot || '' });
