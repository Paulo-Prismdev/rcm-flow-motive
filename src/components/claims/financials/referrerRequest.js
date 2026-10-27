import { base44 } from '@/api/base44Client';
import { fmtGBP } from '@/components/shared/creditRepairRates';

/**
 * Asking a referrer for their own invoice: who the request goes to, the email it
 * pre-fills, and when a reminder is due.
 *
 * The referrer invoices us their agreed share of the repair, but nothing about that
 * invoice can be worked out until the job figures are confirmed — so the request is
 * held under exactly the same rule as an accounts request, and the amount it asks
 * for is the row's own calculated fee, split out and shown with its workings.
 */

/** Who a referrer's invoice is addressed to, as we ask for it. */
export const RCM_INVOICE_ADDRESS = [
  'RCM Automotive Ltd',
  'Suite 5, Pure Offices',
  'Plato Close, Tachbrook Park',
  'Warwick, CV34 6WE',
];

/** Where a referrer is asked to send their invoice. */
export const RCM_INVOICES_EMAIL = 'invoices@rcmautomotive.co.uk';

/** How long after the request a referrer's invoice is chased with a reminder. */
export const REFERRER_REMINDER_DAYS = 7;

/** A contact who looks after accounts or invoicing at the referrer's end. */
const ACCOUNTS_WORDS = /account|invoice|billing|finance|credit control|purchase ledger|ledger/i;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toNum = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
};

const validEmail = (value) => EMAIL_RE.test(String(value || '').trim());

const dayCount = (value, now) => {
  const from = new Date(value);
  if (Number.isNaN(from.getTime())) return null;
  return Math.floor((now.getTime() - from.getTime()) / 86400000);
};

/**
 * The referrer a claim's invoice request goes to: the referrer the claim holds, or
 * the second referrer the tracker names, together with their own record and every
 * address we hold for them — an accounts or invoicing contact first, where one is
 * saved, so the request goes to the right desk without anyone having to pick.
 */
async function findReferrerRecord(id, name) {
  if (id) {
    try {
      const record = await base44.entities.Company.get(id);
      if (record) return record;
    } catch {
      // Falls through to the name the claim holds.
    }
  }
  if (!name) return null;
  try {
    const page = await base44.entities.Company.filter({ company_type: 'referrer', name });
    return (page.items || [])[0] || null;
  } catch {
    return null;
  }
}

export async function resolveReferrerParty(claim, item) {
  const tracker = claim?.invoice_tracker || {};
  const second = item?.requestFrom === 'second_referrer';
  const id = second ? tracker.second_referrer_id : claim?.referrer_id;
  const heldName = (second ? tracker.second_referrer_name : claim?.referrer) || '';
  const record = await findReferrerRecord(id, heldName);

  // Accounts or invoicing contacts first, then the rest of the record's contacts in
  // the order it holds them.
  const contacts = (record?.contacts || [])
    .filter((c) => validEmail(c?.email))
    .map((c) => ({
      name: c.name || '',
      position: c.position || '',
      email: String(c.email).trim(),
    }));
  const ranked = [
    ...contacts.filter((c) => ACCOUNTS_WORDS.test(`${c.name} ${c.position}`)),
    ...contacts.filter((c) => !ACCOUNTS_WORDS.test(`${c.name} ${c.position}`)),
  ];

  // Any address held on the record itself, or on the claim, is offered last — and
  // only where no contact already carries it.
  const spare = [record?.contact_email, second ? '' : claim?.referrer_email]
    .filter(validEmail)
    .map((email) => String(email).trim());
  const options = [...ranked];
  for (const email of spare) {
    if (!options.some((o) => o.email.toLowerCase() === email.toLowerCase())) {
      options.push({ name: record?.contact_name || '', position: '', email });
    }
  }

  return {
    id: record?.id || id || '',
    name: heldName || record?.name || '',
    record: record || null,
    options,
    defaultEmail: options[0]?.email || '',
  };
}

/** The fee an item bills, named the way the request words it. */
const feeName = (item) => `${item.label.replace(/\s*Invoice In$/, '')} fee`;

/**
 * The pre-filled request for a referrer's invoice: the job, the fee with how it was
 * worked out, who to address the invoice to and where to send it. Everything here is
 * editable before it is sent.
 */
export function buildReferrerInvoiceRequestEmail({
  claim, item, state, referrerName, contactName, user, reminder = false,
}) {
  const greetingName = String(contactName || referrerName || '').trim().split(' ')[0];
  const vatRegistered = toNum(state?.vat) > 0;
  const label = feeName(item);

  const lines = [
    greetingName ? `Hi ${greetingName},` : 'Hi,',
    '',
    reminder
      ? `We're still waiting on your invoice for the repair below — could you send it over when you get a chance?`
      : `Please send us your invoice for the repair below.`,
    '',
    `Job number:     ${claim.job_number || '—'}`,
    `Vehicle Reg:    ${claim.reg || '—'}`,
    `Client:         ${claim.client_name || '—'}`,
    `Our reference:  ${claim.claim_ref || claim.job_number || '—'}`,
    '',
    `Amount due (${label}):`,
    `  Fee ex VAT:     ${fmtGBP(state?.ex)}`,
    vatRegistered
      ? `  VAT (20%):      ${fmtGBP(state?.vat)}`
      : '  VAT:            None — you are not VAT registered',
    `  Total:          ${fmtGBP(state?.total)}`,
    '',
    'How it was worked out:',
    ...(state?.hint ? [`  ${state.hint}`] : []),
    ...((state?.workings || []).map((row) => `  ${row.label}: ${row.value}`)),
    '',
    'Please address your invoice to:',
    ...RCM_INVOICE_ADDRESS.map((line) => `  ${line}`),
    '',
    `And send it to ${RCM_INVOICES_EMAIL}.`,
    '',
    'Thanks',
    user?.full_name ? `${user.full_name}` : '',
    claim.job_number ? `Job ${claim.job_number}` : '',
  ];

  const subject = reminder
    ? `Reminder — invoice requested | Job ${claim.job_number || '—'} | ${claim.reg || '—'} | ${item.label}`
    : `Invoice request — Job ${claim.job_number || '—'} | ${claim.reg || '—'} | ${item.label}`;

  return { subject, body: lines.filter((line) => line !== undefined).join('\n') };
}

/** How long ago the invoice was asked for, in whole days, or null where it wasn't. */
export function referrerRequestAgeDays(state, now = new Date()) {
  if (!state?.requestedAt) return null;
  return dayCount(state.requestedAt, now);
}

/**
 * Whether a reminder is due: the invoice has been asked for, nothing has come in
 * against it since, and the request is past the chase threshold.
 */
export function referrerReminderDue(state, now = new Date()) {
  if (!state?.requested || !state?.requestedAt) return false;
  if (state.date || state.paid || state.copyAttached) return false;
  const days = referrerRequestAgeDays(state, now);
  return days !== null && days >= REFERRER_REMINDER_DAYS;
}