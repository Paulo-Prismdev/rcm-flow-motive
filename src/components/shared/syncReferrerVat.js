import { base44 } from '@/api/base44Client';

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
}