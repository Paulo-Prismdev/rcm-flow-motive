/**
 * Authorising Party — single source of truth for "who is this job for and who pays".
 *
 * The ROLE lives in claim.authorised_by (the same field the instruction PDF uses).
 * The ORGANISATION NAME lives in claim.authorising_party_name.
 * The OVERRIDE FLAG lives in claim.authorising_party_overridden.
 *
 * Together they form the authorising party: e.g. "Third Party Insurer: Admiral"
 * or "Credit Repair: ABC Co" or "Client: John Smith" (private).
 */

// Display label for each authorised_by enum value.
export const AUTHORISING_PARTY_LABELS = {
  'Client Insurer': 'Client Insurer',
  'Third Party Insurer': 'Third Party Insurer',
  'Credit Repair': 'Credit Repair',
  'Third Party': 'Third Party',
  'Uninsured': 'Client',
};

// Colour theme for each role (used by the banner + list badge).
export const AUTHORISING_PARTY_STYLES = {
  'Client Insurer': { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  'Third Party Insurer': { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  'Credit Repair': { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500' },
  'Third Party': { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  'Uninsured': { bg: 'bg-gray-100 dark:bg-gray-800/40', border: 'border-gray-300 dark:border-gray-700', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-500' },
};

/**
 * Derive the authorising party role + organisation name from claim type and
 * the relevant insurer / company / party fields.
 *
 * @returns {{ authorised_by: string, authorising_party_name: string }}
 */
export function deriveAuthorisingParty(claim) {
  if (!claim) return { authorised_by: '', authorising_party_name: '' };
  const ct = claim.claim_type;
  switch (ct) {
    case 'Fault Claim':
    case 'Non-Fault - Own Insurer':
    case 'Glass Claim':
      return { authorised_by: 'Client Insurer', authorising_party_name: claim.insurer || '' };
    case '3rd Party Insurer Direct':
      return { authorised_by: 'Third Party Insurer', authorising_party_name: claim.tp_insurer || '' };
    case '3rd Party Paying Privately':
      return { authorised_by: 'Third Party', authorising_party_name: claim.tp_name || '' };
    case 'Credit Repair':
      return { authorised_by: 'Credit Repair', authorising_party_name: claim.credit_repair_company_name || '' };
    case 'Paying Privately':
      return { authorised_by: 'Uninsured', authorising_party_name: claim.client_name || '' };
    default:
      return { authorised_by: claim.authorised_by || '', authorising_party_name: claim.authorising_party_name || '' };
  }
}

/**
 * Returns true when the authorising party can't be resolved (role or name missing).
 */
export function isAuthorisingPartyUnresolved(claim) {
  const role = claim?.authorised_by;
  const name = claim?.authorising_party_name;
  return !role || !name;
}

/**
 * Human-readable string: "Third Party Insurer: Admiral" or "Client: John Smith".
 * Returns '' if no role is set.
 */
export function formatAuthorisingParty(claim) {
  if (!claim) return '';
  const role = claim.authorised_by;
  if (!role) return '';
  const label = AUTHORISING_PARTY_LABELS[role] || role;
  const name = claim.authorising_party_name;
  return name ? `${label}: ${name}` : label;
}