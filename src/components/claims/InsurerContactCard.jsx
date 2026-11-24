import React, { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldCard, FieldRow, joinLines } from './ClaimFieldCards';
import InsurerDetailModal from '../shared/InsurerDetailModal';
import AddInsurerModal from '../shared/AddInsurerModal';
import { findInsurer, networkCodesOf, useInsurerDirectory } from '../shared/insurerDirectory';

const tel = (v) => (v ? `tel:${String(v).replace(/\s+/g, '')}` : undefined);

/**
 * The insurer's directory entry, shown inside a claim: contact, claims line, phone,
 * email, useful contacts and network codes. Edits happen in the directory itself
 * (the "Directory" button), so every claim for that insurer stays in step.
 */
export default function InsurerContactCard({ name, title = 'Insurer contact', canEdit = true }) {
  const insurers = useInsurerDirectory(!!name);
  const [showDetail, setShowDetail] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  if (!name) return null;
  const insurer = findInsurer(insurers, name);

  if (!insurer) {
    return (
      <FieldCard title={title}>
        <div className="px-4 pb-3.5 text-sm text-muted-foreground space-y-2">
          <p><span className="font-medium text-foreground">{name}</span> isn't in the insurer directory yet, so there are no contact details to show.</p>
          {canEdit && (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> Add to directory
            </Button>
          )}
        </div>
        <AddInsurerModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSuccess={() => setShowAdd(false)} initialName={name} />
      </FieldCard>
    );
  }

  const codes = networkCodesOf(insurer);
  const contacts = (insurer.useful_contacts || []).filter((c) => c?.name || c?.phone || c?.email);
  const claimsLine = String(insurer.claims_line || '').trim();
  const phone = String(insurer.phone || '').trim();

  return (
    <FieldCard
      title={`${title} — ${insurer.name.trim()}`}
      action={(
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => setShowDetail(true)}>
          <Building2 className="w-4 h-4" /> Directory
        </Button>
      )}
    >
      {insurer.contact_name && <FieldRow label="Contact" value={insurer.contact_name} readOnly />}
      <FieldRow label="Claims line" value={claimsLine} href={tel(claimsLine)} readOnly emptyText="—" quietEmpty />
      {phone && phone !== claimsLine && <FieldRow label="Phone" value={phone} href={tel(phone)} readOnly />}
      <FieldRow label="Email" value={insurer.email || ''} href={insurer.email ? `mailto:${insurer.email}` : undefined} readOnly emptyText="—" quietEmpty />
      <FieldRow label="Network codes" value={codes.join(', ')} readOnly emptyText="None in the directory" quietEmpty />
      {contacts.map((c, i) => (
        <FieldRow key={i} label={i === 0 ? 'Useful contacts' : ''} value={joinLines(c.name, c.phone, c.email)} multiline readOnly />
      ))}
      {insurer.notes && <FieldRow label="Notes" value={insurer.notes} multiline readOnly />}
      {showDetail && <InsurerDetailModal insurer={insurer} onClose={() => setShowDetail(false)} />}
    </FieldCard>
  );
}
