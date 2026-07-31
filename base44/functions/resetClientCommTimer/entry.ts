import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Resets the 48-hour client communication tracker on a Claim.
 *
 * Triggered by an entity automation on ClaimUpdate create (update_type ===
 * "Client Communication"). Also supports manual invocation:
 *   { claim_id: "..." }          — reset a single claim using its latest
 *                                    Client Communication update timestamp
 *   { backfill: true }            — scan all active claims and reset each
 *                                    based on its most recent Client
 *                                    Communication update
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({} as any));

    // ── Backfill mode: scan all active claims ──
    if (body.backfill) {
      const claims = await base44.asServiceRole.entities.Claim.filter(
        { archived: false },
        '-created_date',
        500
      );
      const results: any[] = [];
      for (const claim of claims) {
        try {
          const latest = await base44.asServiceRole.entities.ClaimUpdate.filter(
            { claim_id: claim.id, update_type: 'Client Communication' },
            '-created_date',
            1
          );
          if (!latest[0]) continue;
          const isClosed =
            claim.job_status === 'Cancelled' ||
            ['Invoiced', 'Invoice Paid'].includes(claim.invoice_status);
          const now = new Date(latest[0].created_date);
          const nextDue = new Date(now.getTime() + 48 * 60 * 60 * 1000);
          const update = {
            last_client_comm_at: now.toISOString(),
            next_client_comm_due_at: nextDue.toISOString(),
            client_comm_status_flag: isClosed ? 'Gray' : 'Green',
          };
          await base44.asServiceRole.entities.Claim.update(claim.id, update);
          results.push({ claim_id: claim.id, reg: claim.reg, ...update });
        } catch (e) {
          results.push({ claim_id: claim.id, error: (e as Error).message });
        }
      }
      return Response.json({ backfilled: results.length, results });
    }

    // ── Single claim reset (automation or manual) ──
    const updateData = body.data || body;
    const claimId = updateData.claim_id || body.claim_id;
    if (!claimId) {
      return Response.json({ error: 'No claim_id provided' }, { status: 400 });
    }

    // Skip non–Client Communication updates when triggered by automation
    if (updateData.update_type && updateData.update_type !== 'Client Communication') {
      return Response.json({ skipped: true });
    }

    const claim = await base44.asServiceRole.entities.Claim.get(claimId);
    if (!claim) {
      return Response.json({ error: 'Claim not found' }, { status: 404 });
    }

    const isClosed =
      claim.job_status === 'Cancelled' ||
      ['Invoiced', 'Invoice Paid'].includes(claim.invoice_status);

    // Use the triggering update's created_date, else fetch the latest
    let latestCommDate = updateData.created_date;
    if (!latestCommDate) {
      const updates = await base44.asServiceRole.entities.ClaimUpdate.filter(
        { claim_id: claimId, update_type: 'Client Communication' },
        '-created_date',
        1
      );
      latestCommDate = updates[0]?.created_date;
    }

    const now = latestCommDate ? new Date(latestCommDate) : new Date();
    const nextDue = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const update = {
      last_client_comm_at: now.toISOString(),
      next_client_comm_due_at: nextDue.toISOString(),
      client_comm_status_flag: isClosed ? 'Gray' : 'Green',
    };

    await base44.asServiceRole.entities.Claim.update(claimId, update);
    return Response.json({ success: true, claim_id: claimId, ...update });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}