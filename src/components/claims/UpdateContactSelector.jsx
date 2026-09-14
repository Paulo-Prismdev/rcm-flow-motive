import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { User, Mail, Phone, Building2, Shield, Users } from 'lucide-react';

/**
 * Builds a list of relevant contacts for a given communication update type,
 * pulling from the claim itself and its linked Bodyshop / Insurer / Referrer
 * entities. Returns [{ id, label, detail, sublabel }]
 */
function buildContacts(updateType, claim, bodyshop, insurer, referrer) {
  const contacts = [];
  if (!claim) return contacts;

  const push = (id, label, detail, sublabel) => {
    if (!detail) return;
    contacts.push({ id, label, detail, sublabel: sublabel || '' });
  };

  if (updateType === 'Client Communication') {
    // Client
    if (claim.client_name) {
      push('client-email', claim.client_name, claim.client_email, 'Client · Email');
      push('client-phone', claim.client_name, claim.client_phone, 'Client · Phone');
    }
    // Driver (when different from client)
    if (!claim.driver_same_as_client) {
      const dName = claim.driver_name || claim.driver_contact_name;
      if (dName) {
        push('driver-email', dName, claim.driver_email || claim.driver_contact_email, 'Driver · Email');
        push('driver-phone', dName, claim.driver_phone || claim.driver_contact_phone, 'Driver · Phone');
      }
    }
  } else if (updateType === 'Bodyshop Communication') {
    const bsName = bodyshop?.name || claim.bodyshop;
    if (bsName) {
      push('bs-main', bsName, bodyshop?.email || claim.bodyshop_email, 'Main Email');
      push('bs-referral', bsName, bodyshop?.referral_email, 'Referral Email');
      push('bs-manager', bodyshop?.bodyshop_manager || bsName, bodyshop?.bs_manager_email, 'Bodyshop Manager');
      push('bs-accounts', bodyshop?.accounts_contact || bsName, bodyshop?.accounts_email, 'Accounts');
      push('bs-contact', bodyshop?.contact_name || bsName, bodyshop?.email, 'Main Contact');
      push('bs-phone', bsName, bodyshop?.phone, 'Landline');
      push('bs-mobile', bsName, bodyshop?.mobile_phone, 'Mobile');
    } else if (claim.bodyshop_email) {
      push('bs-claim', claim.bodyshop, claim.bodyshop_email, 'Main Email');
    }
  } else if (updateType === 'Insurer Communication') {
    const insName = insurer?.name || claim.insurer;
    if (insName) {
      push('ins-email', insName, insurer?.email, 'Main Email');
      push('ins-claims', insName, insurer?.claims_line, 'Claims Line');
      push('ins-phone', insName, insurer?.phone, 'Phone');
      if (insurer?.useful_contacts?.length) {
        insurer.useful_contacts.forEach((c, i) => {
          push(`ins-uc-${i}`, c.name || insName, c.email || c.phone, c.email ? 'Useful Contact · Email' : 'Useful Contact · Phone');
        });
      }
    }
  } else if (updateType === 'Referrer Communication') {
    const refName = referrer?.name || claim.referrer;
    if (refName) {
      push('ref-email', referrer?.contact_name || refName, referrer?.email || claim.referrer_email, 'Main Email');
      push('ref-phone', referrer?.contact_name || refName, referrer?.phone, 'Phone');
    } else if (claim.referrer_email) {
      push('ref-claim', claim.referrer, claim.referrer_email, 'Main Email');
    }
  }

  // de-dupe by detail+label
  const seen = new Set();
  return contacts.filter((c) => {
    const key = `${c.label}|${c.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const TYPE_ICON = {
  'Client Communication': User,
  'Bodyshop Communication': Building2,
  'Insurer Communication': Shield,
  'Referrer Communication': Users,
};

export default function UpdateContactSelector({ claim, updateType, value, onChange }) {
  const isCommType = ['Client Communication', 'Bodyshop Communication', 'Insurer Communication', 'Referrer Communication'].includes(updateType);

  const { data: bodyshop } = useQuery({
    queryKey: ['bodyshop', claim?.bodyshop_id],
    queryFn: () => base44.entities.Bodyshop.get(claim.bodyshop_id),
    enabled: isCommType && updateType === 'Bodyshop Communication' && !!claim?.bodyshop_id,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const { data: referrer } = useQuery({
    queryKey: ['referrer', claim?.referrer_id],
    queryFn: () => base44.entities.Referrer.get(claim.referrer_id),
    enabled: isCommType && updateType === 'Referrer Communication' && !!claim?.referrer_id,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const { data: insurers = [] } = useQuery({
    queryKey: ['insurers'],
    queryFn: () => base44.entities.Insurer.list(),
    enabled: isCommType && updateType === 'Insurer Communication' && !!claim?.insurer,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const insurer = useMemo(() => {
    if (!claim?.insurer) return null;
    return insurers.find((i) => i.name?.toLowerCase() === claim.insurer.toLowerCase()) || null;
  }, [insurers, claim?.insurer]);

  const contacts = useMemo(
    () => buildContacts(updateType, claim, bodyshop, insurer, referrer),
    [updateType, claim, bodyshop, insurer, referrer]
  );

  if (!isCommType || contacts.length === 0) return null;

  const Icon = TYPE_ICON[updateType] || User;

  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        Contacted Party
      </label>
      <select
        value={value || ''}
        onChange={(e) => {
          const c = contacts.find((x) => x.id === e.target.value);
          onChange(c || null);
        }}
        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg"
      >
        <option value="">Select who was contacted (optional)...</option>
        {contacts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label} — {c.detail}{c.sublabel ? ` (${c.sublabel})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}