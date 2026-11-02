/**
 * What a claim needs before it can be created or saved, as { field: message }.
 * The form shows each message under its field, and the wizard opens the step where
 * the first one is.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const badEmail = (v) => !!String(v || '').trim() && !EMAIL_RE.test(String(v).trim());

// Which wizard step each checked field sits on.
export const FIELD_STEP = {
  reg: 'incident',
  claim_type: 'incident',
  client_name: 'client',
  client_email: 'client',
  driver_contact_email: 'client',
  tp_email: 'third_party',
};

export function validateClaim(data) {
  const errors = {};
  const reg = String(data?.reg || '').replace(/\s+/g, '');
  if (!reg) errors.reg = 'Enter the vehicle registration.';
  else if (reg.length < 2 || reg.length > 8 || /[^a-z0-9]/i.test(reg)) errors.reg = 'This doesn’t look like a registration – letters and numbers only, up to 8.';
  if (!data?.claim_type) errors.claim_type = 'Choose the claim type.';
  if (!String(data?.client_name || '').trim()) errors.client_name = 'Enter the client’s name, or pick them from the directory.';
  if (badEmail(data?.client_email)) errors.client_email = 'Check the email address – it should look like name@company.co.uk.';
  if (!data?.driver_same_as_client && badEmail(data?.driver_contact_email)) errors.driver_contact_email = 'Check the driver’s email address.';
  if (data?.has_third_party && badEmail(data?.tp_email)) errors.tp_email = 'Check the third party’s email address.';
  return errors;
}

/** The checked fields on one wizard step, for checking a step before moving on. */
export function errorsForStep(errors, stepKey) {
  return Object.fromEntries(Object.entries(errors).filter(([field]) => FIELD_STEP[field] === stepKey));
}
