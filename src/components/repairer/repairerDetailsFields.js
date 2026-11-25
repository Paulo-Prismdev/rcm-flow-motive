// The repairer details questionnaire, section by section. The same list drives the
// public form and the staff review. Keep in step with base44/shared/repairerDetails.ts
// (which fields a repairer may send). Network-only fields — tier, map group, ACG,
// coordinates, portal access — are never asked.

// Keep in step with COURTESY_CAR_TYPES in base44/shared/repairerDetails.ts.
export const COURTESY_CAR_TYPES = [
  'Small car', 'Family car', 'Estate', 'SUV / 4x4', 'Prestige / executive', 'Electric', 'Hybrid',
  'Automatic', '7-seater / MPV', 'Small van', 'Large van',
];
export const COURTESY_CAR_COUNTS = [{ value: '1-5', label: '1–5' }, { value: '6-10', label: '6–10' }, { value: '10+', label: 'More than 10' }];

const IN_HOUSE = [{ value: 'In House', label: 'In house' }, { value: 'Outsourced', label: 'Outsourced' }];

export const REPAIRER_DETAILS_SECTIONS = [
  {
    title: 'Your business',
    fields: [
      { key: 'name', label: 'Business name', required: true },
      { key: 'group_name', label: 'Group (if part of one)' },
      { key: 'company_registration_number', label: 'Companies House number' },
      { key: 'vat_number', label: 'VAT number' },
      { key: 'ico_number', label: 'ICO registration number' },
      { key: 'company_directors', label: 'Director(s)', long: true },
      { key: 'web_address', label: 'Website', type: 'url', placeholder: 'https://' },
    ],
  },
  {
    title: 'Contacts',
    fields: [
      { key: 'contact_name', label: 'Main contact', required: true },
      { key: 'phone', label: 'Landline', type: 'tel' },
      { key: 'mobile_phone', label: 'Mobile', type: 'tel' },
      { key: 'email', label: 'Main email', type: 'email', required: true },
      { key: 'bodyshop_manager', label: 'Bodyshop manager' },
      { key: 'bs_manager_email', label: 'Bodyshop manager email', type: 'email' },
      { key: 'referral_email', label: 'Email for new job referrals', type: 'email', hint: 'Where we send new work' },
      { key: 'accounts_contact', label: 'Accounts contact' },
      { key: 'accounts_email', label: 'Accounts email', type: 'email', hint: 'For invoices and remittances' },
    ],
  },
  {
    title: 'Address and coverage',
    fields: [
      { key: 'address_line_1', label: 'Address line 1', required: true },
      { key: 'address_line_2', label: 'Address line 2' },
      { key: 'town', label: 'Town or city', required: true },
      { key: 'county', label: 'County' },
      { key: 'postcode', label: 'Postcode', required: true, upper: true },
      { key: 'radius_covered', label: 'Radius you cover (miles)', inputMode: 'numeric' },
    ],
  },
  {
    title: 'Repairs and equipment',
    fields: [
      { key: 'audatex_code', label: 'Audatex code' },
      { key: 'bodyshop_management_system', label: 'Bodyshop management system', placeholder: 'e.g. Bodyshop IQ, Autoflow' },
      { key: 'largest_vehicle_repairable', label: 'Largest vehicle you can repair', placeholder: 'e.g. 3.5t van, LWB Sprinter' },
      { key: 'wheel_alignment', label: 'Wheel alignment', options: IN_HOUSE },
      { key: 'adas', label: 'ADAS calibration', options: IN_HOUSE },
      { key: 'jig', label: 'Jig', options: IN_HOUSE },
    ],
  },
  {
    title: 'Courtesy vehicles',
    fields: [
      { key: 'courtesy_cars_offered', label: 'Do you provide courtesy vehicles?', options: [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }] },
      {
        key: 'courtesy_car_count', label: 'Roughly how many do you keep?', showIf: (d) => d.courtesy_cars_offered === 'Yes',
        options: [{ value: '1-5', label: '1–5' }, { value: '6-10', label: '6–10' }, { value: '10+', label: 'More than 10' }],
      },
      {
        key: 'courtesy_car_types', label: 'What types? Tick all that apply', multi: true, showIf: (d) => d.courtesy_cars_offered === 'Yes',
        options: COURTESY_CAR_TYPES.map((t) => ({ value: t, label: t })),
      },
      { key: 'courtesy_car_notes', label: 'Anything else about your courtesy vehicles?', long: true, showIf: (d) => d.courtesy_cars_offered === 'Yes', placeholder: 'e.g. delivered to the customer, age limits, mostly automatics' },
    ],
  },
  {
    title: 'Accreditations',
    fields: [
      { key: 'bs10125_certified', label: 'BS 10125 certified?', options: [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }] },
      { key: 'bs10125_number', label: 'BS 10125 certificate number', showIf: (d) => d.bs10125_certified === 'Yes' },
      { key: 'manufacturer_approvals', label: 'Manufacturer approvals', long: true, placeholder: 'e.g. Ford, VW Group, Tesla' },
      { key: 'insurer_approvals', label: 'Insurer approvals', long: true, placeholder: 'e.g. Aviva, Direct Line' },
    ],
  },
];

export const REPAIRER_DETAILS_FIELDS = REPAIRER_DETAILS_SECTIONS.flatMap((s) => s.fields);
export const fieldLabel = (key) => REPAIRER_DETAILS_FIELDS.find((f) => f.key === key)?.label || key;

/** A value as people read it: lists joined, choices by their label. */
export function displayValue(key, value) {
  if (Array.isArray(value)) return value.join(', ');
  const def = REPAIRER_DETAILS_FIELDS.find((f) => f.key === key);
  return def?.options?.find((o) => o.value === value)?.label || (value == null ? '' : String(value));
}

const ADDRESS_KEYS = ['address_line_1', 'address_line_2', 'town', 'county', 'postcode'];
export const touchesAddress = (changes) => ADDRESS_KEYS.some((k) => k in (changes || {}));
export const fullAddressOf = (rec) => ADDRESS_KEYS.map((k) => rec?.[k]).filter(Boolean).join(', ');
