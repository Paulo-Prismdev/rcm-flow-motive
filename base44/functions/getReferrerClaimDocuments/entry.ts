import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * The documents panel of one claim, for a referrer who owns that claim.
 *
 * Documents are now held as ClaimDocument records, which the referrer cannot list
 * directly. This is the one way a referrer reads them: the claim must be one of the
 * caller's own (their linked referrer or company), and anything filed against the
 * invoicing tracker in Financials (its `inv_` keys: invoices, purchase orders,
 * close-out paperwork) is never returned.
 */
const INVOICE_KEY_PREFIX = 'inv_';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { claim_id } = await req.json().catch(() => ({}));
    if (!claim_id) return Response.json({ error: 'claim_id is required' }, { status: 400 });

    const claim = await base44.asServiceRole.entities.Claim
      .get(claim_id)
      .catch((e: any) => (e.status === 404 ? null : Promise.reject(e)));
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

    const ownReferrerIds = [user.linked_referrer_id, user.company_id].filter(Boolean);
    const ownsClaim = ownReferrerIds.length > 0 && ownReferrerIds.includes(claim.referrer_id);
    if (user.user_type !== 'internal' && !ownsClaim) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const page = await base44.asServiceRole.entities.ClaimDocument.filter(
      { claim_id },
      { sort: 'created_date', limit: 500 }
    );
    const records = page?.items || [];

    // Only the documents panel: the checklist documents and general documents.
    const documents = records
      .filter((d: any) => d?.file_url && !String(d.item_key || '').startsWith(INVOICE_KEY_PREFIX))
      .map((d: any) => ({
        id: d.id,
        item_key: d.item_key || 'general',
        file_name: d.file_name || '',
        file_url: d.file_url,
        uploaded_at: d.uploaded_at || d.created_date || null,
      }));

    const legacyFiles = Array.isArray(claim.file_urls) ? claim.file_urls.filter(Boolean) : [];

    return Response.json({ documents, legacy_files: legacyFiles });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}