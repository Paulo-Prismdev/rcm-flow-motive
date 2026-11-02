import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { currentUser, ownsClaim, portalScope } from '../../shared/portalAccess.ts';
import { fileNameOf, isPrivateRef, signedUrlFor } from '../../shared/privateFiles.ts';

/**
 * Opens a stored claim file: checks the person may see it, hands back a link that
 * lasts five minutes for a file in private storage, and records the opening on the
 * claim's audit trail.
 *
 *   ref        the stored reference (private-file:… or an older public URL)
 *   claim_id   the claim the file belongs to (portal users must give it)
 *   purpose    'view' (default), 'download' or 'read' (read by the AI reader)
 *   log_only   for an older public file: just record that it was opened
 *
 * Staff may open any claim file. A portal user may open a file only on a claim of
 * their own, and only one that is part of that claim's shared paperwork: never an
 * invoicing (inv_) document.
 */
const INVOICE_KEY_PREFIX = 'inv_';
const ACTIONS: Record<string, string> = {
  view: 'Document Viewed',
  download: 'Document Downloaded',
  read: 'Document Read by AI',
};

async function findDocument(base44: any, ref: string, claimId?: string | null) {
  const query: Record<string, unknown> = { file_url: ref };
  if (claimId) query.claim_id = claimId;
  const page = await base44.asServiceRole.entities.ClaimDocument.filter(query, { limit: 5 }).catch(() => null);
  const items = page?.items || (Array.isArray(page) ? page : []);
  return items[0] || null;
}

/** Whether a file is part of the claim's shared (non-invoicing) paperwork. */
async function isSharedClaimFile(base44: any, claim: any, ref: string, doc: any): Promise<boolean> {
  if (doc) return !String(doc.item_key || '').startsWith(INVOICE_KEY_PREFIX);
  const onClaim = [
    ...(Array.isArray(claim.file_urls) ? claim.file_urls : []),
    ...(Array.isArray(claim.image_urls) ? claim.image_urls : []),
    claim.instruction_pdf_url, claim.repair_preference_pdf_url, claim.declaration_of_need_pdf_url,
  ];
  if (onClaim.includes(ref)) return true;
  const updates = await base44.asServiceRole.entities.ClaimUpdate.filter({ claim_id: claim.id }, '-created_date', 500).catch(() => []);
  return (updates || []).some((u: any) => Array.isArray(u.file_urls) && u.file_urls.includes(ref));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await currentUser(base44);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const ref = typeof body?.ref === 'string' ? body.ref : '';
    const purpose = ACTIONS[body?.purpose] ? body.purpose : 'view';
    if (!ref || ref.length > 2000) return Response.json({ error: 'ref is required' }, { status: 400 });

    const scope = portalScope(user);
    if (!scope) return Response.json({ error: 'Forbidden' }, { status: 403 });

    let claimId: string | null = typeof body?.claim_id === 'string' && body.claim_id ? body.claim_id : null;
    const doc = await findDocument(base44, ref, claimId);
    if (!claimId && doc?.claim_id) claimId = doc.claim_id;
    const claim = claimId ? await base44.asServiceRole.entities.Claim.get(claimId).catch(() => null) : null;

    if (scope.kind !== 'internal') {
      // Portal users: their own claim, and only its shared paperwork.
      if (!claim || !ownsClaim(scope, claim) || !(await isSharedClaimFile(base44, claim, ref, doc))) {
        return Response.json({ error: 'File not found' }, { status: 404 });
      }
    }

    // The opening goes on the claim's audit trail, written by the server so it can't
    // be skipped or altered from the browser. A failed log never blocks the file.
    if (claim) {
      await base44.asServiceRole.entities.ActivityLog.create({
        parent_id: claim.id,
        parent_type: 'Claim',
        action: ACTIONS[purpose],
        field_name: doc?.item_key || '',
        description: `${ACTIONS[purpose]}: ${doc?.file_name || fileNameOf(ref)}${scope.kind !== 'internal' ? ` (via ${scope.kind === 'bodyshop' ? 'repairer' : scope.kind} portal)` : ''}`,
        user_email: user.email || '',
        user_name: user.display_name || user.full_name || user.email || '',
      }).catch((e: any) => console.warn('openClaimFile: audit log failed', e?.message));
    }

    if (body?.log_only === true || !isPrivateRef(ref)) {
      return Response.json({ url: isPrivateRef(ref) ? null : ref, logged: !!claim });
    }

    const url = await signedUrlFor(base44, ref);
    return Response.json({ url, expires_in: 300 });
  } catch (error: any) {
    console.error('openClaimFile error:', error?.message);
    return Response.json({ error: 'This file could not be opened.' }, { status: 500 });
  }
});
