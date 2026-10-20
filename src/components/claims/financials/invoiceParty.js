import { base44 } from '@/api/base44Client';
import { invoicePartyName } from '@/components/shared/invoiceChecklist';

const clean = (parts) => parts.filter(Boolean);
const addressOf = (record) => clean([
  record?.address_line_1,
  record?.address_line_2,
  clean([record?.town, record?.county]).join(', '),
  record?.postcode,
]);

const findBodyshop = async (name) => {
  if (!name) return null;
  try {
    const page = await base44.entities.Bodyshop.filter({ name });
    return (page.items || [])[0] || null;
  } catch {
    return null;
  }
};

const findCreditRepairCompany = async (id) => {
  if (!id) return null;
  try {
    return await base44.entities.CreditRepairCompany.get(id);
  } catch {
    return null;
  }
};

const findReferrerCompany = async (id, name) => {
  if (id) {
    try {
      return await base44.entities.Company.get(id);
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
};

/**
 * The party an invoice is written to, with the address and contact details we
 * hold for them, ready to pre-fill an accounts request.
 */
export async function resolveInvoiceParty(claim, item) {
  const name = invoicePartyName(claim, item);

  if (item.party === 'repairer') {
    const bodyshop = await findBodyshop(claim.bodyshop);
    const address = addressOf(bodyshop);
    return {
      kind: 'repairer',
      name: name || bodyshop?.name || '',
      addressLines: address.length ? address : clean([bodyshop?.full_address]),
      contact: clean([
        bodyshop?.contact_name,
        bodyshop?.email || claim.bodyshop_email,
        bodyshop?.phone || bodyshop?.mobile_phone,
      ]).join(' · '),
    };
  }

  if (item.party === 'client') {
    return {
      kind: 'client',
      name,
      addressLines: addressOf(claim),
      contact: clean([claim.client_name, claim.client_email, claim.client_phone]).join(' · '),
    };
  }

  // The second referrer is picked from the referrers list, so their invoice is
  // written to the contact details their own record holds.
  if (item.party === 'second_referrer') {
    const tracker = claim?.invoice_tracker || {};
    const company = await findReferrerCompany(tracker.second_referrer_id, tracker.second_referrer_name);
    return {
      kind: 'second_referrer',
      name: name || company?.name || '',
      addressLines: addressOf(company),
      contact: clean([company?.contact_name, company?.contact_email, company?.contact_phone]).join(' · '),
    };
  }

  if (item.party === 'credit_repair') {
    const company = await findCreditRepairCompany(claim.credit_repair_company_id);
    return {
      kind: 'credit_repair',
      name: name || company?.name || '',
      addressLines: addressOf(company),
      contact: clean([
        claim.credit_repair_company_contact_name || company?.contact_name,
        claim.credit_repair_company_email || company?.email,
        claim.credit_repair_company_phone || company?.phone,
        claim.credit_repair_company_account_ref ? `Account ref ${claim.credit_repair_company_account_ref}` : '',
      ]).join(' · '),
    };
  }

  return {
    kind: item.party || 'other',
    name,
    addressLines: [],
    contact: clean([item.party === 'referrer' ? claim.referrer_email : '']).join(' · '),
  };
}