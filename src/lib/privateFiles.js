import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Private files.
 *
 * Sensitive claim documents (licences, estimates, authorities, invoices and the rest
 * of the documents checklist) are uploaded to private storage. They have no public
 * address: what is stored on the record is a private reference,
 *
 *   private-file:<storage uri>#<original file name>
 *
 * which works exactly like a URL wherever the app only compares or files it, and is
 * turned into a short-lived signed link only when someone opens the file. That link
 * is issued by the server after checking the person may see it, and the opening is
 * written to the claim's audit trail. Older files uploaded before this keep their
 * public address and open as before (their openings are logged too).
 */
export const PRIVATE_PREFIX = 'private-file:';

export const isPrivateRef = (ref) => typeof ref === 'string' && ref.startsWith(PRIVATE_PREFIX);

/** The reference stored for a file uploaded to private storage. */
export const toPrivateRef = (fileUri, fileName) =>
  `${PRIVATE_PREFIX}${fileUri}${fileName ? `#${encodeURIComponent(fileName)}` : ''}`;

/** The original file name carried by a private reference, or the last part of a URL. */
export function fileNameOf(ref) {
  if (!ref || typeof ref !== 'string') return '';
  if (isPrivateRef(ref)) {
    const hash = ref.indexOf('#');
    if (hash >= 0) {
      try { return decodeURIComponent(ref.slice(hash + 1)); } catch { return ref.slice(hash + 1); }
    }
    return ref.slice(PRIVATE_PREFIX.length).split('/').pop() || 'file';
  }
  return ref.split(/[?#]/)[0].split('/').pop() || 'file';
}

/** The lower-case extension of a file, from its name, for choosing how to preview it. */
export const fileExtensionOf = (ref) => (fileNameOf(ref).split('.').pop() || '').toLowerCase();

// Signed links last five minutes on the server; reuse one for four.
const cache = new Map();
const REUSE_MS = 4 * 60 * 1000;

/**
 * The address to open a stored file at. A public URL comes straight back (and, when
 * `log` is set, its opening is recorded); a private reference is exchanged for a
 * signed link. `claimId` says which claim the file belongs to, which portal users
 * must give and which keeps the audit entry on the right claim.
 */
export async function resolveFileUrl(ref, { claimId = null, log = false, purpose = 'view' } = {}) {
  if (!ref) return ref;
  if (!isPrivateRef(ref)) {
    if (log) {
      base44.functions.invoke('openClaimFile', { ref, claim_id: claimId, purpose, log_only: true }).catch(() => {});
    }
    return ref;
  }
  const hit = cache.get(ref);
  if (hit && Date.now() - hit.at < REUSE_MS && !log) return hit.url;
  const res = await base44.functions.invoke('openClaimFile', { ref, claim_id: claimId, purpose });
  const url = res.data?.url;
  if (!url) throw new Error('This file could not be opened.');
  cache.set(ref, { url, at: Date.now() });
  return url;
}

/** Opens a stored file in a new tab (resolving a private reference first). */
export async function openFileInNewTab(ref, opts = {}) {
  // Open the tab straight away, inside the click, so pop-up blockers allow it.
  const tab = window.open('', '_blank', 'noopener');
  try {
    const url = await resolveFileUrl(ref, { log: true, ...opts });
    if (tab) tab.location.href = url; else window.open(url, '_blank', 'noopener');
  } catch (e) {
    if (tab) tab.close();
    throw e;
  }
}

/** A hook form of resolveFileUrl, for screens that show a file inline. */
export function useResolvedFileUrl(ref, { claimId = null, log = false, enabled = true } = {}) {
  return useQuery({
    queryKey: ['resolvedFile', ref, log],
    queryFn: () => resolveFileUrl(ref, { claimId, log }),
    enabled: !!ref && enabled,
    staleTime: isPrivateRef(ref) ? REUSE_MS : Infinity,
    gcTime: REUSE_MS,
    retry: 1,
  });
}

/** Resolves a list of stored file references (e.g. for reading a document with AI). */
export const resolveFileUrls = (refs, opts) =>
  Promise.all((refs || []).map((ref) => resolveFileUrl(ref, { purpose: 'read', ...opts })));
