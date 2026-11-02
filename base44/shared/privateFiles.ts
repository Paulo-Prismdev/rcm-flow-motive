/**
 * Private file references, server side (the browser side is src/lib/privateFiles.js).
 *
 * A file in private storage is stored on records as
 *   private-file:<storage uri>#<original file name>
 * and is only ever opened through a signed link that lasts a few minutes.
 */
export const PRIVATE_PREFIX = 'private-file:';
export const SIGNED_LINK_SECONDS = 300;

export const isPrivateRef = (ref: unknown): ref is string =>
  typeof ref === 'string' && ref.startsWith(PRIVATE_PREFIX);

/** The storage URI inside a private reference. */
export function privateUri(ref: string): string {
  const body = ref.slice(PRIVATE_PREFIX.length);
  const hash = body.indexOf('#');
  return hash >= 0 ? body.slice(0, hash) : body;
}

export function fileNameOf(ref: string): string {
  if (isPrivateRef(ref)) {
    const hash = ref.indexOf('#');
    if (hash >= 0) {
      try { return decodeURIComponent(ref.slice(hash + 1)); } catch { return ref.slice(hash + 1); }
    }
    return privateUri(ref).split('/').pop() || 'file';
  }
  return String(ref).split(/[?#]/)[0].split('/').pop() || 'file';
}

/** A short-lived link for a private reference; any other URL comes back unchanged. */
export async function signedUrlFor(base44: any, ref: string, seconds = SIGNED_LINK_SECONDS): Promise<string> {
  if (!isPrivateRef(ref)) return ref;
  const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
    file_uri: privateUri(ref),
    expires_in: seconds,
  });
  return signed_url;
}

/** Signed links for a list of stored file references (used where a function reads files). */
export const signedUrlsFor = (base44: any, refs: unknown[], seconds = SIGNED_LINK_SECONDS) =>
  Promise.all((refs || []).filter((r): r is string => typeof r === 'string' && !!r)
    .map((r) => signedUrlFor(base44, r, seconds)));
