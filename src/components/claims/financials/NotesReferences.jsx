import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

/**
 * The reference and notes fields, folded away so the figures card stays compact.
 * It opens by itself when either field already holds something.
 */
export default function NotesReferences({ claim, onChange }) {
  const hasContent = !!(claim.external_invoice_ref || claim.invoice_notes);
  const [open, setOpen] = useState(hasContent);

  return (
    <div className="rounded-lg border border-border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
        <div className="px-2.5 pb-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
              External Invoice Ref
            </label>
            <Input
              defaultValue={claim.external_invoice_ref || ''}
              onBlur={(e) => {
                if (e.target.value === (claim.external_invoice_ref || '')) return;
                onChange({ external_invoice_ref: e.target.value || null }, 'External invoice reference updated');
              }}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
              Invoice Notes
            </label>
            <textarea
              defaultValue={claim.invoice_notes || ''}
              onBlur={(e) => {
                if (e.target.value === (claim.invoice_notes || '')) return;
                onChange({ invoice_notes: e.target.value || null }, 'Invoice notes updated');
              }}
              rows={2}
              placeholder="Anything accounts should know about these invoices"
              className="w-full px-2 py-1.5 rounded-md border border-border bg-transparent text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}