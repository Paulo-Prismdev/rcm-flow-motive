/**
 * Reading a repairer spreadsheet into directory records.
 *
 * The rules live here so the preview and the save always agree:
 *  - a spreadsheet value only ever fills a field, it never blanks one;
 *  - headings are matched by meaning, so Name / Repairer / Bodyshop all work,
 *    as do Town / Location / Area;
 *  - a postcode column wins, otherwise the postcode comes out of the address
 *    and is formatted properly (B66 2EH);
 *  - names are compared ignoring the things people vary (Ltd, &, spacing,
 *    case) and the postcode breaks any tie.
 */

export type ColumnMap = Record<string, string>;

export const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  full_address: 'Address',
  town: 'Town',
  county: 'County',
  postcode: 'Postcode',
  group_name: 'Group',
  map_group: 'Map group',
  contact_name: 'Contact',
  bodyshop_manager: 'Repairer manager',
  phone: 'Phone',
  mobile_phone: 'Mobile',
  email: 'Email',
  bs_manager_email: 'Manager email',
  referral_email: 'Referral email',
  accounts_contact: 'Accounts contact',
  accounts_email: 'Accounts email',
  web_address: 'Website',
  acg_signed_up: 'Signed up to ACG',
  tier: 'Tier',
  company_registration_number: 'Company registration no.',
  company_directors: 'Directors',
  radius_covered: 'Radius covered',
  audatex_code: 'Audatex code',
  bs10125_certified: 'BS10125',
  bs10125_number: 'BS10125 number',
  ico_number: 'ICO number',
  vat_number: 'VAT number',
  largest_vehicle_repairable: 'Largest vehicle',
  bodyshop_management_system: 'Management system',
  wheel_alignment: 'Wheel alignment',
  adas: 'ADAS',
  jig: 'JIG',
  manufacturer_approvals: 'Manufacturer approvals',
  insurer_approvals: 'Insurer approvals',
  latitude: 'Map latitude',
  longitude: 'Map longitude',
};

// Fields whose change is not worth listing in the preview (the map pin moves).
const SILENT_FIELDS = new Set(['latitude', 'longitude']);

// An import never renames a repairer it has matched: a spreadsheet's spelling of
// the name (no "Ltd", say) is a match, not an improvement on the directory.
const NEVER_REWRITE = new Set(['name']);

// Headings, in the order columns are claimed. A heading is normalised first:
// lower case, punctuation turned into single spaces.
const COLUMN_SYNONYMS: [string, string[]][] = [
  ['name', ['name', 'repairer', 'repairer name', 'bodyshop', 'bodyshop name', 'company', 'company name', 'site', 'site name', 'business name', 'garage', 'garage name']],
  ['postcode', ['postcode', 'post code', 'postal code', 'post code zip', 'post code zip code', 'zip', 'zip code', 'pcode']],
  ['map_group', ['map group', 'mapgroup', 'map group assignment', 'mapgroup assignment', 'map grouping', 'map']],
  ['group_name', ['group', 'group name', 'groups', 'repairer group', 'network group', 'network', 'grouping']],
  ['town', ['town', 'location', 'area', 'town area', 'town or city', 'city', 'town city', 'location town']],
  ['full_address', ['full address', 'address', 'street address', 'address 1', 'address line 1', 'address line1']],
  ['county', ['county']],
  ['mobile_phone', ['mobile', 'mobile phone', 'mobile number', 'phone mobile', 'phone mobile number']],
  ['phone', ['phone', 'telephone', 'tel', 'landline', 'phone landline', 'phone number', 'main phone', 'telephone number', 'contact number']],
  ['email', ['email', 'main email', 'email address', 'e mail', 'contact email', 'main contact email']],
  ['contact_name', ['contact', 'contact name', 'main contact', 'contact person', 'main contact name']],
  ['bodyshop_manager', ['bodyshop manager', 'bs manager', 'manager', 'bodyshop manager name', 'bs manager name']],
  ['bs_manager_email', ['bs manager email', 'bodyshop manager email', 'manager email']],
  ['referral_email', ['referral email', 'referrals email']],
  ['accounts_contact', ['accounts contact', 'accounts contact name']],
  ['accounts_email', ['accounts email', 'accounts email address']],
  ['web_address', ['web address', 'website', 'web site', 'url']],
  ['acg_signed_up', ['signed up to acg', 'acg', 'acg signed up', 'signed up acg']],
  ['tier', ['tier', 'network tier']],
  ['company_registration_number', ['company registration number', 'company number', 'companies house number']],
  ['company_directors', ['company director s', 'company directors', 'director s', 'directors']],
  ['radius_covered', ['radius covered miles', 'radius covered', 'radius']],
  ['audatex_code', ['audatex code', 'audatex']],
  ['bs10125_certified', ['do you have bs10125', 'bs10125', 'bs10125 certified', 'bs 10125']],
  ['bs10125_number', ['if yes please provide number', 'bs10125 number', 'bs10125 certification number']],
  ['ico_number', ['ico number', 'ico']],
  ['vat_number', ['vat number', 'vat']],
  ['largest_vehicle_repairable', ['what is the largest vehicle you are able to repair', 'largest vehicle', 'largest vehicle repairable', 'largest vehicle you can repair']],
  ['bodyshop_management_system', ['what bodyshop management system do you use', 'bodyshop management system', 'management system']],
  ['wheel_alignment', ['wheel alignement', 'wheel alignment']],
  ['adas', ['adas']],
  ['jig', ['jig']],
  ['manufacturer_approvals', ['manufacturer approvals', 'manufacturer approval']],
  ['insurer_approvals', ['insurer approvals', 'insurer approval']],
];

// Fields the loose (word-contained) pass is allowed to fill.
const LOOSE_FIELDS = ['name', 'postcode', 'town', 'county', 'group_name', 'map_group', 'email', 'phone', 'mobile_phone', 'contact_name', 'full_address'];

const normHeader = (h: unknown) => String(h ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function detectColumns(headers: string[]): ColumnMap {
  const entries = headers.map((h, i) => ({ raw: h, key: normHeader(h), i })).filter((e) => e.key);
  const columns: ColumnMap = {};
  const claimed = new Set<number>();

  for (const [field, synonyms] of COLUMN_SYNONYMS) {
    const hit = entries.find((e) => !claimed.has(e.i) && synonyms.includes(e.key));
    if (hit) {
      columns[field] = hit.raw;
      claimed.add(hit.i);
    }
  }

  for (const field of LOOSE_FIELDS) {
    if (columns[field]) continue;
    const synonyms = COLUMN_SYNONYMS.find(([f]) => f === field)?.[1] || [];
    const hit = entries.find(
      (e) => !claimed.has(e.i) && synonyms.some((s) => ` ${e.key} `.includes(` ${s} `)),
    );
    if (hit) {
      columns[field] = hit.raw;
      claimed.add(hit.i);
    }
  }

  return columns;
}

// ── values ────────────────────────────────────────────────────────────────

const cleanText = (v: unknown) => {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  if (!s) return '';
  if (/^(n\/?a|n\.a\.|none|null|-{1,2}|—)$/i.test(s)) return '';
  return s;
};

const yesNoEnum = (v: string) => {
  const s = v.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!s) return '';
  if (['yes', 'y', 'true', 'signed up'].includes(s)) return 'Yes';
  if (['no', 'n', 'false', 'not signed up'].includes(s)) return 'No';
  if (['tbc', 'to be confirmed', 'to confirm'].includes(s)) return 'TBC';
  return '';
};

const capabilityEnum = (v: string) => {
  const s = v.toLowerCase().replace(/[\s-]+/g, ' ').trim();
  if (!s) return '';
  if (['in house', 'inhouse', 'yes'].includes(s)) return 'In House';
  if (['outsourced', 'outsource', 'external'].includes(s)) return 'Outsourced';
  return '';
};

const mapGroupValue = (v: string) => {
  const s = v.toLowerCase().replace(/\s+/g, ' ').trim();
  if (s === 'qac') return 'QAC';
  if (s === 'solution') return 'Solution';
  return '';
};

export function formatPostcode(raw: string) {
  const s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!s) return '';
  if (/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(s)) return `${s.slice(0, -3)} ${s.slice(-3)}`;
  return '';
}

export function extractPostcode(text: string) {
  const m = String(text || '').toUpperCase().match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/);
  return m ? formatPostcode(m[1]) : '';
}

const TEXT_FIELDS = [
  'name', 'contact_name', 'bodyshop_manager', 'phone', 'mobile_phone', 'email',
  'bs_manager_email', 'referral_email', 'accounts_contact', 'accounts_email',
  'web_address', 'company_registration_number', 'company_directors',
  'radius_covered', 'audatex_code', 'bs10125_number', 'ico_number', 'vat_number',
  'largest_vehicle_repairable', 'bodyshop_management_system',
  'manufacturer_approvals', 'insurer_approvals', 'tier', 'group_name',
  'county', 'town', 'full_address',
];

/** One spreadsheet row → directory fields, with blanks left out entirely. */
export function mapRow(row: Record<string, unknown>, columns: ColumnMap) {
  const raw = (field: string) => (columns[field] ? cleanText(row[columns[field]]) : '');
  const values: Record<string, string> = {};

  for (const field of TEXT_FIELDS) {
    const v = raw(field);
    if (v) values[field] = v;
  }

  const postcode = formatPostcode(raw('postcode')) || extractPostcode(values.full_address || '');
  if (postcode) values.postcode = postcode;

  let mapGroup = mapGroupValue(raw('map_group'));
  if (!mapGroup) mapGroup = mapGroupValue(values.group_name || '');
  if (mapGroup) values.map_group = mapGroup;

  const acg = yesNoEnum(raw('acg_signed_up'));
  if (acg) values.acg_signed_up = acg;

  const bs = yesNoEnum(raw('bs10125_certified'));
  if (bs) values.bs10125_certified = bs;

  const wheel = capabilityEnum(raw('wheel_alignment'));
  if (wheel) values.wheel_alignment = wheel;
  const adas = capabilityEnum(raw('adas'));
  if (adas) values.adas = adas;
  const jig = capabilityEnum(raw('jig'));
  if (jig) values.jig = jig;

  return values;
}

// ── matching ──────────────────────────────────────────────────────────────

const NAME_NOISE = new Set(['ltd', 'limited', 'plc', 'llp', 'co', 'company', 'the', 'uk']);

export function matchNameKey(name: string) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && !NAME_NOISE.has(w))
    .join(' ');
}

export const postcodeKey = (pc: string) => String(pc || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function levenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j += 1) prev[j] = j;
  for (let i = 1; i <= m; i += 1) {
    cur[0] = i;
    for (let j = 1; j <= n; j += 1) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

export function similarity(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const sortedA = a.split(' ').sort().join(' ');
  const sortedB = b.split(' ').sort().join(' ');
  if (sortedA === sortedB) return 1;
  const ratio = (x: string, y: string) => 1 - levenshtein(x, y) / Math.max(x.length, y.length);
  return Math.max(ratio(a, b), ratio(sortedA, sortedB));
}

export type PlannedRow = {
  row: number;
  values: Record<string, string>;
  action: 'create' | 'update' | 'possible';
  match?: { id: string; name: string; postcode: string; town: string };
  reason?: string;
  confidence?: number;
};

/**
 * Decide, for every row, whether it is new, an existing repairer to bring up to
 * date, or something the user should confirm first.
 */
export function buildImportPlan({ rows, columns, existing }: { rows: Record<string, unknown>[]; columns: ColumnMap; existing: any[] }) {
  const byKey = new Map<string, any[]>();
  for (const record of existing) {
    const key = matchNameKey(record?.name || '');
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(record);
  }

  const planned: PlannedRow[] = [];
  let skipped = 0;

  rows.forEach((row, index) => {
    const values = mapRow(row, columns);
    if (!values.name) {
      skipped += 1;
      return;
    }

    const key = matchNameKey(values.name);
    const pcKey = postcodeKey(values.postcode);

    let candidates = (byKey.get(key) || []).map((record) => ({ record, score: 1 }));
    if (candidates.length === 0) {
      candidates = existing
        .map((record) => ({ record, score: similarity(key, matchNameKey(record?.name || '')) }))
        .filter((c) => c.score >= 0.72)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    }

    if (candidates.length === 0) {
      planned.push({ row: index + 2, values, action: 'create' });
      return;
    }

    const best = candidates[0];
    const other = candidates[1];
    const match = {
      id: best.record.id,
      name: best.record.name || '',
      postcode: best.record.postcode || '',
      town: best.record.town || '',
    };
    const candidatePc = postcodeKey(best.record.postcode);
    const pcConfirms = !!pcKey && !!candidatePc && pcKey === candidatePc;
    const pcClashes = !!pcKey && !!candidatePc && pcKey !== candidatePc;
    const exactName = best.score === 1;

    if (other) {
      planned.push({
        row: index + 2, values, action: 'possible', match, confidence: best.score,
        reason: `More than one repairer in the directory could be this one (also "${other.record.name}").`,
      });
      return;
    }
    if (pcConfirms || (exactName && !pcClashes)) {
      planned.push({ row: index + 2, values, action: 'update', match, confidence: 1 });
      return;
    }
    if (pcClashes) {
      planned.push({
        row: index + 2, values, action: 'possible', match, confidence: best.score,
        reason: `The name matches but the postcode is different${match.postcode ? ` (directory has ${match.postcode})` : ''}.`,
      });
      return;
    }
    planned.push({
      row: index + 2, values, action: 'possible', match, confidence: best.score,
      reason: 'The name is close but not identical, and there is no postcode to confirm it.',
    });
  });

  return { planned, skipped };
}

// ── changes ───────────────────────────────────────────────────────────────

const sameValue = (a: unknown, b: unknown) => {
  const left = a === null || a === undefined ? '' : String(a).trim().toLowerCase();
  const right = b === null || b === undefined ? '' : String(b).trim().toLowerCase();
  return left === right;
};

export type Change = { field: string; label: string; from: string; to: string };

/** The fields that genuinely differ, ready to write. Blanks are never written. */
export function diffForUpdate(existing: any, values: Record<string, unknown>) {
  const changes: Change[] = [];
  const fields: Record<string, unknown> = {};

  for (const [field, to] of Object.entries(values)) {
    if (to === null || to === undefined || String(to).trim() === '') continue;
    if (NEVER_REWRITE.has(field)) continue;
    const from = existing?.[field];
    if (sameValue(from, to)) continue;
    fields[field] = to;
    if (!SILENT_FIELDS.has(field)) {
      changes.push({
        field,
        label: FIELD_LABELS[field] || field,
        from: from === null || from === undefined ? '' : String(from),
        to: String(to),
      });
    }
  }

  return { changes, fields };
}