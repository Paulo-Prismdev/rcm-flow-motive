import { base44 } from '@/api/base44Client';
import { fmtGBP } from '@/components/shared/creditRepairRates';

/**
 * Records a request (or a reminder) for a referrer's invoice as an internal update
 * on the claim: an outgoing communication to the referring company, so the chase
 * sits in the job's Internal Updates alongside the rest of the correspondence.
 */
export async function createReferrerRequestNote({
  claim, item, referrerName, to, cc, total, reminder = false,
}) {
  const amount = typeof total === 'number' && total > 0 ? ` — ${fmtGBP(total)} inc VAT` : '';
  const who = referrerName || 'the referrer';

  return base44.entities.Note.create({
    content: reminder
      ? `Chased ${who} for their ${item.label}${amount}, seven days after the invoice was requested`
      : `Requested the ${item.label} from ${who}${amount}`,
    parent_id: claim.id,
    parent_type: 'Claim',
    update_type: 'Referrer Communication',
    direction: 'Outgoing',
    platform: 'E-Mail',
    contacted_party_name: who,
    contacted_party_detail: [to, cc ? `cc ${cc}` : ''].filter(Boolean).join(' · '),
    liked_by: [],
    starred: false,
  });
}