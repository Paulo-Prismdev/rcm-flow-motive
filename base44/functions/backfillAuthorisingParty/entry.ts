import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { deriveAuthorisingParty, authorisingPartyNameForRole } from '../../shared/authorisingParty.ts';
import { requireInternalUser } from '../../shared/internalAccess.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    // Internal-only: directory backfill.
    const gate = await requireInternalUser(base44);
    if (gate.response) return gate.response;

    // Fetch all claims via service role (paginated)
    const allClaims = [];
    let cursor = undefined;
    do {
      const page: any = await base44.asServiceRole.entities.Claim.list({
        sort: '-created_date',
        limit: 500,
        cursor,
        fields: [
          'id', 'claim_type', 'insurer', 'tp_insurer', 'tp_name',
          'client_name', 'credit_repair_company_name',
          'authorised_by', 'authorising_party_name', 'authorising_party_overridden',
          'reg', 'job_number', 'job_status', 'secondary_status',
        ],
      });
      allClaims.push(...(page.items || []));
      cursor = page.next_cursor;
    } while (cursor && allClaims.length < 10000);

    let updated = 0;
    let skipped = 0;
    const unresolved = [];

    let cancelled = 0;
    for (const claim of allClaims) {
      // Skip cancelled claims — they don't need an authorising party
      if (claim.job_status === 'Cancelled' || claim.secondary_status === 'Cancelled') {
        cancelled++;
        continue;
      }
      // For overridden claims: keep the chosen role, but refresh the org name
      // from the matching field (mirrors sanitizeClaimData).
      if (claim.authorising_party_overridden) {
        const role = claim.authorised_by || '';
        if (role) {
          const refreshedName = authorisingPartyNameForRole(role, claim);
          if (refreshedName !== (claim.authorising_party_name || '')) {
            await base44.asServiceRole.entities.Claim.update(claim.id, {
              authorising_party_name: refreshedName,
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
        if (!role || !claim.authorising_party_name) {
          unresolved.push({
            id: claim.id,
            job_number: claim.job_number,
            reg: claim.reg,
            claim_type: claim.claim_type,
            authorised_by: claim.authorised_by,
            authorising_party_name: claim.authorising_party_name,
            reason: 'Overridden but missing role or name',
          });
        }
        continue;
      }

      const derived = deriveAuthorisingParty(claim);
      const needsUpdate =
        derived.authorised_by !== (claim.authorised_by || '') ||
        derived.authorising_party_name !== (claim.authorising_party_name || '');

      if (needsUpdate) {
        await base44.asServiceRole.entities.Claim.update(claim.id, {
          authorised_by: derived.authorised_by,
          authorising_party_name: derived.authorising_party_name,
        });
        updated++;
      }

      // Report unresolved: role or name missing
      if (!derived.authorised_by || !derived.authorising_party_name) {
        unresolved.push({
          id: claim.id,
          job_number: claim.job_number,
          reg: claim.reg,
          claim_type: claim.claim_type,
          authorised_by: derived.authorised_by,
          authorising_party_name: derived.authorising_party_name,
          reason: !derived.authorised_by
            ? 'No claim type set'
            : 'Missing organisation name (e.g. insurer, TP name, or credit repair company)',
        });
      }
    }

    return Response.json({
      total: allClaims.length,
      updated,
      skipped,
      cancelled,
      unresolvedCount: unresolved.length,
      unresolved: unresolved.slice(0, 200),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}