import { base44 } from '@/api/base44Client';
import { fmtGBP } from '@/components/shared/creditRepairRates';

/**
 * Records an accounts request as an internal update on the claim: an outgoing
 * communication to accounts, so the request sits in the job's Internal Updates
 * alongside the rest of the correspondence.
 */
export async function createAccountsRequestNote({ claim, item, to, cc, total }) {
  const amount = typeof total === 'number' && total > 0 ? ` — ${fmtGBP(total)} inc VAT` : '';

  return base44.entities.Note.create({
    content: `Requested ${item.label} from accounts${amount}`,
    parent_id: claim.id,
    parent_type: 'Claim',
    update_type: 'Accounts',
    direction: 'Outgoing',
    platform: 'E-Mail',
    contacted_party_name: 'Accounts',
    contacted_party_detail: [to, cc ? `cc ${cc}` : ''].filter(Boolean).join(' · '),
    liked_by: [],
    starred: false,
  });
}