import { fuzzyScore, linkPatch } from './directoryMatch';

/**
 * Who the client is. The instruction usually names a driver, not the client, so
 * the client is never assumed: the likely candidates are worked out here (the
 * driver's email domain, the policyholder named on the instruction, clients this
 * referrer has instructed before) and the review screen offers them so the user
 * can choose — a directory client, a new one, or the driver themselves.
 */

const FREE_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'outlook.co.uk',
  'live.com', 'live.co.uk', 'msn.com', 'yahoo.com', 'yahoo.co.uk', 'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'aol.co.uk', 'btinternet.com', 'bt.com', 'sky.com', 'virginmedia.com', 'talktalk.net',
  'ntlworld.com', 'protonmail.com', 'proton.me', 'gmx.com', 'gmx.co.uk', 'mail.com', 'zoho.com',
]);

const normalise = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function emailDomain(value) {
  const match = String(value || '').trim().toLowerCase().match(/^[^@\s]+@([a-z0-9.-]+\.[a-z]{2,})$/);
  return match ? match[1] : '';
}

/** A company address is anything that is not one of the well-known consumer ones. */
export function isCompanyDomain(value) {
  const domain = emailDomain(value);
  return !!domain && !FREE_DOMAINS.has(domain);
}

/** Whether the reading points at a company rather than a person. */
export function probableCompany(values = {}) {
  const domain = [values.driver_email, values.client_email]
    .map(emailDomain)
    .find((candidate) => candidate && !FREE_DOMAINS.has(candidate));
  if (domain) return { yes: true, reason: `the email address is on a company domain (${domain})` };
  if (String(values.vehicle_use || '').toLowerCase() === 'business') {
    return { yes: true, reason: 'the vehicle was in business use' };
  }
  return { yes: false, reason: '' };
}

/** Directory clients that could be this claim's client, likeliest first. */
export function clientSuggestions(clients = [], {
  driverEmail = '', clientEmail = '', policyholder = '', referrerName = '', priorClientIds = new Set(),
} = {}) {
  const domain = [driverEmail, clientEmail]
    .map(emailDomain)
    .find((candidate) => candidate && !FREE_DOMAINS.has(candidate)) || '';
  const label = domain.split('.')[0].replace(/[^a-z0-9]/g, '');

  return (clients || [])
    .map((client) => {
      const reasons = [];
      let score = 0;
      const domains = [
        emailDomain(client.email),
        ...(client.contacts || []).map((contact) => emailDomain(contact.email)),
      ].filter(Boolean);

      if (domain && domains.includes(domain)) {
        score = 3;
        reasons.push(`on the driver's email domain ${domain}`);
      } else if (label.length >= 3 && normalise(client.name).includes(label)) {
        score = 2;
        reasons.push(`name matches the driver's email domain ${domain}`);
      }

      if (policyholder) {
        const nameScore = fuzzyScore(policyholder, client.name);
        if (nameScore >= 0.6) {
          score = Math.max(score, nameScore > 0.95 ? 3 : 2);
          reasons.push(`close to “${policyholder}” on the instruction`);
        }
      }

      if (client.id && priorClientIds.has(client.id)) {
        score = Math.max(score, 1);
        reasons.push(referrerName ? `instructed with ${referrerName} before` : 'on a claim before');
      }

      return { record: client, score, reasons };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || String(a.record.name || '').localeCompare(String(b.record.name || '')))
    .slice(0, 5);
}

/** Whether the option the user picked is complete enough to fill the claim in. */
export function clientChoiceReady(choice) {
  if (!choice?.mode) return false;
  if (choice.mode === 'driver') return true;
  return !!choice.record;
}

/**
 * The claim patch for the client chosen on the review screen. "The driver is the
 * client" fills the client fields from the driver and leaves the driver contact
 * as the client's own details; a directory client brings its record across.
 */
export function clientChoicePatch(choice, values = {}) {
  if (!choice?.mode) return {};

  if (choice.mode === 'driver') {
    return {
      client_id: null,
      client_name: values.driver_name || '',
      client_phone: values.driver_phone || '',
      client_email: values.driver_email || '',
      client_address_line_1: values.driver_address_line_1 || '',
      client_address_line_2: values.driver_address_line_2 || '',
      client_town: values.driver_town || '',
      client_county: values.driver_county || '',
      client_postcode: values.driver_postcode || '',
      client_vat_status: 'Unknown',
      driver_same_as_client: true,
      driver_contact_name: '',
      driver_contact_phone: '',
      driver_contact_email: '',
      driver_contact_address_line_1: '',
      driver_contact_address_line_2: '',
      driver_contact_town: '',
      driver_contact_county: '',
      driver_contact_postcode: '',
    };
  }

  if (!choice.record?.id) return {};
  return linkPatch({ links: { client: { record: choice.record } }, values });
}