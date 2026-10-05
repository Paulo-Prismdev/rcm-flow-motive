import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { User, Users, Car, Phone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const SECTION_OPTIONS = [
  { key: 'client_repairer', label: 'Client & Repairer' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'recovery', label: 'Recovery & Courtesy' },
  { key: 'insurance', label: 'Insurance' },
];

function ContactField({ label, field, value, onCommit }) {
  const [val, setVal] = useState(value ?? '');
  useEffect(() => { setVal(value ?? ''); }, [value]);
  const commit = () => {
    if (String(val ?? '') !== String(value ?? '')) onCommit(field, val);
  };
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
      />
    </div>
  );
}

export default function WizardInstructionContentPanel({
  claim, onContactChange, includeSections, onToggleSection,
}) {
  const [selectedContactId, setSelectedContactId] = useState(claim.instruction_contact_type || 'client');

  const { data: clientEntity } = useQuery({
    queryKey: ['client', claim?.client_id],
    queryFn: () => base44.entities.Client.get(claim.client_id),
    enabled: !!claim?.client_id,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const contactOptions = useMemo(() => {
    const opts = [];
    opts.push({
      id: 'client', label: claim.client_name || 'Client', sublabel: 'Client',
      name: claim.client_name, phone: claim.client_phone, email: claim.client_email,
    });
    if (!claim.driver_same_as_client) {
      const dName = claim.driver_name || claim.driver_contact_name;
      if (dName) opts.push({
        id: 'driver', label: dName, sublabel: 'Driver',
        name: dName, phone: claim.driver_phone || claim.driver_contact_phone,
        email: claim.driver_email || claim.driver_contact_email,
      });
    }
    if (clientEntity?.contacts?.length) {
      clientEntity.contacts.forEach((c, i) => {
        if (c.name || c.email || c.phone) opts.push({
          id: `client-contact-${i}`, label: c.name || c.email || c.phone,
          sublabel: c.position || 'Client Contact',
          name: c.name || '', phone: c.phone || '', email: c.email || '',
        });
      });
    }
    opts.push({ id: 'custom', label: 'Custom', sublabel: 'Enter manually', name: '', phone: '', email: '' });
    return opts;
  }, [claim, clientEntity]);

  const handleSelectContact = (opt) => {
    setSelectedContactId(opt.id);
    onContactChange({
      last_contact_source: opt.id === 'client' ? 'Client' : opt.id === 'driver' ? 'Driver' : 'Custom',
      instruction_contact_type: opt.id,
      instruction_contact_name: opt.name || '',
      instruction_contact_email: opt.email || '',
      instruction_contact_phone: opt.phone || '',
    });
  };

  const handleFieldCommit = (field, value) => {
    setSelectedContactId('custom');
    onContactChange({ [field]: value, instruction_contact_type: 'custom', last_contact_source: 'Custom' });
  };

  return (
    <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-3">
      <h3 className="font-bold text-sm flex items-center gap-1.5">
        <User className="w-4 h-4 text-primary" /> Instruction Content
      </h3>
      <p className="text-xs text-muted-foreground">Choose the instruction contact and which sections appear on the PDF.</p>

      {/* Contact radio list */}
      <div>
        <label className="block text-xs font-medium mb-1.5">Contact for this instruction</label>
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
          {contactOptions.map((opt) => {
            const Icon = opt.id === 'driver' ? Car : opt.id.startsWith('client-contact') ? Users : opt.id === 'custom' ? Phone : User;
            const checked = selectedContactId === opt.id;
            return (
              <label key={opt.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                <input type="radio" name="bs-contact" checked={checked} onChange={() => handleSelectContact(opt)} className="w-4 h-4 flex-shrink-0" />
                <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 min-w-0 text-sm">
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-muted-foreground"> · {opt.sublabel}</span>
                </span>
                <span className="text-xs text-muted-foreground truncate hidden sm:block">
                  {[opt.phone, opt.email].filter(Boolean).join(' · ') || '—'}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Editable contact details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <ContactField label="Contact Name" field="instruction_contact_name" value={claim.instruction_contact_name} onCommit={handleFieldCommit} />
        <ContactField label="Email" field="instruction_contact_email" value={claim.instruction_contact_email} onCommit={handleFieldCommit} />
        <ContactField label="Phone" field="instruction_contact_phone" value={claim.instruction_contact_phone} onCommit={handleFieldCommit} />
      </div>

      {/* Section toggles */}
      <div>
        <label className="block text-xs font-medium mb-1.5">Sections to include</label>
        <div className="flex flex-wrap gap-2">
          {SECTION_OPTIONS.map((s) => (
            <label key={s.key} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs transition-colors ${includeSections[s.key] ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border text-muted-foreground'}`}>
              <input type="checkbox" checked={includeSections[s.key]} onChange={(e) => onToggleSection(s.key, e.target.checked)} className="w-3.5 h-3.5" />
              {s.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}