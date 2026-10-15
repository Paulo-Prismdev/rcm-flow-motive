import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { deriveAuthorisingParty } from '../../shared/authorisingParty.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.user_type !== 'internal') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

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
          'reg', 'job_number',
        ],
      });
      allClaims.push(...(page.items || []));
      cursor = page.next_cursor;
    } while (cursor && allClaims.length < 10000);

    let updated = 0;
    let skipped = 0;
    const unresolved = [];

    for (const claim of allClaims) {
      // Skip claims that have been manually overridden
      if (claim.authorising_party_overridden) {
        skipped++;
        // Still check if it's unresolved for reporting
        if (!claim.authorised_by || !claim.authorising_party_name) {
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
      unresolvedCount: unresolved.length,
      unresolved: unresolved.slice(0, 200),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}