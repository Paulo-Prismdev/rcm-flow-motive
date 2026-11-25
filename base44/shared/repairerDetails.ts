/**
 * The repairer details questionnaire: which Bodyshop fields a repairer may fill in
 * themselves. Network-only fields (tier, map group, ACG, coordinates, portal access)
 * are never on it. Keep in step with src/components/repairer/repairerDetailsFields.js.
 */
import { clip } from './publicLinks.ts';

export const REPAIRER_DETAILS_LINK_DAYS = 30;

const TEXT = [
  'name', 'group_name', 'company_registration_number', 'vat_number', 'ico_number', 'company_directors', 'web_address',
  'contact_name', 'phone', 'mobile_phone', 'email', 'bodyshop_manager', 'bs_manager_email', 'referral_email',
  'accounts_contact', 'accounts_email',
  'address_line_1', 'address_line_2', 'town', 'county', 'postcode', 'radius_covered',
  'audatex_code', 'largest_vehicle_repairable', 'bodyshop_management_system',
  'bs10125_number', 'manufacturer_approvals', 'insurer_approvals', 'courtesy_car_notes',
];
const CHOICES: Record<string, string[]> = {
  wheel_alignment: ['In House', 'Outsourced', ''],
  adas: ['In House', 'Outsourced', ''],
  jig: ['In House', 'Outsourced', ''],
  bs10125_certified: ['Yes', 'No', ''],
  courtesy_cars_offered: ['Yes', 'No', ''],
  courtesy_car_count: ['1-5', '6-10', '10+', ''],
};
// Tick-as-many-as-apply answers.
export const COURTESY_CAR_TYPES = [
  'Small car', 'Family car', 'Estate', 'SUV / 4x4', 'Prestige / executive', 'Electric', 'Hybrid',
  'Automatic', '7-seater / MPV', 'Small van', 'Large van',
];
const MULTI: Record<string, string[]> = { courtesy_car_types: COURTESY_CAR_TYPES };
const LONG = new Set(['company_directors', 'manufacturer_approvals', 'insurer_approvals', 'courtesy_car_notes']);

export const REPAIRER_DETAILS_FIELDS = [...TEXT, ...Object.keys(CHOICES), ...Object.keys(MULTI)];

/** The values the form opens with: what we already hold. */
export function currentDetails(bodyshop: any): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of REPAIRER_DETAILS_FIELDS) {
    out[key] = key in MULTI
      ? (Array.isArray(bodyshop?.[key]) ? bodyshop[key] : [])
      : (bodyshop?.[key] == null ? '' : String(bodyshop[key]));
  }
  return out;
}

/** The submitted answers, cleaned: unknown fields dropped, text trimmed, choices checked. */
export function cleanDetails(input: any): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of TEXT) {
    if (input && key in input) out[key] = clip(input[key], LONG.has(key) ? 2000 : 300);
  }
  for (const [key, options] of Object.entries(CHOICES)) {
    if (input && key in input) {
      const v = clip(input[key], 40);
      if (options.includes(v)) out[key] = v;
    }
  }
  for (const [key, options] of Object.entries(MULTI)) {
    if (input && Array.isArray(input[key])) {
      out[key] = options.filter((o) => input[key].includes(o));
    }
  }
  // No courtesy cars: nothing else about them applies.
  if (out.courtesy_cars_offered === 'No') {
    out.courtesy_car_count = '';
    out.courtesy_car_types = [];
    out.courtesy_car_notes = '';
  }
  if (out.postcode) out.postcode = out.postcode.toUpperCase();
  return out;
}

/** Only what differs from the record (ignoring spacing and case of emails). */
export function changedDetails(bodyshop: any, answers: Record<string, any>): Record<string, any> {
  const norm = (k: string, v: any) => {
    if (k in MULTI) return JSON.stringify([...(Array.isArray(v) ? v : [])].sort());
    const s = (v == null ? '' : String(v)).trim().replace(/\s+/g, ' ');
    return /email/.test(k) ? s.toLowerCase() : s;
  };
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(answers)) {
    if (norm(k, v) !== norm(k, bodyshop?.[k])) out[k] = v;
  }
  return out;
}
