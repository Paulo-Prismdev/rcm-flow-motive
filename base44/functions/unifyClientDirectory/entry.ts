import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireInternalUser } from '../../shared/internalAccess.ts';

/**
 * Folds the old Third Party list into the one Clients & Third Parties directory.
 *
 *  - Every client record keeps the Client tag, and gains the Third Party tag where
 *    a claim uses that name as the third party.
 *  - A third party whose name exactly matches a client record is merged into that
 *    record: the client's details win, blanks are filled from the third party, and
 *    the record ends up carrying both tags. The old third party row is removed.
 *  - A third party with no matching client becomes a record of its own, tagged as a
 *    third party (and as a client too where a claim uses the name as its client).
 *  - Claims whose client name matches a directory record are linked to it.
 *  - Names that only look alike are never merged — they come back as possible
 *    duplicates for a person to decide on.
 *
 * mode: 'dry_run' (default) reports the mapping and changes nothing.
 * mode: 'apply' performs it, and needs confirm: true.
 */
const key = (value: any) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const DIRECTORY_FIELDS = [
  'id', 'name', 'client_type', 'is_client', 'is_third_party', 'phone', 'email',
  'address_line_1', 'address_line_2', 'town', 'county', 'postcode', 'vat_status',
  'handles_vat_excess', 'insurer', 'policy_number', 'vehicle_reg', 'vehicle_make_model', 'notes',
];

const THIRD_PARTY_FIELDS = [
  'id', 'name', 'phone', 'email', 'address_line_1', 'address_line_2', 'town',
  'county', 'postcode', 'insurer', 'policy_number', 'vehicle_reg', 'vehicle_make_model', 'notes',
];

const CLAIM_FIELDS = ['id', 'job_number', 'client_id', 'client_name', 'tp_name'];

// Where the client record is blank, the third party's detail fills the gap.
const FILL_FIELDS = [
  'phone', 'email', 'address_line_1', 'address_line_2', 'town', 'county', 'postcode',
  'insurer', 'policy_number', 'vehicle_reg', 'vehicle_make_model', 'notes',
];

async function listAll(base44: any, entity: string, fields: string[]) {
  const out: any[] = [];
  let cursor: string | undefined;
  do {
    const page: any = await base44.asServiceRole.entities[entity].list({ sort: '-created_date', limit: 500, cursor, fields });
    out.push(...(page.items || []));
    cursor = page.next_cursor;
  } while (cursor && out.length < 20000);
  return out;
}

/** How alike two names are — anything below 1 has to be looked at by a person. */
function similarity(a: any, b: any) {
  const x = String(a || '').toLowerCase().trim();
  const y = String(b || '').toLowerCase().trim();
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.8;
  const xw = x.split(/\s+/);
  const yw = y.split(/\s+/);
  const overlap = xw.filter((w) => yw.some((v) => v.includes(w) || w.includes(v))).length;
  return overlap / Math.max(xw.length, yw.length);
}

function filledCount(record: any) {
  return DIRECTORY_FIELDS.filter((f) => f !== 'id' && String(record?.[f] || '').trim()).length;
}

async function bulkUpdate(base44: any, entity: string, records: any[]) {
  for (let i = 0; i < records.length; i += 500) {
    await base44.asServiceRole.entities[entity].bulkUpdate(records.slice(i, i + 500));
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const gate = await requireInternalUser(base44);
    if (gate.response) return gate.response;

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === 'apply' ? 'apply' : 'dry_run';
    if (mode === 'apply' && body?.confirm !== true) {
      return Response.json({ error: 'Pass confirm: true to merge the two lists.' }, { status: 400 });
    }

    const [clients, thirdParties, claims] = await Promise.all([
      listAll(base44, 'Client', DIRECTORY_FIELDS),
      listAll(base44, 'ThirdParty', THIRD_PARTY_FIELDS),
      listAll(base44, 'Claim', CLAIM_FIELDS),
    ]);

    // How each name is used on claims — the tags come from this.
    const usedAsClient = new Set(claims.map((c) => key(c.client_name)).filter(Boolean));
    const usedAsThirdParty = new Set(claims.map((c) => key(c.tp_name)).filter(Boolean));

    const clientByKey = new Map<string, any>();
    for (const client of clients) {
      const k = key(client.name);
      if (!k) continue;
      const sitting = clientByKey.get(k);
      // The most complete record of a repeated name is the one to keep.
      if (!sitting || filledCount(client) > filledCount(sitting)) clientByKey.set(k, client);
    }

    const tagUpdates: any[] = [];
    for (const client of clients) {
      const shouldBeThirdParty = usedAsThirdParty.has(key(client.name));
      if (client.is_client !== true || (client.is_third_party === true) !== shouldBeThirdParty) {
        tagUpdates.push({ id: client.id, is_client: true, is_third_party: shouldBeThirdParty });
      }
    }
    const tagUpdateById = new Map(tagUpdates.map((u) => [u.id, u]));

    const merges: any[] = [];
    const conversions: any[] = [];
    const thirdPartyIdsToRemove: string[] = [];
    const mergePatchById = new Map<string, any>();

    for (const tp of thirdParties) {
      const k = key(tp.name);
      const target = k ? clientByKey.get(k) : null;

      if (target) {
        const patch = mergePatchById.get(target.id) || { id: target.id, is_client: true, is_third_party: true };
        const filled: string[] = [];
        for (const field of FILL_FIELDS) {
          const targetValue = String(target[field] || '').trim();
          const incoming = String(tp[field] || '').trim();
          if (!targetValue && incoming && !String(patch[field] || '').trim()) {
            patch[field] = tp[field];
            filled.push(field);
          }
        }
        mergePatchById.set(target.id, patch);
        merges.push({
          kept: { id: target.id, name: target.name },
          merged: { id: tp.id, name: tp.name },
          filled,
        });
        thirdPartyIdsToRemove.push(tp.id);
        continue;
      }

      const asClient = usedAsClient.has(k);
      conversions.push({
        name: tp.name,
        is_client: asClient,
        is_third_party: true,
        client_type: (target?.client_type) || (/ltd|limited|plc|llp|group|holdings/i.test(tp.name) ? 'Company' : 'Individual'),
        phone: tp.phone || '', email: tp.email || '',
        address_line_1: tp.address_line_1 || '', address_line_2: tp.address_line_2 || '',
        town: tp.town || '', county: tp.county || '', postcode: tp.postcode || '',
        insurer: tp.insurer || '', policy_number: tp.policy_number || '',
        vehicle_reg: tp.vehicle_reg || '', vehicle_make_model: tp.vehicle_make_model || '',
        notes: tp.notes || '',
      });
      thirdPartyIdsToRemove.push(tp.id);
    }

    // Every name the directory will hold once this has run, so claims can be linked.
    const finalKeyToId = new Map<string, string>();
    for (const client of clients) finalKeyToId.set(key(client.name), client.id);

    // Claims whose client name matches a directory record but aren't linked to one yet.
    const claimLinks: any[] = [];
    const clientsUnmatched = new Set<string>();
    for (const claim of claims) {
      const name = String(claim.client_name || '').trim();
      if (!name) continue;
      if (claim.client_id) continue;
      const k = key(name);
      const id = finalKeyToId.get(k);
      if (id) claimLinks.push({ id: claim.id, client_id: id });
      else clientsUnmatched.add(name);
    }

    const thirdPartiesMatched = claims.filter((c) => key(c.tp_name) && finalKeyToId.has(key(c.tp_name))).length;
    const thirdPartyNamesUnmatched = [...new Set(claims.map((c) => String(c.tp_name || '').trim()).filter((n) => n && !finalKeyToId.has(key(n))))];

    // Names that only look alike — never merged, always handed back for a decision.
    const names = [
      ...clients.map((c) => ({ name: c.name, role: 'Client' })),
      ...conversions.map((c) => ({ name: c.name, role: 'Third Party' })),
    ];
    const possibleDuplicates: any[] = [];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        if (key(names[i].name) === key(names[j].name)) continue;
        const score = similarity(names[i].name, names[j].name);
        if (score >= 0.7) {
          possibleDuplicates.push({ a: names[i], b: names[j], score: Math.round(score * 100) });
        }
      }
    }
    possibleDuplicates.sort((a, b) => b.score - a.score);

    // What the directory will hold: tags per record, after the changes above.
    let clientsOnly = 0, thirdPartiesOnly = 0, both = 0;
    const finalTag = (id: string, name: string, fallback: any) => {
      const tag = tagUpdateById.get(id) || mergePatchById.get(id);
      if (tag) return tag;
      return fallback;
    };
    for (const client of clients) {
      const t = finalTag(client.id, client.name, { is_client: client.is_client, is_third_party: client.is_third_party });
      const isClient = t.is_client !== false;
      const isThird = t.is_third_party === true;
      if (isClient && isThird) both++;
      else if (isClient) clientsOnly++;
      else if (isThird) thirdPartiesOnly++;
    }
    for (const c of conversions) {
      if (c.is_client && c.is_third_party) both++;
      else if (c.is_client) clientsOnly++;
      else thirdPartiesOnly++;
    }

    const report = {
      mode,
      before: { clients: clients.length, thirdParties: thirdParties.length, claims: claims.length },
      after: { total: clients.length + conversions.length, clientsOnly, thirdPartiesOnly, both },
      merged: { count: merges.length, records: merges.slice(0, 50) },
      converted: { count: conversions.length, records: conversions.map((c) => ({ name: c.name, tags: c.is_client ? 'Client + Third Party' : 'Third Party' })).slice(0, 50) },
      tagsUpdated: tagUpdates.length,
      claims: {
        linkedToDirectory: claimLinks.length,
        clientNamesUnmatched: [...clientsUnmatched].slice(0, 25),
        clientNamesUnmatchedCount: clientsUnmatched.size,
        thirdPartyNamesMatched: thirdPartiesMatched,
        thirdPartyNamesUnmatched: thirdPartyNamesUnmatched.slice(0, 25),
        thirdPartyNamesUnmatchedCount: thirdPartyNamesUnmatched.length,
      },
      possibleDuplicates: possibleDuplicates.slice(0, 40),
      possibleDuplicatesCount: possibleDuplicates.length,
    };

    if (mode !== 'apply') {
      return Response.json({ ...report, applied: false });
    }

    // 1. Tags, and the client records that take in a third party.
    const tagsToWrite = [
      ...tagUpdates.map((u) => mergePatchById.has(u.id) ? { ...u, ...mergePatchById.get(u.id) } : u),
      ...[...mergePatchById.values()].filter((p) => !tagUpdateById.has(p.id)),
    ];
    await bulkUpdate(base44, 'Client', tagsToWrite);

    // 2. Third parties with no matching client become records of their own.
    const created: any[] = [];
    for (let i = 0; i < conversions.length; i += 500) {
      const result = await base44.asServiceRole.entities.Client.bulkCreate(conversions.slice(i, i + 500));
      created.push(...(Array.isArray(result) ? result : []));
    }
    for (const record of created) finalKeyToId.set(key(record.name), record.id);

    // 3. Claims with a client name but no link are tied to the record that matches.
    const linksToWrite = [];
    for (const claim of claims) {
      if (claim.client_id) continue;
      const k = key(claim.client_name);
      const id = k ? finalKeyToId.get(k) : null;
      if (id) linksToWrite.push({ id: claim.id, client_id: id });
    }
    if (linksToWrite.length) await bulkUpdate(base44, 'Claim', linksToWrite);

    // 4. The old third party rows have been taken in, so they go.
    for (let i = 0; i < thirdPartyIdsToRemove.length; i += 100) {
      await base44.asServiceRole.entities.ThirdParty.deleteMany({ id: { $in: thirdPartyIdsToRemove.slice(i, i + 100) } });
    }

    return Response.json({
      ...report,
      applied: true,
      written: {
        tagsAndMerges: tagsToWrite.length,
        recordsCreated: created.length,
        claimsLinked: linksToWrite.length,
        thirdPartyRowsRemoved: thirdPartyIdsToRemove.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}