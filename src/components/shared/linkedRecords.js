import { base44 } from '@/api/base44Client';

// ── Keeping linked details in line ──
// A claim keeps its own copy of the contact details of the people and companies on
// it (client, third party, referrer, credit repair company). Those details belong to
// a directory record, so a change made in one place is made everywhere:
//   • edited on a claim  → the directory record and every other claim linked to it
//   • edited in the directory → every claim linked to it
// Only contact details are shared. Things that belong to one claim (insurer, policy
// and claim numbers, vehicles, references) stay with that claim. A blank value never
// wipes a directory record or other claims.

const ADDRESS = (p) => ({
  [`${p}address_line_1`]: 'address_line_1',
  [`${p}address_line_2`]: 'address_line_2',
  [`${p}town`]: 'town',
  [`${p}county`]: 'county',
  [`${p}postcode`]: 'postcode',
});

// claim field → directory record field
export const LINKS = [
  {
    key: 'client', entity: 'Client', idField: 'client_id',
    fields: { client_name: 'name', client_phone: 'phone', client_email: 'email', ...ADDRESS('client_'), client_vat_status: 'vat_status' },
  },
  {
    key: 'thirdParty', entity: 'Client', idField: 'tp_client_id',
    fields: { tp_name: 'name', tp_phone: 'phone', tp_email: 'email', ...ADDRESS('tp_') },
  },
  {
    key: 'referrer', entity: 'Company', idField: 'referrer_id',
    fields: { referrer: 'name', referrer_email: 'contact_email' },
  },
  {
    key: 'creditRepair', entity: 'CreditRepairCompany', idField: 'credit_repair_company_id',
    fields: {
      credit_repair_company_name: 'name', credit_repair_company_contact_name: 'contact_name',
      credit_repair_company_phone: 'phone', credit_repair_company_email: 'email',
      credit_repair_company_account_ref: 'account_reference',
    },
  },
];

const norm = (v) => (v === null || v === undefined ? '' : String(v).trim());
const blank = (v) => norm(v) === '' || norm(v) === 'Unknown';
const same = (a, b) => norm(a).toLowerCase() === norm(b).toLowerCase();
// "UNKNOWN" is a placeholder name, never a person to match on.
const realName = (n) => norm(n) !== '' && norm(n).toUpperCase() !== 'UNKNOWN';

/**
 * A directory record changed: copy the changed contact details onto every claim
 * linked to it. Returns how many claims were changed.
 */
export async function pushRecordToClaims(entityName, id, prior, data) {
  if (!id || !data) return 0;
  let changed = 0;
  for (const link of LINKS.filter((l) => l.entity === entityName)) {
    const patch = {};
    Object.entries(link.fields).forEach(([claimField, recordField]) => {
      if (!(recordField in data) || blank(data[recordField])) return;
      if (prior && recordField in prior && norm(data[recordField]) === norm(prior[recordField])) return;
      patch[claimField] = data[recordField];
    });
    if (!Object.keys(patch).length) continue;

    const differs = { $or: Object.entries(patch).map(([k, v]) => ({ [k]: { $ne: v } })) };
    const targets = [{ query: { $and: [{ [link.idField]: id }, differs] }, extra: {} }];
    // Claims from before third parties were linked: found by the record's name, and linked now.
    if (link.key === 'thirdParty' && realName(prior?.name)) {
      targets.push({
        query: { $and: [{ tp_name: norm(prior.name) }, { $or: [{ tp_client_id: null }, { tp_client_id: '' }] }] },
        extra: { tp_client_id: id },
      });
    }
    for (const { query, extra } of targets) {
      let rows = [];
      try { rows = (await base44.entities.Claim.filter(query, '-created_date', 1000)) || []; } catch { rows = []; }
      if (!rows.length) continue;
      changed += rows.length;
      // Each pass only touches claims that still disagree, so it can't loop forever.
      for (let pass = 0; pass < 20; pass++) {
        const result = await base44.entities.Claim.updateMany(query, { $set: { ...patch, ...extra } });
        if (!result?.has_more) break;
      }
    }
  }
  return changed;
}

/**
 * A claim was saved: any contact detail that changed is written to its directory
 * record, and from there to every other claim linked to that record.
 * Returns { records: [names], claims: n } for a short "also updated" note.
 */
export async function syncClaimEditToRecords(prev, next) {
  const records = [];
  let claims = 0;
  if (!prev || !next) return { records, claims };
  for (const link of LINKS) {
    let id = next[link.idField];
    // Picking a different person or company is a new link, not an edit to share.
    if (id && prev[link.idField] && prev[link.idField] !== id) continue;
    if (id && !prev[link.idField]) continue;

    const changes = {};
    Object.entries(link.fields).forEach(([claimField, recordField]) => {
      if (blank(next[claimField]) || norm(next[claimField]) === norm(prev[claimField])) return;
      changes[recordField] = next[claimField];
    });
    if (!Object.keys(changes).length) continue;

    // An older claim with no third-party link: find its directory record by name, then link it.
    if (!id && link.key === 'thirdParty' && realName(prev.tp_name)) {
      try {
        const found = ((await base44.entities.Client.list('-created_date', 1000)) || []).filter((r) => same(r.name, prev.tp_name));
        const tps = found.filter((r) => r.is_third_party);
        const pick = tps.length === 1 ? tps[0] : found.length === 1 ? found[0] : null;
        if (pick) {
          id = pick.id;
          await base44.entities.Claim.update(next.id, { tp_client_id: id });
        }
      } catch { /* leave it unlinked */ }
    }
    if (!id) continue;

    let record = null;
    try { record = await base44.entities[link.entity].get(id); } catch { record = null; }
    if (!record) continue;

    const recordPatch = {};
    Object.entries(changes).forEach(([field, value]) => { if (norm(record[field]) !== norm(value)) recordPatch[field] = value; });
    if (Object.keys(recordPatch).length) {
      await base44.entities[link.entity].update(id, recordPatch);
      try {
        const { logChanges } = await import('./useActivityLogger');
        logChanges({ parentId: id, parentType: link.entity, oldData: record, newData: recordPatch });
      } catch { /* the log is best-effort */ }
    }
    claims += await pushRecordToClaims(link.entity, id, { name: record.name }, changes);
    records.push(record.name || 'the directory record');
  }
  return { records: [...new Set(records)], claims };
}
