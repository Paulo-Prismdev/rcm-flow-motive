import React from 'react';
import FigureGroup from '@/components/financials/FigureGroup';

/**
 * The reference and notes fields that travel with this job's invoicing, as their own
 * titled group at the foot of the figures.
 */
export default function NotesReferences({ claim, onChange, editingKey, setEditingKey }) {
  const rows = [
    {
      key: 'external_invoice_ref',
      label: 'External invoice ref',
      value: claim.external_invoice_ref,
      caption: 'Carried on the invoices raised for this job',
    },
    {
      key: 'invoice_notes',
      label: 'Invoice notes',
      type: 'textarea',
      value: claim.invoice_notes,
      caption: 'Anything the invoicing needs to know',
    },
  ];

  return (
    <FigureGroup
      title="Notes & references"
      rows={rows}
      editing={editingKey === 'notes'}
      onEdit={() => setEditingKey('notes')}
      onDone={() => setEditingKey(null)}
      onSave={(changes) => {
        const patch = {};
        const notes = [];
        if (changes.external_invoice_ref !== undefined) {
          patch.external_invoice_ref = changes.external_invoice_ref || null;
          notes.push(`External invoice ref set to ${changes.external_invoice_ref || 'not set'}`);
        }
        if (changes.invoice_notes !== undefined) {
          patch.invoice_notes = changes.invoice_notes || null;
          notes.push('Invoice notes updated');
        }
        onChange(patch, notes.join('; '));
      }}
    />
  );
}