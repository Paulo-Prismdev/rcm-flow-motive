/**
 * Internal-only access gate for backend functions.
 *
 * "Internal" means someone who works for the business: an internal user type,
 * or one of the staff admin roles. Portal users (clients, referrers, repairers,
 * suppliers) are never internal, however they signed in.
 *
 * Public form functions do not use this gate — they are opened by their own
 * per-claim token instead.
 */

const INTERNAL_ROLES = ['admin', 'super_admin', 'company_admin'];

export function isInternalUser(user: any): boolean {
  if (!user) return false;
  return user.user_type === 'internal' || INTERNAL_ROLES.includes(user.role);
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