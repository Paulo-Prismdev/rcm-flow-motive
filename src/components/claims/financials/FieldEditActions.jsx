import React from 'react';
import { Check, X } from 'lucide-react';

/** The Save / Cancel pair that closes a field's deliberate edit step. */
export default function FieldEditActions({ onSave, onCancel }) {
  return (
    <>
      <button
        type="button"
        onClick={onSave}
        title="Save (Enter)"
        className="inline-flex items-center gap-0.5 h-8 px-1.5 rounded-md bg-primary text-primary-foreground text-[10px] font-semibold flex-shrink-0"
      >
        <Check className="w-3 h-3" strokeWidth={3} /> Save
      </button>
      <button
        type="button"
        onClick={onCancel}
        title="Cancel (Esc)"
        className="inline-flex items-center gap-0.5 h-8 px-1.5 rounded-md border border-border text-[10px] font-medium text-muted-foreground hover:text-foreground flex-shrink-0"
      >
        <X className="w-3 h-3" /> Cancel
      </button>
    </>
  );
}