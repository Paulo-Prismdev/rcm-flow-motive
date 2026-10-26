// Keeps a claim's third party tied to the Clients & Third Parties directory.
// A third party typed straight into a claim is matched against the directory
// first (name, email or phone); if nothing matches, the record is created from
// the details entered, tagged as a third party and linked to the claim.
import { base44 } from '@/api/base44Client';
import { clientKey, COMPANY_HINT } from './claimClientLink';

export function thirdPartyPayloadFromClaim(formData, jobNumber) {
  const name = (formData.tp_name || '').trim();
  return {
    name,
    client_type: COMPANY_HINT.test(name) ? 'Company' : 'Individual',
    is_client: false,
    is_third_party: true,
    phone: formData.tp_phone || '',
    email: formData.tp_email || '',
    address_line_1: formData.tp_address_line_1 || '',
    address_line_2: formData.tp_address_line_2 || '',
    town: formData.tp_town || '',
    county: formData.tp_county || '',
    postcode: formData.tp_postcode || '',
    insurer: formData.tp_insurer || '',
    policy_number: formData.tp_policy_number || '',
    vehicle_reg: formData.tp_reg || '',
    vehicle_make_model: formData.tp_make_model || '',
    notes: jobNumber ? `Added from claim ${jobNumber} as the third party` : '',
  };
}

/** Directory records that clearly match the third party details on the claim. */
export async function findThirdPartyMatches(formData) {
  const records = await base44.entities.Client.list('-created_date', 500);
  const nameKey = clientKey(formData.tp_name);
  const emailKey = clientKey(formData.tp_email);
  const phoneKey = clientKey(formData.tp_phone);

  return (records || []).filter((record) => {
    if (nameKey && clientKey(record.name) === nameKey) return true;
    if (emailKey && clientKey(record.email) === emailKey) return true;
    if (phoneKey && clientKey(record.phone) === phoneKey) return true;
    return false;
  });
}

export async function createThirdPartyFromClaim(formData, jobNumber) {
  return base44.entities.Client.create(thirdPartyPayloadFromClaim(formData, jobNumber));
}