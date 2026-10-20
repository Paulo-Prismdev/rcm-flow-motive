import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Refresh the VAT/excess snapshot held on each claim from its linked client's
 * "we handle their VAT and excess" setting.
 *
 * Used as a one-off backfill (no payload) and can be re-run at any time to bring
 * older claims in step. Regular client edits sync through the client directory.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.user_type !== 'internal') {
      return Response.json({ error: 'Forbidden — internal only' }, { status: 403 });
    }

    // Client settings, keyed by id and by name (older claims link by name only).
    const clients = [];
    let clientCursor = undefined;
    do {
      const page: any = await base44.asServiceRole.entities.Client.list({
        sort: '-created_date', limit: 500, cursor: clientCursor,
      });
      clients.push(...(page.items || []));
      clientCursor = page.next_cursor;
    } while (clientCursor && clients.length < 20000);

    const byId = new Map();
    const byName = new Map();
    for (const client of clients) {
      const handled = client.handles_vat_excess === true;
      byId.set(client.id, handled);
      if (client.name) byName.set(String(client.name).trim().toLowerCase(), handled);
    }

    const claims = [];
    let cursor = undefined;
    do {
      const page: any = await base44.asServiceRole.entities.Claim.list({
        sort: '-created_date',
        limit: 500,
        cursor,
        fields: ['id', 'client_id', 'client_name', 'client_vat_excess_handled'],
      });
      claims.push(...(page.items || []));
      cursor = page.next_cursor;
    } while (cursor && claims.length < 20000);

    const updates = [];
    let unresolved = 0;
    for (const claim of claims) {
      let desired;
      if (claim.client_id && byId.has(claim.client_id)) {
        desired = byId.get(claim.client_id);
      } else if (claim.client_name && byName.has(String(claim.client_name).trim().toLowerCase())) {
        desired = byName.get(String(claim.client_name).trim().toLowerCase());
      }
      if (desired === undefined) {
        unresolved++;
        continue;
      }
      if (desired !== (claim.client_vat_excess_handled === true)) {
        updates.push({ id: claim.id, client_vat_excess_handled: desired });
      }
    }

    let updated = 0;
    for (let i = 0; i < updates.length; i += 500) {
      const batch = updates.slice(i, i + 500);
      await base44.asServiceRole.entities.Claim.bulkUpdate(batch);
      updated += batch.length;
    }

    return Response.json({
      clientsLoaded: clients.length,
      claimsScanned: claims.length,
      updated,
      unresolved,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}