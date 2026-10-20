import { base44 } from '@/api/base44Client';

const norm = (v) => String(v ?? '').trim().toLowerCase();

/**
 * Is this referrer the claim's second referrer? Matched by record where the
 * claim's tracker holds one, otherwise by name, for a second referrer picked
 * before they were linked to the referrers list.
 */
function isSecondReferrer(tracker, id, name) {
  if (id && tracker.second_referrer_id) return tracker.second_referrer_id === id;
  return !!name && norm(tracker.second_referrer_name) === name;
}

/**
 * Push a referrer's VAT status onto that referrer's claims, so the invoices
 * worked out from it — and the amount expected from them — stay in step. The
 * claims carry a snapshot of the status so the claims list can work an invoice
 * out without loading the referrer's record.
 */
export async function syncReferrerVat(company) {
  const value = company?.vat_registered !== false;

  const matches = [];
  if (company?.id) matches.push({ referrer_id: company.id });
  if (company?.name) matches.push({ referrer: company.name });

  for (const match of matches) {
    // Only touch the claims that still disagree, so each batch shrinks and the
    // loop can't spin on the same rows forever.
    const query = { ...match, referrer_vat_registered: { $ne: value } };
    for (let pass = 0; pass < 20; pass++) {
      const result = await base44.entities.Claim.updateMany(query, {
        $set: { referrer_vat_registered: value },
      });
      if (!result?.has_more) break;
    }
  }

  // Second referrer: their snapshot lives inside the claim's invoice tracker, so
  // each tracker is read, its one setting replaced and the whole object written
  // back. Any amount already locked at what was invoiced stays exactly as it is —
  // only the figure worked out underneath it moves, which is what clears a
  // mismatch warning once the two agree again.
  const name = norm(company?.name);
  const claims = [];
  let cursor;
  do {
    const page = await base44.entities.Claim.list({
      limit: 500,
      cursor,
      fields: ['id', 'invoice_tracker'],
    });
    claims.push(...(page.items || []));
    cursor = page.next_cursor;
  } while (cursor && claims.length < 10000);

  const updates = [];
  for (const claim of claims) {
    const tracker = claim.invoice_tracker;
    if (!tracker || !isSecondReferrer(tracker, company?.id, name)) continue;
    // Only the claims that still disagree need writing, so a second save with
    // nothing changed touches no records at all.
    if ((tracker.second_referrer_vat_registered !== false) === value) continue;
    updates.push({
      id: claim.id,
      invoice_tracker: { ...tracker, second_referrer_vat_registered: value },
    });
  }

  for (let i = 0; i < updates.length; i += 500) {
    await base44.entities.Claim.bulkUpdate(updates.slice(i, i + 500));
  }
}