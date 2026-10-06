import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const isBlank = (v) => v === undefined || v === null || v === '';

/**
 * Whenever a claim form has a linked client (client_id), load that Client record,
 * expose its contacts, and fill in any blank client fields (VAT, phone, email, address).
 * Never overwrites values the user already entered.
 */
export default function useLinkedClientSync(clientId, setFormData, setLinkedContacts) {
  useEffect(() => {
    if (!clientId) {
      setLinkedContacts([]);
      return undefined;
    }
    let cancelled = false;
    base44.entities.Client.get(clientId)
      .then((fresh) => {
        if (cancelled || !fresh) return;
        let contacts = fresh.contacts || [];
        if (contacts.length === 0 && (fresh.company_contact_name || fresh.company_contact_phone || fresh.company_contact_email)) {
          contacts = [{
            name: fresh.company_contact_name,
            phone: fresh.company_contact_phone,
            email: fresh.company_contact_email,
            is_primary: true,
          }];
        }
        const primary = contacts.find((c) => c.is_primary) || contacts[0] || null;
        setLinkedContacts(contacts);
        setFormData((prev) => {
          if (prev.client_id !== fresh.id) return prev;
          const fill = (cur, val) => (isBlank(cur) ? (val || '') : cur);
          return {
            ...prev,
            client_phone: fill(prev.client_phone, fresh.phone || primary?.phone),
            client_email: fill(prev.client_email, fresh.email || primary?.email),
            client_address_line_1: fill(prev.client_address_line_1, fresh.address_line_1),
            client_address_line_2: fill(prev.client_address_line_2, fresh.address_line_2),
            client_town: fill(prev.client_town, fresh.town),
            client_county: fill(prev.client_county, fresh.county),
            client_postcode: fill(prev.client_postcode, fresh.postcode),
            client_vat_status: (isBlank(prev.client_vat_status) || prev.client_vat_status === 'Unknown')
              ? (fresh.vat_status || 'Unknown')
              : prev.client_vat_status,
          };
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);
}