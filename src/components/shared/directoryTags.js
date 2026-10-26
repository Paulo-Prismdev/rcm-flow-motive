// The Clients & Third Parties directory holds one record per person or company.
// A record is tagged Client, Third Party, or both. The tags are worked out from
// how the record is used on claims — picking someone as a client or as a third
// party adds that tag — and they can also be set by hand in the directory.
import { base44 } from '@/api/base44Client';
import { clientKey } from './claimClientLink';

// A record with neither tag set predates the tags, and was a client.
export const isClientTagged = (record) =>
  record?.is_client === true || (record?.is_client === undefined && record?.is_third_party !== true);
export const isThirdPartyTagged = (record) => record?.is_third_party === true;

const tagsUnset = (record) => record?.is_client === undefined && record?.is_third_party === undefined;

export const directoryTagNames = (record) =>
  [isClientTagged(record) ? 'Client' : null, isThirdPartyTagged(record) ? 'Third Party' : null].filter(Boolean);

// Add a tag a pick has just given a record, so the directory learns how it is used.
// A tag, once on, is only taken off by hand — in the directory.
export async function ensureDirectoryTag(record, tag) {
  if (!record?.id) return record;
  // The pickers hand over a full record; a bare id is read first, so a tag that is
  // already on is never overwritten.
  const current = tagsUnset(record) ? await base44.entities.Client.get(record.id) : record;
  if (tag === 'client' && isClientTagged(current)) return current;
  if (tag === 'third_party' && isThirdPartyTagged(current)) return current;

  // A record saved before the tags existed keeps being a client as it gains one.
  const patch = tagsUnset(current)
    ? { is_client: true, is_third_party: tag === 'third_party' }
    : tag === 'client' ? { is_client: true } : { is_third_party: true };

  await base44.entities.Client.update(record.id, patch);
  return { ...current, ...patch };
}

/** The records a claim's links point at gain the tag their new role gives them. */
export async function ensureLinkTags({ client, thirdParty } = {}) {
  if (client?.id) await ensureDirectoryTag(client, 'client');
  if (thirdParty?.id) await ensureDirectoryTag(thirdParty, 'third_party');
}

/** The directory record for a name, where the spelling matches. */
export function findDirectoryByName(records, name) {
  const key = clientKey(name);
  if (!key) return null;
  return (records || []).find((record) => clientKey(record.name) === key) || null;
}