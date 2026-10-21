/**
 * Internal-only access gate for backend functions.
 *
 * "Internal" is decided by the user's user type alone: someone who works for
 * the business. A role never makes anyone internal — admin, super admin and
 * company admin are also used inside external companies (a referrer's own
 * company admin, for example), so a staff check must never lean on a role.
 *
 * Portal users (clients, referrers, repairers, suppliers) are never internal,
 * however they signed in.
 *
 * Public form functions do not use this gate — they are opened by their own
 * per-claim token instead.
 */

export function isInternalUser(user: any): boolean {
  return user?.user_type === 'internal';
}

/**
 * Gate an internal-only function. Call it straight after the client is built:
 *
 *   const gate = await requireInternalUser(base44);
 *   if (gate.response) return gate.response;
 *   const user = gate.user;   // only when the function needs who called it
 *
 * Returns 401 when there is no signed-in user at all, and 403 when the caller
 * is signed in but is not internal staff.
 */
export async function requireInternalUser(
  base44: any
): Promise<{ user?: any; response?: Response }> {
  let user: any = null;
  try {
    user = await base44.auth.me();
  } catch {
    user = null; // no session at all — a signed-out or direct HTTP caller
  }

  if (!user) return { response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!isInternalUser(user)) {
    return { response: Response.json({ error: 'Forbidden — internal users only' }, { status: 403 }) };
  }

  return { user };
}