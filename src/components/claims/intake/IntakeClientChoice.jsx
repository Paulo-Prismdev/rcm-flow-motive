import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Building2, Check, Plus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ClientCombobox from '@/components/shared/ClientCombobox';
import AddClientModal from '@/components/shared/AddClientModal';
import { bestMatch } from './directoryMatch';
import { hasDriver } from './claimIntakeFields';
import { clientSuggestions, probableCompany } from './clientChoice';
import IntakeClientOption from './IntakeClientOption';
import IntakeClientSuggestions from './IntakeClientSuggestions';

/**
 * Always the user's choice: a client already in the directory (with the likely
 * ones, from the driver's email domain, the policyholder named on the
 * instruction or this referrer's earlier jobs, offered first), a new client, or
 * the driver themselves. The driver is never quietly taken as the client.
 */
export default function IntakeClientChoice({ values = {}, referrerLink = null, choice = {}, onChange }) {
  const [adding, setAdding] = useState(false);
  const presetRef = useRef(false);

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list('-created_date', 500) });
  const { data: referrers = [] } = useQuery({ queryKey: ['companies', 'referrer'], queryFn: () => base44.entities.Company.filter({ company_type: 'referrer' }) });

  const referrerRecord = referrerLink?.record || bestMatch(values.referrer, referrers)?.record || null;

  // Clients this referrer has instructed us for before: a good sign that the
  // same company is back.
  const { data: priorClaims = [] } = useQuery({
    queryKey: ['intake-referrer-clients', referrerRecord?.id],
    enabled: !!referrerRecord?.id,
    queryFn: async () => {
      const page = await base44.entities.Claim.filter(
        { referrer_id: referrerRecord.id },
        { limit: 200, sort: '-created_date', fields: ['client_id'] },
      );
      return page?.items || [];
    },
  });

  const suggestions = useMemo(() => clientSuggestions(clients, {
    driverEmail: values.driver_email || '',
    clientEmail: values.client_email || '',
    policyholder: values.client_name || '',
    referrerName: referrerRecord?.name || values.referrer || '',
    priorClientIds: new Set(priorClaims.map((claim) => claim.client_id).filter(Boolean)),
  }), [clients, priorClaims, referrerRecord, values.driver_email, values.client_email, values.client_name, values.referrer]);

  // The clearest suggestion is offered once the directory is in — never the driver.
  useEffect(() => {
    if (presetRef.current || !clients.length) return;
    presetRef.current = true;
    if (choice?.mode) return;
    const strong = suggestions.find((row) => row.score >= 2);
    if (strong) onChange({ mode: 'existing', record: strong.record, suggested: true });
  }, [clients, suggestions, choice, onChange]);

  const probable = probableCompany(values);
  const driverReady = hasDriver(values);
  const mode = choice?.mode || null;

  const newClientInitial = useMemo(() => ({
    client_type: probable.yes ? 'Company' : 'Individual',
    name: values.client_name || '',
    phone: values.client_phone || '',
    email: values.client_email || '',
    address_line_1: values.client_address_line_1 || '',
    address_line_2: values.client_address_line_2 || '',
    town: values.client_town || '',
    county: values.client_county || '',
    postcode: values.client_postcode || '',
    vat_status: values.client_vat_status || 'Unknown',
    contacts: probable.yes && driverReady && values.driver_name
      ? [{
        name: values.driver_name,
        position: 'Driver',
        email: values.driver_email || '',
        phone: values.driver_phone || '',
        is_primary: true,
      }]
      : [],
  }), [values, probable.yes, driverReady]);

  const pick = (record) => onChange({ mode: 'existing', record });

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Client — who is it?</p>

      {probable.yes && (
        <p className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
          Likely a company: {probable.reason}.
        </p>
      )}

      <IntakeClientOption
        selected={mode === 'existing'}
        onClick={() => onChange({ mode: 'existing', record: choice?.record || null })}
        icon={Building2}
        title="Use a client from the directory"
        subtitle="A company or individual already on the system"
      >
        <IntakeClientSuggestions suggestions={suggestions} selectedId={choice?.record?.id} onPick={pick} />
        <ClientCombobox value={choice?.record?.name || ''} onChange={pick} placeholder="Search the client directory..." />
        {choice?.record && (
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
            Using “{choice.record.name}”{choice.suggested ? ' — suggested from the instruction' : ''}
          </p>
        )}
      </IntakeClientOption>

      <IntakeClientOption
        selected={mode === 'new'}
        onClick={() => { onChange({ mode: 'new', record: null }); setAdding(true); }}
        icon={Plus}
        title="Add a new client"
        subtitle={probable.yes && driverReady ? 'As a company, with the driver as a contact' : 'As a company, or as an individual'}
      >
        <Button type="button" variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => setAdding(true)}>
          <Plus className="w-3.5 h-3.5" /> Add the client and their details
        </Button>
        <p className="text-[10px] text-muted-foreground">
          {probable.yes && driverReady
            ? 'The driver is added as the first contact on the company.'
            : 'A company can carry the driver as its contact.'}
        </p>
      </IntakeClientOption>

      <IntakeClientOption
        selected={mode === 'driver'}
        disabled={!driverReady}
        onClick={() => onChange({ mode: 'driver', record: null })}
        icon={User}
        title="The driver is the client"
        subtitle={driverReady ? 'The driver becomes an individual client' : 'No driver details were read from this instruction'}
      >
        <p className="text-[11px] text-muted-foreground">
          {values.driver_name || 'The driver'} becomes the claim's client, with their own phone, email and address.
        </p>
      </IntakeClientOption>

      <AddClientModal
        isOpen={adding}
        onClose={() => setAdding(false)}
        initial={newClientInitial}
        onSuccess={(record) => { setAdding(false); onChange({ mode: 'existing', record, isNew: true }); }}
      />
    </div>
  );
}