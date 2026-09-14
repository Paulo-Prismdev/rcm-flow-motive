import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { User, Mail, Phone, Building2, Shield, Users } from 'lucide-react';

/**
 * Builds a list of relevant contacts for a given communication update type,
 * pulling from the claim itself and its linked Bodyshop / Insurer / Referrer
 * entities. Each contact is tagged with a `kind` of 'email' or 'phone' so the
 * selector can filter by the chosen platform.
 * Returns [{ id, label, detail, sublabel, kind }]
 */
function buildContacts(updateType, claim, bodyshop, insurer, referrer) {
  const contacts = [];
  if (!claim) return contacts;

  const push = (id, label, detail, sublabel, kind) => {
    if (!detail) return;
    contacts.push({ id, label, detail, sublabel: sublabel || '', kind });
  };

  if (updateType === 'Client Communication') {
    if (claim.client_name) {
      push('client-email', claim.client_name, claim.client_email, 'Client · Email', 'email');
      push('client-phone', claim.client_name, claim.client_phone, 'Client · Phone', 'phone');
    }
    if (!claim.driver_same_as_client) {
      const dName = claim.driver_name || claim.driver_contact_name;
      if (dName) {
        push('driver-email', dName, claim.driver_email || claim.driver_contact_email, 'Driver · Email', 'email');
        push('driver-phone', dName, claim.driver_phone || claim.driver_contact_phone, 'Driver · Phone', 'phone');
      }
    }
  } else if (updateType === 'Bodyshop Communication') {
    const bsName = bodyshop?.name || claim.bodyshop;
    if (bsName) {
      push('bs-main', bsName, bodyshop?.email || claim.bodyshop_email, 'Main Email', 'email');
      push('bs-referral', bsName, bodyshop?.referral_email, 'Referral Email', 'email');
      push('bs-manager', bodyshop?.bodyshop_manager || bsName, bodyshop?.bs_manager_email, 'Bodyshop Manager', 'email');
      push('bs-accounts', bodyshop?.accounts_contact || bsName, bodyshop?.accounts_email, 'Accounts', 'email');
      push('bs-contact', bodyshop?.contact_name || bsName, bodyshop?.email, 'Main Contact', 'email');
      push('bs-phone', bsName, bodyshop?.phone, 'Landline', 'phone');
      push('bs-mobile', bsName, bodyshop?.mobile_phone, 'Mobile', 'phone');
    } else if (claim.bodyshop_email) {
      push('bs-claim', claim.bodyshop, claim.bodyshop_email, 'Main Email', 'email');
    }
  } else if (updateType === 'Insurer Communication') {
    const insName = insurer?.name || claim.insurer;
    if (insName) {
      push('ins-email', insName, insurer?.email, 'Main Email', 'email');
      push('ins-claims', insName, insurer?.claims_line, 'Claims Line', 'phone');
      push('ins-phone', insName, insurer?.phone, 'Phone', 'phone');
      if (insurer?.useful_contacts?.length) {
        insurer.useful_contacts.forEach((c, i) => {
          if (c.email) push(`ins-uc-${i}`, c.name || insName, c.email, 'Useful Contact · Email', 'email');
          if (c.phone) push(`ins-uc-p-${i}`, c.name || insName, c.phone, 'Useful Contact · Phone', 'phone');
        });
      }
    }
  } else if (updateType === 'Referrer Communication') {
    const refName = referrer?.name || claim.referrer;
    if (refName) {
      push('ref-email', referrer?.contact_name || refName, referrer?.email || claim.referrer_email, 'Main Email', 'email');
      push('ref-phone', referrer?.contact_name || refName, referrer?.phone, 'Phone', 'phone');
    } else if (claim.referrer_email) {
      push('ref-claim', claim.referrer, claim.referrer_email, 'Main Email', 'email');
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

// Map platform → which contact kinds to show.
const PLATFORM_KINDS = {
  'E-Mail': ['email'],
  'Phone': ['phone'],
  'Whatsapp': ['phone'],
  'Text Message': ['phone'],
};

export default function UpdateContactSelector({ claim, updateType, platform, value = [], onChange }) {
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

  const allContacts = useMemo(
    () => buildContacts(updateType, claim, bodyshop, insurer, referrer),
    [updateType, claim, bodyshop, insurer, referrer]
  );

  // Filter to only the kinds relevant to the chosen platform.
  const allowedKinds = platform ? (PLATFORM_KINDS[platform] || null) : null;
  const contacts = allowedKinds
    ? allContacts.filter((c) => allowedKinds.includes(c.kind))
    : allContacts;

  // Don't render until a platform is picked, and only if there are matching contacts.
  if (!isCommType || !platform || contacts.length === 0) return null;

  const Icon = TYPE_ICON[updateType] || User;

  const selectedIds = Array.isArray(value) ? value : (value ? [value] : []);
  const selected = contacts.filter((c) => selectedIds.includes(c.id));

  const toggle = (c) => {
    const exists = selected.find((x) => x.id === c.id);
    const next = exists ? selected.filter((x) => x.id !== c.id) : [...selected, c];
    onChange(next);
  };

  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        Contacted Party {contacts.length > 1 && <span className="font-normal">(select one or more)</span>}
      </label>
      <div className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg space-y-1.5 max-h-44 overflow-y-auto">
        {contacts.map((c) => {
          const checked = selectedIds.includes(c.id);
          return (
            <label key={c.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(c)}
                className="w-4 h-4 flex-shrink-0"
              />
              <span className="flex-1 min-w-0">
                <span className="font-medium">{c.label}</span>
                {c.sublabel && <span className="text-muted-foreground"> · {c.sublabel}</span>}
                <span className="text-muted-foreground"> — {c.detail}</span>
              </span>
            </label>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-1">
          {selected.length} selected: {selected.map((c) => c.detail).join(', ')}
        </p>
      )}
    </div>
  );
}