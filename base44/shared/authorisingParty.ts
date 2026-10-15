// Backend authorising-party derivation — mirrors src/components/shared/authorisingParty.js.
// Used by the backfill function so both frontend and backend share the same rules.

export function deriveAuthorisingParty(claim: any): { authorised_by: string; authorising_party_name: string } {
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