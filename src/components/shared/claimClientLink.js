// Keeps a claim's client tied to the Clients & Third Parties directory.
// A claim saved with a client typed straight into the form is matched against the
// directory first (name, email or phone); if nothing matches, the record is created
// from the details entered, tagged as a client, and linked to the claim.
import { base44 } from '@/api/base44Client';

export const clientKey = (v) => (v || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');

export const COMPANY_HINT = /\b(ltd|limited|plc|llp|inc|co|company|group|holdings|partnership|t\/a|ta)\b/i;

export function clientPayloadFromClaim(formData, jobNumber) {
  const name = (formData.client_name || '').trim();
  return {
    name,
    client_type: COMPANY_HINT.test(name) ? 'Company' : 'Individual',
    is_client: true,
    is_third_party: false,
    phone: formData.client_phone || '',
    email: formData.client_email || '',
    address_line_1: formData.client_address_line_1 || '',
    address_line_2: formData.client_address_line_2 || '',
    town: formData.client_town || '',
    county: formData.client_county || '',
    postcode: formData.client_postcode || '',
    vat_status: formData.client_vat_status || 'Unknown',
    notes: jobNumber ? `Added from claim ${jobNumber}` : '',
  };
}

// Existing directory records that clearly match the details entered on the claim.
export async function findClientMatches(formData) {
  const clients = await base44.entities.Client.list('-created_date', 500);
  const nameKey = clientKey(formData.client_name);
  const emailKey = clientKey(formData.client_email);
  const phoneKey = clientKey(formData.client_phone);

  return (clients || []).filter((c) => {
    if (nameKey && clientKey(c.name) === nameKey) return true;
    if (emailKey && clientKey(c.email) === emailKey) return true;
    if (phoneKey) {
      const phones = [c.phone, ...(c.contacts || []).map((x) => x.phone)];
      if (phones.some((p) => clientKey(p) && clientKey(p) === phoneKey)) return true;
    }
    return false;
  });
}

export async function createClientFromClaim(formData, jobNumber) {
  return base44.entities.Client.create(clientPayloadFromClaim(formData, jobNumber));
}