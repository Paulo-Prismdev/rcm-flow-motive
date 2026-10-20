import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import FigureField from './FigureField';

/**
 * The reference and notes fields, folded away so the figures card stays compact
 * and read-only until their pencils are clicked. It opens by itself when either
 * field already holds something.
 */
export default function NotesReferences({ claim, onChange, editingKey, setEditingKey }) {
  const hasContent = !!(claim.external_invoice_ref || claim.invoice_notes);
  const [open, setOpen] = useState(hasContent);

  const fieldEdit = (key) => ({
    editing: editingKey === key,
    onEdit: () => setEditingKey(key),
    onDone: () => setEditingKey(null),
  });

  // Folding the section away abandons an edit in progress — nothing is saved.
  const toggleOpen = () => {
    setEditingKey(null);
    setOpen((v) => !v);
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20">
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left"
      >
        <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Notes &amp; references
        </span>
        {!open && (
          <span className="ml-1 min-w-0 flex-1 truncate text-[10px] text-muted-foreground/80">
            {claim.external_invoice_ref || claim.invoice_notes || 'None'}
          </span>
        )}
      </button>

      {open && (
        <div className="px-2.5 pb-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 items-start">
          <FigureField
            {...fieldEdit('external_invoice_ref')}
            label="External Invoice Ref"
            value={claim.external_invoice_ref}
            onCommit={(v) => onChange({ external_invoice_ref: v || null }, `External invoice ref set to ${v || 'not set'}`)}
          />
          <FigureField
            {...fieldEdit('invoice_notes')}
            label="Invoice Notes"
            type="textarea"
            value={claim.invoice_notes}
            onCommit={(v) => onChange({ invoice_notes: v || null }, 'Invoice notes updated')}
          />
        </div>
      )}
    </div>
  );
}