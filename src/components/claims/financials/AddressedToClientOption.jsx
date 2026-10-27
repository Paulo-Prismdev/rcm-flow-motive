import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import AddressedToClientField from './AddressedToClientField';
import { FINAL_INVOICE_KEY } from './invoiceAuthorityCheck';

/**
 * The same option on the invoice's own sheet, once it has been saved: ticked or
 * cleared against the claim's tracker entry, with the note kept beside it. Only the
 * insurer's invoice can be addressed to the client at the insurer's request.
 */
export default function AddressedToClientOption({ item, claim, onChange }) {
  const entry = (claim?.invoice_tracker?.items || {})[item.key] || {};
  const saved = !!entry.addressed_to_client;
  const savedNote = entry.addressed_to_client_note || '';
  const [checked, setChecked] = useState(saved);
  const [note, setNote] = useState(savedNote);

  useEffect(() => {
    setChecked(saved);
    setNote(savedNote);
  }, [saved, savedNote]);

  if (item.key !== FINAL_INVOICE_KEY) return null;

  const dirty = checked !== saved || (checked && note.trim() !== savedNote);

  const save = () => onChange(
    { addressed_to_client: checked, addressed_to_client_note: note.trim() },
    checked
      ? `${item.label} marked as addressed to the client at the insurer's request — ${note.trim()}. The whole invoice is treated as the insurer's share.`
      : `${item.label} no longer marked as addressed to the client at the insurer's request`
  );

  return (
    <AddressedToClientField
      checked={checked}
      note={note}
      onToggle={setChecked}
      onNote={setNote}
      footer={(
        <>
          {saved && !dirty && <p className="text-[11px] text-mac-muted">Recorded: {savedNote}</p>}
          {dirty && (
            <Button
              size="sm"
              onClick={save}
              disabled={checked && !note.trim()}
              className="h-7 text-[11px]"
            >
              Save
            </Button>
          )}
        </>
      )}
    />
  );
}