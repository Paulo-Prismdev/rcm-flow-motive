import React from 'react';
import { Input } from '@/components/ui/input';

/**
 * An insurer's invoice that the insurer had raised in the client's name. The whole
 * invoice is the insurer's share of the repair all the same, so it is read as their
 * own invoice rather than as a split one — and the note saying who asked for it is
 * required, because the document on its own reads as the customer's invoice.
 */
export default function AddressedToClientField({ checked, note, onToggle, onNote, footer }) {
  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
      <label className="flex cursor-pointer items-start gap-2 text-[11px]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-0.5 rounded border-border"
        />
        <span className="font-semibold text-foreground">Addressed to the client at the insurer's request</span>
      </label>
      <p className="text-[11px] leading-snug text-muted-foreground">
        The insurer asked for this invoice to be raised in the client's name. The whole invoice is treated as the
        insurer's share and checked against what that share should be, whatever “payable by” lines the document prints.
      </p>
      {checked && (
        <div className="space-y-1.5">
          <Input
            value={note}
            onChange={(e) => onNote(e.target.value)}
            placeholder="e.g. Allianz asked for invoice in client name"
            className="h-7 text-[12px]"
          />
          {footer}
        </div>
      )}
    </div>
  );
}