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

    // ── Decay mode: refresh client_comm_status_flag for all active claims.
    //    Also self-heals: if a Client Communication update was created but the
    //    frontend/automation missed updating last_client_comm_at, sync it from
    //    the latest update record before computing the flag. Run on a schedule.
    if (body.decay) {
      const claims = await base44.asServiceRole.entities.Claim.filter(
        { archived: false },
        '-created_date',
        500
      );
      let updated = 0;
      const now = Date.now();
      for (const claim of claims) {
        try {
          const isClosed =
            claim.job_status === 'Cancelled' ||
            ['Invoiced', 'Invoice Paid'].includes(claim.invoice_status);
          if (isClosed) {
            if (claim.client_comm_status_flag !== 'Gray') {
              await base44.asServiceRole.entities.Claim.update(claim.id, {
                client_comm_status_flag: 'Gray',
              });
              updated++;
            }
            continue;
          }

          // Respect active override (snooze) — show Blue, skip time-based calc
          if (claim.client_comm_override_active) {
            const expiry = claim.client_comm_override_expiry_at
              ? new Date(claim.client_comm_override_expiry_at).getTime()
              : null;
            if (!expiry || expiry > now) {
              if (claim.client_comm_status_flag !== 'Blue') {
                await base44.asServiceRole.entities.Claim.update(claim.id, {
                  client_comm_status_flag: 'Blue',
                });
                updated++;
              }
              continue;
            }
            // Override expired — clear it and fall through
            await base44.asServiceRole.entities.Claim.update(claim.id, {
              client_comm_override_active: false,
              client_comm_override_reason: null,
              client_comm_override_expiry_at: null,
            });
          }

          // Self-heal: check if there's a newer Client Communication update
          // than what last_client_comm_at reflects.
          let latestCommAt = claim.last_client_comm_at;
          const latestUpdates = await base44.asServiceRole.entities.ClaimUpdate.filter(
            { claim_id: claim.id, update_type: 'Client Communication' },
            '-created_date',
            1
          );
          if (latestUpdates[0]) {
            const updateDate = latestUpdates[0].created_date;
            if (!latestCommAt || new Date(updateDate) > new Date(latestCommAt)) {
              latestCommAt = updateDate;
              const nextDue = new Date(
                new Date(updateDate).getTime() + 48 * 60 * 60 * 1000
              ).toISOString();
              // Sync last_client_comm_at and set Green immediately.
              await base44.asServiceRole.entities.Claim.update(claim.id, {
                last_client_comm_at: new Date(updateDate).toISOString(),
                next_client_comm_due_at: nextDue,
                client_comm_status_flag: 'Green',
              });
              updated++;
              continue;
            }
          }

          if (!latestCommAt) {
            // No client communication ever logged — never show Green.
            const sinceCreated = claim.created_date
              ? (now - new Date(claim.created_date).getTime()) / 3600000
              : 48;
            const flag = sinceCreated >= 48 ? 'Red' : 'Amber';
            if (claim.client_comm_status_flag !== flag) {
              await base44.asServiceRole.entities.Claim.update(claim.id, {
                client_comm_status_flag: flag,
              });
              updated++;
            }
            continue;
          }
          const hours = (now - new Date(latestCommAt).getTime()) / 3600000;
          let flag: string;
          if (hours >= 48) flag = 'Red';
          else if (hours >= 24) flag = 'Amber';
          else flag = 'Green';
          if (claim.client_comm_status_flag !== flag) {
            await base44.asServiceRole.entities.Claim.update(claim.id, {
              client_comm_status_flag: flag,
            });
            updated++;
          }
        } catch (e) {
          // skip this claim
        }
      }
      return Response.json({ decayed: updated, scanned: claims.length });
    }

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