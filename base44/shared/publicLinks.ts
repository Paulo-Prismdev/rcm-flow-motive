/**
 * Links that open a public form without signing in.
 *
 * There are two kinds:
 *
 * 1. Signed claim links (repairer update, backordered parts). The link carries the
 *    claim, what the link is for and when it runs out, signed with a key that only
 *    the server holds (PUBLIC_LINK_SIGNING_KEY). Nobody can make one from a claim ID,
 *    and one made for one form cannot open another.
 *
 * 2. Signing links (indemnity, repair preference, declaration of need). These carry a
 *    random token stored on the claim. They run out LINK_TTL_DAYS after the link was
 *    generated and can be completed once: after that the form refuses until staff
 *    generate a fresh link.
 *
 * Public forms never receive any server secret.
 */

export const LINK_TTL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ClaimLinkPurpose = 'bodyshop_update' | 'backorder';

const encoder = new TextEncoder();

function signingKey(): string {
  const key = Deno.env.get('PUBLIC_LINK_SIGNING_KEY');
  if (!key) throw new Error('PUBLIC_LINK_SIGNING_KEY is not set');
  return key;
}

function toBase64Url(text: string): string {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  return atob(padded);
}

async function hmacHex(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(signingKey()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time comparison, so a wrong signature takes as long to reject as a nearly right one. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** A signed link token for one claim and one form, valid for `ttlDays`. */
export async function signClaimLink(purpose: ClaimLinkPurpose, claimId: string, ttlDays = LINK_TTL_DAYS): Promise<string> {
  const payload = toBase64Url(JSON.stringify({ p: purpose, c: claimId, e: Date.now() + ttlDays * DAY_MS }));
  return `${payload}.${await hmacHex(payload)}`;
}

/**
 * The claim a signed link is for. `error` is 'invalid' for anything not signed by us
 * (or signed for a different form) and 'expired' once its time has run out.
 */
export async function verifyClaimLink(
  token: unknown, purpose: ClaimLinkPurpose
): Promise<{ claimId?: string; error?: 'invalid' | 'expired' }> {
  if (typeof token !== 'string' || token.length > 600) return { error: 'invalid' };
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return { error: 'invalid' };
  if (!safeEqual(signature, await hmacHex(payload))) return { error: 'invalid' };
  try {
    const data = JSON.parse(fromBase64Url(payload));
    if (data?.p !== purpose || typeof data?.c !== 'string' || !data.c) return { error: 'invalid' };
    if (typeof data.e !== 'number' || Date.now() > data.e) return { error: 'expired' };
    return { claimId: data.c };
  } catch {
    return { error: 'invalid' };
  }
}

/**
 * Whether a signing link generated at `generatedAt` has run out. A link with no
 * generated date is treated as run out: it predates expiry, so staff send a new one.
 */
export function signingLinkExpired(generatedAt: unknown): boolean {
  if (!generatedAt) return true;
  const t = Date.parse(String(generatedAt));
  if (Number.isNaN(t)) return true;
  return Date.now() > t + LINK_TTL_DAYS * DAY_MS;
}

/** The plain message a public form shows for a link that can no longer be used. */
export const LINK_MESSAGES = {
  invalid: 'This link is not valid. Please contact RCM Automotive for a new one.',
  expired: 'This link has expired. Please contact RCM Automotive for a new one.',
  used: 'This form has already been completed. Please contact RCM Automotive if anything needs changing.',
};

/**
 * Basic protection for the open forms (anyone can reach them without a link):
 * a hidden field people never see or fill in, and a minimum time on the page.
 * Returns true when the submission looks automated.
 */
export function looksAutomated(body: any): boolean {
  if (body?._hp && String(body._hp).trim() !== '') return true;
  const started = Number(body?._started_at);
  if (!started || Number.isNaN(started)) return true;
  const elapsed = Date.now() - started;
  return elapsed < 3000 || elapsed > 24 * 60 * 60 * 1000;
}

/**
 * Only file links that point at this app's own Base44 file storage are kept, so a
 * public form cannot attach an arbitrary outside URL to a claim.
 */
export function ownFileUrls(urls: unknown, max = 40): string[] {
  if (!Array.isArray(urls)) return [];
  return urls
    .filter((u): u is string => typeof u === 'string' && u.length < 1000)
    .filter((u) => {
      try {
        const url = new URL(u);
        return url.protocol === 'https:'
          && (url.hostname === 'base44.app' || url.hostname.endsWith('.base44.app')
            || url.hostname === 'base44.com' || url.hostname.endsWith('.base44.com'));
      } catch {
        return false;
      }
    })
    .slice(0, max);
}

/** A drawn signature must be a PNG data URL of a sensible size. */
export function validSignature(dataUrl: unknown): boolean {
  return typeof dataUrl === 'string'
    && dataUrl.startsWith('data:image/png;base64,')
    && dataUrl.length < 2_000_000;
}

/** Trim a free-text value to a maximum length. */
export const clip = (value: unknown, max = 2000): string =>
  (value === null || value === undefined ? '' : String(value)).trim().slice(0, max);

/** The app's public address, for links in emails. */
export function appPublicUrl(req?: Request): string {
  return (Deno.env.get('APP_PUBLIC_URL') || req?.headers.get('origin') || 'https://app.rcmautomotive.co.uk')
    .replace(/\/+$/, '');
}
