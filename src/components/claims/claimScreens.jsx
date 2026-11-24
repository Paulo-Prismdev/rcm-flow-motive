// What each claim screen shows, card by card. The layout lives in ClaimFieldCards.jsx;
// this file only says which fields go where, so moving a field is a one-line change.
import { COURTESY_CAR_OPTIONS } from '../shared/courtesyCarOptions';
import { hireInvoicedSwitch, hireInvoicedPatch, hireSummaryText } from '../shared/hireCharge';
import { excessLabel } from '../shared/excessState';
import { COVERED_BY_OPTIONS, contributionRoute, payeeDetails, viaRepairerShare } from '../shared/excessContribution';
import { fmtDate, fmtMoney, joinLines } from './ClaimFieldCards';
import { formatAuthorisingParty } from '../shared/authorisingParty';

export const CLAIM_TYPES = [
  'Fault Claim', 'Non-Fault - Own Insurer', '3rd Party Insurer Direct', '3rd Party Paying Privately',
  'Credit Repair', 'Glass Claim', 'Paying Privately',
];

const address = (prefix, label = 'Address') => ({
  key: `${prefix}address`,
  label,
  display: (c) => joinLines(
    c[`${prefix}address_line_1`], c[`${prefix}address_line_2`],
    [c[`${prefix}town`], c[`${prefix}county`]].filter(Boolean).join(', '), c[`${prefix}postcode`],
  ),
  multiline: true,
  group: [
    { key: `${prefix}address_line_1`, label: 'Address line 1' },
    { key: `${prefix}address_line_2`, label: 'Address line 2' },
    { key: `${prefix}town`, label: 'Town' },
    { key: `${prefix}county`, label: 'County' },
    { key: `${prefix}postcode`, label: 'Postcode', upper: true },
  ],
});

// Picking a client record fills the claim's client details from it (as the old form did).
const clientPick = (client) => {
  if (!client) return { client_id: '', client_name: '' };
  const contacts = client.contacts || [];
  const primary = contacts.find((c) => c.is_primary) || contacts[0] || null;
  return {
    client_id: client.id,
    client_name: client.name,
    client_phone: client.phone || primary?.phone || client.company_contact_phone || '',
    client_email: client.email || primary?.email || client.company_contact_email || '',
    client_address_line_1: client.address_line_1 || '',
    client_address_line_2: client.address_line_2 || '',
    client_town: client.town || '',
    client_county: client.county || '',
    client_postcode: client.postcode || '',
    business_division: '',
  };
};

const hireField = {
  key: 'hire_invoiced_switch',
  label: 'Hire to invoice',
  type: 'yesno',
  value: (c) => hireInvoicedSwitch(c),
  display: (c) => hireSummaryText(c),
  patch: (v, c) => hireInvoicedPatch(c, v) || {},
  editHint: 'Day rate and days are set in Financials.',
};

const courtesyField = {
  key: 'courtesy_car_required',
  label: 'Courtesy car needed',
  type: 'select',
  options: COURTESY_CAR_OPTIONS,
  value: (c) => (c.courtesy_car_required === true ? 'Yes' : (c.courtesy_car_required || 'No')),
};

export const overviewCards = (claim) => [
  {
    title: 'Claim',
    fields: [
      { key: 'reg', label: 'Registration', upper: true },
      { key: 'claim_type', label: 'Claim type', type: 'select', options: CLAIM_TYPES },
      { key: 'job_status', label: 'Job status', readOnly: true, hint: 'Changed from Updates & status' },
      { key: 'date_received', label: 'Date received', type: 'date' },
      { key: 'created_date', label: 'Added to the system', readOnly: true, display: (c) => fmtDate(c.created_date) },
    ],
  },
  {
    title: 'Accident',
    fields: [
      { key: 'loss_date', label: 'Date of loss', type: 'date' },
      { key: 'loss_time', label: 'Time of loss', placeholder: 'HH:MM', optional: true },
      { key: 'vehicle_use', label: 'Use of vehicle', type: 'select', options: ['Business', 'Social', 'Commuting'] },
      { key: 'incident_location', label: 'Location' },
      { key: 'circumstances', label: 'Circumstances', type: 'textarea' },
    ],
  },
];

export const insuranceCards = (claim, { ExcessForm }) => {
  const route = contributionRoute(claim);
  const applies = route !== 'none';
  const share = viaRepairerShare(claim);
  const payee = payeeDetails(claim);
  // The payment to the client is tracked in Financials, on its own invoice item.
  const payment = claim.invoice_tracker?.items?.excess_contribution_payment || {};
  const ex = { form: ExcessForm };
  return [
    {
      title: "Client's policy",
      fields: [
        { key: 'insurer', label: 'Insurer', type: 'insurer' },
        { key: 'broker_name', label: 'Broker', type: 'broker', idKey: 'broker_id', nameKey: 'broker_name', optional: true },
        { key: 'claim_ref', label: 'Claim reference' },
        { key: 'policy_number', label: 'Policy number' },
        { key: 'policy_excess', label: 'Policy excess', type: 'excess', display: (c) => excessLabel(c) },
      ],
    },
    {
      title: 'Excess contribution',
      fields: [
        { ...ex, key: 'excess_contribution_method', label: 'Applicable?', display: () => (applies ? 'Yes' : 'No') },
        { ...ex, key: 'excess_contribution_amount', label: 'Amount', hidden: !applies, display: (c) => fmtMoney(c.excess_contribution_amount) },
        { ...ex, key: 'excess_contribution_how', label: 'How it reaches the client', hidden: !applies, display: () => (route === 'direct' ? 'We pay the client directly' : 'The repairer takes less excess') },
        {
          ...ex, key: 'excess_contribution_covered_by', label: 'Who covers it', hidden: route !== 'via_repairer',
          display: () => (!share.decided ? '' : share.coveredBy === 'Split'
            ? `Shared — us ${fmtMoney(share.ours)} (off the referral fee), repairer ${fmtMoney(share.repairers)}`
            : COVERED_BY_OPTIONS.find((o) => o.value === share.coveredBy)?.short || ''),
        },
        {
          ...ex, key: 'excess_contribution_payee_name', label: 'Pay to', hidden: route !== 'direct', optional: true, multiline: true,
          display: () => (payee.complete
            ? joinLines(payee.name, `${payee.sortCode} · ${payee.accountNumber}`, payee.reference ? `Ref ${payee.reference}` : '')
            : ''),
        },
        {
          ...ex, key: 'excess_contribution_payment', label: 'Paid to client', hidden: route !== 'direct', readOnly: true,
          display: () => (payment.paid ? `Yes${payment.paid_date ? ` — ${fmtDate(payment.paid_date)}` : ''}` : 'Not yet — mark it paid in Financials'),
        },
        { ...ex, key: 'excess_contribution_notes', label: 'Notes', hidden: !applies, optional: true, multiline: true },
      ],
    },
  ];
};

export const datesCards = (claim, { totalLoss, isRectification }) => {
  const d = (key, label, extra = {}) => ({ key, label, type: 'date', optional: true, ...extra });
  const rectSet = ['rectification_booking_in_date', 'rectification_completion_date', 'rectification_hand_over_date'].some((k) => claim[k]);
  return [
    {
      title: 'Estimate & authority',
      fields: [
        d('estimate_completed', 'Estimate completed'),
        d('supplementary_estimate_completed', 'Supplementary estimate'),
        d('authority_received', 'Authority received'),
        d('supplementary_authority_received', 'Supplementary authority'),
        d('final_authority_received', 'Final authority'),
      ],
    },
    {
      title: 'Repair',
      fields: [
        d('bs_instructed', 'Bodyshop instructed'),
        d('booking_in_date', 'Booking in (BID)'),
        d('on_site_date', 'On site'),
        d('ecd', 'Est. completion (ECD)'),
        d('completion_date', 'Repair completed'),
        d('hand_over_date', 'Handed back'),
      ],
    },
    {
      title: 'Claim',
      fields: [
        d('date_received', 'Date received', { optional: false }),
        d('salvage_collected_date', 'Salvage collected', { hidden: !totalLoss }),
        d('total_loss_marked_date', 'Total loss marked', { hidden: !totalLoss }),
        d('claim_complete_date', 'Claim complete'),
      ],
    },
    {
      title: 'Rectification',
      hidden: !isRectification && !rectSet,
      fields: [
        d('rectification_booking_in_date', 'Booking in', { readOnly: !isRectification }),
        d('rectification_completion_date', 'Completed', { readOnly: !isRectification }),
        d('rectification_hand_over_date', 'Handed back', { readOnly: !isRectification }),
      ],
    },
  ];
};

export const estimateCards = (claim, { networkCodes = [], insurerName = '' } = {}) => {
  const several = networkCodes.length > 1;
  const codeHint = (c) => {
    if (!insurerName) return undefined;
    if (!networkCodes.length) return `No network code for ${insurerName} in the insurer directory`;
    const code = String(c.audatex_code || '').trim().toUpperCase();
    if (networkCodes.some((n) => n.toUpperCase() === code)) return `From the insurer directory (${insurerName})`;
    return several ? `Directory codes for ${insurerName}: ${networkCodes.join(', ')}` : `Directory code for ${insurerName}: ${networkCodes[0]}`;
  };
  const gross = (key) => (v) => ({ [key]: v, [`${key.replace('_net', '_gross')}`]: v == null ? null : +(v * 1.2).toFixed(2) });
  return [
    {
      title: 'Figures',
      fields: [
        { key: 'estimate_cost_net', label: 'Estimate (net)', type: 'currency', patch: gross('estimate_cost_net') },
        { key: 'estimate_cost_gross', label: 'Estimate (gross)', type: 'currency', readOnly: true, hint: 'Net + VAT' },
        { key: 'authority_cost_net', label: 'Authority (net)', type: 'currency', patch: gross('authority_cost_net'), optional: true },
        { key: 'authority_cost_gross', label: 'Authority (gross)', type: 'currency', readOnly: true, hint: 'Net + VAT' },
        { key: 'est_fee', label: 'Estimate fee', type: 'currency', optional: true },
      ],
    },
    {
      title: 'Estimate details',
      fields: [
        {
          key: 'authorising_party', label: 'Authorising party', readOnly: true,
          display: (c) => formatAuthorisingParty(c) || c.authorising_party || '',
        },
        {
          key: 'audatex_code', label: 'Audatex network code', optional: true, upper: true,
          hint: codeHint, suggestions: networkCodes,
          editHint: several ? 'This insurer has more than one network code — tap the one for this job.' : networkCodes.length ? 'Filled in from the insurer directory. Change it here if this job needs a different code.' : undefined,
        },
        { key: 'send_estimate_email', label: 'Email estimate to', type: 'email', optional: true },
        { key: 'artura_est_url', label: 'Artura estimate', optional: true, href: (c) => c.artura_est_url || undefined, display: (c) => (c.artura_est_url ? 'Open estimate' : '') },
      ],
    },
  ];
};

export const clientCards = (claim, { linkedClient }) => {
  const claimVat = claim.client_vat_status && claim.client_vat_status !== 'Unknown' ? claim.client_vat_status : null;
  return [
    {
      title: 'Contact',
      fields: [
        { key: 'client_name', label: 'Name', type: 'client', patch: (c) => clientPick(c), display: (c) => c.client_name || linkedClient?.name || '', editHint: 'Pick the client record — their details fill in from it.' },
        { key: 'client_phone', label: 'Phone', type: 'tel', display: (c) => c.client_phone || linkedClient?.phone || '' },
        { key: 'client_email', label: 'Email', type: 'email', display: (c) => c.client_email || linkedClient?.email || '' },
        { key: 'client_vat_status', label: 'VAT status', type: 'select', options: ['VAT Registered', 'Non-VAT', 'Unknown'], display: () => claimVat || linkedClient?.vat_status || 'Unknown' },
        { key: 'business_division', label: 'Business division', optional: true },
        { key: 'client_ref', label: 'Client ref', readOnly: true, hidden: !claim.client_ref },
      ],
    },
    { title: 'Address', fields: [address('client_')] },
  ];
};

export const driverCards = (claim) => {
  const same = claim.driver_same_as_client !== false;
  return [
    {
      title: 'Repair contact',
      before: <p className="px-4 pb-2 -mt-1 text-xs text-muted-foreground">The person the repairer contacts for drop-off, updates and collection.</p>,
      fields: [
        // Read from the claim it is given — the edit box passes the claim with the choice
        // being made applied — so picking No shows No (unset still reads as Yes).
        { key: 'driver_same_as_client', label: 'Same as client', type: 'bool', value: (c) => c.driver_same_as_client !== false },
        { key: 'driver_contact_name', label: 'Name', hidden: same },
        { key: 'driver_contact_phone', label: 'Phone', type: 'tel', hidden: same },
        { key: 'driver_contact_email', label: 'Email', type: 'email', hidden: same, optional: true },
        { key: 'same_name', label: 'Name', readOnly: true, hidden: !same, display: (c) => c.client_name, hint: 'From client details' },
        { key: 'same_phone', label: 'Phone', readOnly: true, hidden: !same, display: (c) => c.client_phone },
        { key: 'client_driving_license', label: 'Driving licence no.', optional: true },
      ],
    },
    { title: 'Address', hidden: same, fields: [address('driver_contact_')] },
  ];
};

export const thirdPartyCards = () => [
  {
    title: 'Person',
    fields: [
      { key: 'tp_name', label: 'Name', type: 'thirdParty' },
      { key: 'tp_phone', label: 'Phone', type: 'tel' },
      { key: 'tp_email', label: 'Email', type: 'email', optional: true },
      { key: 'tp_driver_contact', label: 'Driver / contact', optional: true },
      address('tp_'),
    ],
  },
  {
    title: 'Their vehicle',
    fields: [
      { key: 'tp_reg', label: 'Registration', upper: true },
      { key: 'tp_make_model', label: 'Make / model', optional: true },
    ],
  },
];

export const tpInsuranceCards = () => [
  {
    title: "Third party's insurance",
    fields: [
      { key: 'tp_insurer', label: 'Insurer', type: 'insurer', placeholder: 'Select TP insurer...' },
      { key: 'tp_broker_name', label: 'Broker', type: 'broker', idKey: 'tp_broker_id', nameKey: 'tp_broker_name', placeholder: 'Select TP broker...', optional: true },
      { key: 'tp_claim_ref', label: 'Claim reference', optional: true },
      { key: 'tp_policy_number', label: 'Policy number', optional: true },
    ],
  },
];

export const referrerCards = (claim, { ReferrerForm }) => {
  const f = { form: ReferrerForm };
  const none = !claim.referrer_id && !claim.referrer;
  return [
    {
      title: 'Referrer',
      fields: [
        { ...f, key: 'referrer', label: 'Referrer', optional: true, display: (c) => c.referrer || '' },
        { ...f, key: 'referrer_email', label: 'Email', optional: true, hidden: none },
        { ...f, key: 'referrer_ref', label: 'Reference', hidden: none },
        { ...f, key: 'file_handler', label: 'File handler', hidden: none },
      ],
    },
    {
      title: 'Fees',
      hidden: none,
      fields: [
        { ...f, key: 'percent_to_referrer', label: 'To referrer', display: (c) => (c.percent_to_referrer != null && c.percent_to_referrer !== '' ? `${c.percent_to_referrer}%` : '') },
        { ...f, key: 'referral_fee_repairer', label: 'Repairer referral fee', display: (c) => (c.referral_fee_repairer != null && c.referral_fee_repairer !== '' ? `${c.referral_fee_repairer}%` : '') },
      ],
    },
  ];
};

export const hireCards = () => [
  { title: 'Courtesy car & hire', fields: [courtesyField, hireField] },
];

export const creditRepairCards = (claim, { CreditRepairForm }) => {
  const f = { form: CreditRepairForm, optional: claim.claim_type !== 'Credit Repair' };
  return [
    {
      title: 'Credit repair company',
      fields: [
        { ...f, key: 'credit_repair_company_name', label: 'Company' },
        { ...f, key: 'credit_repair_company_contact_name', label: 'Contact' },
        { ...f, key: 'credit_repair_company_phone', label: 'Phone' },
        { ...f, key: 'credit_repair_company_email', label: 'Email' },
        { ...f, key: 'credit_repair_company_account_ref', label: 'Account ref' },
        { ...f, key: 'hire_category', label: 'Hire category', optional: true },
      ],
    },
  ];
};

export const vehicleCards = (claim, { dvlaAction }) => [
  {
    title: 'Vehicle',
    fields: [
      { key: 'vehicle_make', label: 'Make', display: (c) => c.vehicle_make || (c.make_model || '').split(' ')[0] || '' },
      { key: 'vehicle_model', label: 'Model', display: (c) => c.vehicle_model || (c.make_model || '').split(' ').slice(1).join(' ') || '' },
      { key: 'vehicle_colour', label: 'Colour' },
      { key: 'vehicle_fuel_type', label: 'Fuel' },
      { key: 'vehicle_year_of_manufacture', label: 'Year', type: 'number', optional: true },
      { key: 'vehicle_type', label: 'Type', type: 'select', options: ['Car', 'Van', 'Motorcycle', 'HGV', 'Other'] },
    ],
  },
  {
    title: 'Where it is & condition',
    fields: [
      { key: 'vehicle_location', label: 'Location', type: 'address', multiline: true },
      { key: 'unroadworthy', label: 'Drivable?', type: 'bool', value: (c) => !c.unroadworthy, patch: (v) => ({ unroadworthy: !v }), display: (c) => (c.unroadworthy ? 'No — undriveable' : 'Yes') },
      { key: 'recovery_required', label: 'Recovery needed', type: 'bool', value: (c) => !!c.recovery_required, display: (c) => (c.recovery_required ? 'Yes' : 'No') },
      { key: 'vehicle_damage', label: 'Damage', type: 'textarea' },
    ],
  },
  {
    title: 'DVLA, MOT & tax',
    wide: true,
    collapsible: true,
    defaultOpen: false,
    action: dvlaAction,
    fields: [
      { key: 'vehicle_engine_capacity', label: 'Engine (cc)', type: 'number', optional: true },
      { key: 'vehicle_co2_emissions', label: 'CO2 (g/km)', type: 'number', optional: true },
      { key: 'vehicle_euro_status', label: 'Euro status', optional: true },
      { key: 'vehicle_wheelplan', label: 'Wheelplan', optional: true },
      { key: 'vehicle_revenue_weight', label: 'Revenue weight (kg)', type: 'number', optional: true },
      { key: 'vehicle_mot_status', label: 'MOT status', optional: true },
      { key: 'vehicle_mot_expiry_date', label: 'MOT expiry', type: 'date', optional: true },
      { key: 'vehicle_tax_status', label: 'Tax status', optional: true },
      { key: 'vehicle_tax_due_date', label: 'Tax due', type: 'date', optional: true },
      { key: 'vehicle_date_of_last_v5c_issued', label: 'Last V5C issued', type: 'date', optional: true },
    ],
  },
];

export const instructionCards = () => [
  {
    title: 'When allocating a repairer',
    fields: [
      { key: 'last_contact_source', label: 'Instruction contact', type: 'select', options: ['Client', 'Driver', 'Custom'], value: (c) => c.last_contact_source || 'Client', editHint: 'Pre-selects the contact type when allocating jobs.' },
      { key: 'authorised_by', label: 'Authorised by', type: 'select', options: ['Client Insurer', 'Third Party Insurer', 'Uninsured'], value: (c) => c.authorised_by || 'Client Insurer', editHint: 'Pre-selects the authorising insurer when allocating jobs.' },
    ],
  },
];

const yn = (v) => (v === true ? 'Yes' : v === false ? 'No' : (v || ''));
export const indemnityCards = (claim, { IndemnityForm }) => {
  const f = { form: IndemnityForm, optional: true };
  const age = (() => {
    const dob = claim.indemnity_driver_dob;
    if (!dob) return claim.indemnity_driver_age;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return claim.indemnity_driver_age;
    const now = new Date();
    let a = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a -= 1;
    return a;
  })();
  return [
    {
      title: 'Driver',
      fields: [
        { ...f, key: 'indemnity_required', label: 'Indemnity checks', display: (c) => (c.requires_indemnity ? 'Required' : 'Not required') },
        { ...f, key: 'indemnity_driver_dob', label: 'Date of birth', hidden: !claim.requires_indemnity, display: (c) => fmtDate(c.indemnity_driver_dob) },
        { ...f, key: 'indemnity_driver_age', label: 'Age', hidden: !claim.requires_indemnity, display: () => (age == null || age === '' ? '' : String(age)) },
        { ...f, key: 'indemnity_registered_owner', label: 'Registered owner / keeper', hidden: !claim.requires_indemnity },
        { ...f, key: 'indemnity_full_license_12_months', label: 'Full UK/EU licence 12+ months?', hidden: !claim.requires_indemnity, display: (c) => yn(c.indemnity_full_license_12_months) },
        { ...f, key: 'indemnity_pending_prosecutions', label: 'Pending prosecutions?', hidden: !claim.requires_indemnity, display: (c) => yn(c.indemnity_pending_prosecutions) },
        { ...f, key: 'indemnity_dvla_medical_restrictions', label: 'Told not to drive?', hidden: !claim.requires_indemnity, display: (c) => yn(c.indemnity_dvla_medical_restrictions) },
        { ...f, key: 'indemnity_convictions_last_5_years', label: 'Convictions / points (5 yrs)?', hidden: !claim.requires_indemnity, display: (c) => yn(c.indemnity_convictions_last_5_years) },
        { ...f, key: 'indemnity_incidents_last_5_years', label: 'Incidents (5 yrs)?', hidden: !claim.requires_indemnity, display: (c) => yn(c.indemnity_incidents_last_5_years) },
      ],
    },
    {
      title: 'Vehicle & evidence',
      hidden: !claim.requires_indemnity,
      fields: [
        { ...f, key: 'indemnity_vehicle_use_at_incident', label: 'Use at incident' },
        { ...f, key: 'indemnity_vehicle_modifications', label: 'Modifications?', display: (c) => yn(c.indemnity_vehicle_modifications) },
        { ...f, key: 'indemnity_modification_details', label: 'Modification details', hidden: !claim.indemnity_modification_details, multiline: true },
        { ...f, key: 'indemnity_pre_existing_damage', label: 'Pre-existing damage?', display: (c) => yn(c.indemnity_pre_existing_damage) },
        { ...f, key: 'indemnity_cctv_dashcam', label: 'CCTV / dashcam?', display: (c) => yn(c.indemnity_cctv_dashcam) },
        { ...f, key: 'indemnity_property_damaged', label: 'Property damaged?', display: (c) => yn(c.indemnity_property_damaged) },
        { ...f, key: 'indemnity_more_photos', label: 'More photos available?', display: (c) => yn(c.indemnity_more_photos) },
        { ...f, key: 'indemnity_other_info', label: 'Other information', hidden: !claim.indemnity_other_info, multiline: true },
      ],
    },
  ];
};

export const signedFormCards = () => [
  {
    title: 'Statement of repair preference',
    key: 'repairPreference',
    fields: [
      { key: 'repair_preference_signed', label: 'Signed', readOnly: true, display: (c) => (c.repair_preference_signed ? 'Yes' : 'No') },
      { key: 'repair_preference_signed_at', label: 'Signed on', readOnly: true, display: (c) => fmtDate(c.repair_preference_signed_at) },
      { key: 'repair_preference_client_name', label: 'Signed by', readOnly: true },
    ],
  },
  {
    title: 'Declaration of need',
    key: 'declarationOfNeed',
    fields: [
      { key: 'declaration_of_need_signed', label: 'Signed', readOnly: true, display: (c) => (c.declaration_of_need_signed ? 'Yes' : 'No') },
      { key: 'declaration_of_need_signed_at', label: 'Signed on', readOnly: true, display: (c) => fmtDate(c.declaration_of_need_signed_at) },
      { key: 'declaration_of_need_client_name', label: 'Signed by', readOnly: true },
      { key: 'declaration_of_need_form_version', label: 'Form version', readOnly: true },
    ],
  },
];
