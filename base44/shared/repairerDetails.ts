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
  'bs10125_number', 'manufacturer_approvals', 'insurer_approvals',
];
const CHOICES: Record<string, string[]> = {
  wheel_alignment: ['In House', 'Outsourced', ''],
  adas: ['In House', 'Outsourced', ''],
  jig: ['In House', 'Outsourced', ''],
  bs10125_certified: ['Yes', 'No', ''],
};
const LONG = new Set(['company_directors', 'manufacturer_approvals', 'insurer_approvals']);

export const REPAIRER_DETAILS_FIELDS = [...TEXT, ...Object.keys(CHOICES)];

/** The values the form opens with: what we already hold. */
export function currentDetails(bodyshop: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of REPAIRER_DETAILS_FIELDS) out[key] = bodyshop?.[key] == null ? '' : String(bodyshop[key]);
  return out;
}

/** The submitted answers, cleaned: unknown fields dropped, text trimmed, choices checked. */
export function cleanDetails(input: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of TEXT) {
    if (input && key in input) out[key] = clip(input[key], LONG.has(key) ? 2000 : 300);
  }
  for (const [key, options] of Object.entries(CHOICES)) {
    if (input && key in input) {
      const v = clip(input[key], 40);
      if (options.includes(v)) out[key] = v;
    }
  }
  if (out.postcode) out.postcode = out.postcode.toUpperCase();
  return out;
}

/** Only what differs from the record (ignoring spacing and case of emails). */
export function changedDetails(bodyshop: any, answers: Record<string, string>): Record<string, string> {
  const norm = (k: string, v: any) => {
    const s = (v == null ? '' : String(v)).trim().replace(/\s+/g, ' ');
    return /email/.test(k) ? s.toLowerCase() : s;
  };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(answers)) {
    if (norm(k, v) !== norm(k, bodyshop?.[k])) out[k] = v;
  }
  return out;
}
