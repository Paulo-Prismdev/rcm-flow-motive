import { COURTESY_CAR_OPTIONS } from '@/components/shared/courtesyCarOptions';
import { normaliseDate, toNum } from '@/components/claims/financials/invoiceReview';

/**
 * The claim details the instruction reader is asked for, and how what comes back
 * lands on the claim. Every value is only carried onto the claim where the
 * instruction actually stated it — an empty reading leaves the field alone.
 */

export const INTAKE_GROUPS = [
  {
    key: 'incident',
    label: 'Incident',
    fields: [
      { key: 'reg', label: 'Registration' },
      { key: 'loss_date', label: 'Date of loss', type: 'date' },
      { key: 'loss_time', label: 'Time of loss', type: 'time' },
      { key: 'incident_location', label: 'Where it happened' },
      { key: 'vehicle_use', label: 'Vehicle use', type: 'select', options: ['Business', 'Social', 'Commuting'] },
      { key: 'circumstances', label: 'What happened', type: 'textarea' },
    ],
  },
  {
    key: 'vehicle',
    label: 'Vehicle',
    fields: [
      { key: 'make_model', label: 'Make & model' },
      { key: 'vehicle_location', label: 'Vehicle is now' },
      { key: 'vehicle_damage', label: 'Damage', type: 'textarea' },
      { key: 'vehicle_driveable', label: 'Driveable', type: 'yesno' },
      { key: 'recovery_required', label: 'Recovery needed', type: 'yesno' },
      { key: 'courtesy_car_required', label: 'Courtesy car', type: 'select', options: COURTESY_CAR_OPTIONS },
    ],
  },
  {
    key: 'client',
    label: 'Client',
    fields: [
      { key: 'client_name', label: 'Name' },
      { key: 'client_phone', label: 'Phone' },
      { key: 'client_email', label: 'Email' },
      { key: 'client_address_line_1', label: 'Address 1' },
      { key: 'client_address_line_2', label: 'Address 2' },
      { key: 'client_town', label: 'Town' },
      { key: 'client_county', label: 'County' },
      { key: 'client_postcode', label: 'Postcode' },
      { key: 'client_vat_status', label: 'VAT status', type: 'select', options: ['VAT Registered', 'Non-VAT'] },
    ],
  },
  {
    key: 'driver',
    label: 'Driver',
    fields: [
      { key: 'driver_name', label: 'Name' },
      { key: 'driver_phone', label: 'Phone' },
      { key: 'driver_email', label: 'Email' },
      { key: 'driver_address_line_1', label: 'Address 1' },
      { key: 'driver_address_line_2', label: 'Address 2' },
      { key: 'driver_town', label: 'Town' },
      { key: 'driver_county', label: 'County' },
      { key: 'driver_postcode', label: 'Postcode' },
    ],
  },
  {
    key: 'insurance',
    label: 'Insurance',
    fields: [
      { key: 'insurer', label: 'Insurer' },
      { key: 'claim_ref', label: 'Claim reference' },
      { key: 'policy_number', label: 'Policy number' },
      { key: 'policy_excess', label: 'Policy excess', type: 'excess' },
    ],
  },
  {
    key: 'thirdparty',
    label: 'Third party',
    fields: [
      { key: 'tp_name', label: 'Name' },
      { key: 'tp_phone', label: 'Phone' },
      { key: 'tp_email', label: 'Email' },
      { key: 'tp_address_line_1', label: 'Address 1' },
      { key: 'tp_address_line_2', label: 'Address 2' },
      { key: 'tp_town', label: 'Town' },
      { key: 'tp_county', label: 'County' },
      { key: 'tp_postcode', label: 'Postcode' },
      { key: 'tp_reg', label: 'Their registration' },
      { key: 'tp_make_model', label: 'Their vehicle' },
      { key: 'tp_insurer', label: 'Their insurer' },
      { key: 'tp_claim_ref', label: 'Their claim ref' },
      { key: 'tp_policy_number', label: 'Their policy no.' },
      { key: 'tp_vehicle_damage', label: 'Their damage', type: 'textarea' },
    ],
  },
  {
    key: 'referrer',
    label: 'Referrer',
    fields: [
      { key: 'referrer', label: 'Referrer' },
      { key: 'referrer_ref', label: 'Their reference' },
    ],
  },
];

export const INTAKE_FIELDS = INTAKE_GROUPS.flatMap((group) => group.fields.map((field) => ({ ...field, group: group.key })));
export const INTAKE_KEYS = INTAKE_FIELDS.map((field) => field.key);

const DRIVER_KEYS = [
  'driver_name', 'driver_phone', 'driver_email',
  'driver_address_line_1', 'driver_address_line_2', 'driver_town', 'driver_county', 'driver_postcode',
];

export const isBlank = (value) => value === null || value === undefined || value === '';

/** The values the review screen starts with: dates tidied, the excess split out. */
export function intakeValues(fields = {}) {
  const values = {};
  for (const field of INTAKE_FIELDS) {
    const value = fields[field.key];
    if (field.type === 'excess') {
      const excess = excessFromReading(value);
      values.policy_excess = excess.amount;
      values.excess_waived = excess.waived;
      continue;
    }
    if (field.type === 'date') values[field.key] = normaliseDate(value);
    else values[field.key] = isBlank(value) ? '' : String(value).trim();
  }
  return values;
}

/**
 * What the excess reads as. The reading comes back as an amount, the word
 * "waived", or nothing at all — and nothing at all means unanswered, never £0.
 */
export function excessFromReading(value) {
  const text = String(value ?? '').trim();
  if (!text) return { amount: '', waived: false };
  const amount = toNum(text);
  if (amount !== null && amount > 0) return { amount: String(amount), waived: false };
  return { amount: '', waived: true };
}

/** Values the reader was not sure of, and so need ticking off before they are used. */
export function intakeNeedsCheck(values, confidence) {
  return INTAKE_KEYS.filter((key) => !isBlank(values[key]) && confidence?.[key] !== 'high');
}

export const hasDriver = (values) => DRIVER_KEYS.some((key) => !isBlank(values[key]));

/**
 * The claim patch for the details the user accepted on the review screen.
 * Only answered values are carried across, so anything the reading left out
 * stays exactly as the form has it.
 */
export function intakePatch({ values = {}, claimType = '', dvla = {}, tpDvla = {} }) {
  const patch = {};

  for (const field of INTAKE_FIELDS) {
    const value = values[field.key];
    if (isBlank(value)) continue;

    // The driver is held on the claim's own contact fields, set below.
    if (DRIVER_KEYS.includes(field.key)) continue;
    if (field.key === 'policy_excess') continue; // handled below
    if (field.key === 'vehicle_driveable') {
      patch.unroadworthy = value === 'no';
      continue;
    }
    if (field.type === 'yesno') {
      patch[field.key] = value === 'yes';
      continue;
    }
    if (field.type === 'select' && field.options && !field.options.includes(value)) continue;
    patch[field.key] = value;
  }

  // The driver goes on the claim's own driver contact fields, whether or not they
  // turn out to be the client (the client choice decides that separately).
  if (hasDriver(values)) {
    patch.driver_contact_name = values.driver_name || '';
    patch.driver_contact_phone = values.driver_phone || '';
    patch.driver_contact_email = values.driver_email || '';
    patch.driver_contact_address_line_1 = values.driver_address_line_1 || '';
    patch.driver_contact_address_line_2 = values.driver_address_line_2 || '';
    patch.driver_contact_town = values.driver_town || '';
    patch.driver_contact_county = values.driver_county || '';
    patch.driver_contact_postcode = values.driver_postcode || '';
    patch.driver_same_as_client = false;
  }

  if (values.excess_waived) {
    patch.policy_excess = 0;
    patch.excess_tbc = false;
  } else if (!isBlank(values.policy_excess)) {
    patch.policy_excess = toNum(values.policy_excess);
    patch.excess_tbc = false;
  }

  if (claimType) patch.claim_type = claimType;

  Object.entries(dvla || {}).forEach(([key, value]) => {
    if (isBlank(value)) return;
    patch[key] = value;
  });
  Object.entries(tpDvla || {}).forEach(([key, value]) => {
    if (isBlank(value)) return;
    patch[key] = value;
  });

  return patch;
}

/** Rows the reading found something for, so empty groups can be left out. */
export function groupsWithValues(values) {
  return INTAKE_GROUPS.filter((group) => group.fields.some((field) => !isBlank(values[field.key])));
}