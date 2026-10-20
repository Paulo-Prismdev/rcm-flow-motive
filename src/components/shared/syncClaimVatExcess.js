import { base44 } from '@/api/base44Client';

/**
 * Push a client's "we handle their VAT and excess" setting onto that client's
 * claims, so list views can gate the VAT & Excess invoice items without having
 * to load the client record.
 */
export async function syncClaimVatExcess(client) {
  const value = client?.handles_vat_excess === true;

  const matches = [];
  if (client?.id) matches.push({ client_id: client.id });
  if (client?.name) matches.push({ client_name: client.name });

  for (const match of matches) {
    // Only touch the claims that still disagree, so each batch shrinks and the
    // loop can't spin on the same rows forever.
    const query = { ...match, client_vat_excess_handled: { $ne: value } };
    for (let pass = 0; pass < 20; pass++) {
      const result = await base44.entities.Claim.updateMany(query, {
        $set: { client_vat_excess_handled: value },
      });
      if (!result?.has_more) break;
    }
  }
}