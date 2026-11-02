/**
 * The claim types a claim can have — the same list as the Claim record allows. Every
 * screen that offers a claim type uses this list, so none can offer a type that won't
 * save or leave one out.
 */
export const CLAIM_TYPES = [
  'Fault Claim',
  'Non-Fault - Own Insurer',
  '3rd Party Insurer Direct',
  '3rd Party Paying Privately',
  'Credit Repair',
  'Glass Claim',
  'Paying Privately',
];

// Most specific first, so "non fault" isn't read as "fault" and "third party paying
// privately" isn't read as "paying privately".
const CLAIM_TYPE_WORDS = [
  ['3rd party paying privately', '3rd Party Paying Privately'],
  ['third party paying privately', '3rd Party Paying Privately'],
  ['non-fault own insurer', 'Non-Fault - Own Insurer'],
  ['non fault own insurer', 'Non-Fault - Own Insurer'],
  ['own insurer', 'Non-Fault - Own Insurer'],
  ['3rd party insurer', '3rd Party Insurer Direct'],
  ['third party insurer', '3rd Party Insurer Direct'],
  ['third party', '3rd Party Insurer Direct'],
  ['3rd party', '3rd Party Insurer Direct'],
  ['non-fault', 'Non-Fault - Own Insurer'],
  ['non fault', 'Non-Fault - Own Insurer'],
  ['credit', 'Credit Repair'],
  ['glass', 'Glass Claim'],
  ['paying privately', 'Paying Privately'],
  ['private', 'Paying Privately'],
  ['fault', 'Fault Claim'],
];

/** A claim type from free text (an import, say). Unrecognised text gives no type, so it's chosen by hand. */
export function claimTypeFromText(value) {
  if (!value) return undefined;
  const v = String(value).toLowerCase().trim();
  const exact = CLAIM_TYPES.find((t) => t.toLowerCase() === v);
  if (exact) return exact;
  const hit = CLAIM_TYPE_WORDS.find(([word]) => v.includes(word));
  return hit ? hit[1] : undefined;
}
