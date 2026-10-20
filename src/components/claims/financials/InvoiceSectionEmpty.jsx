import React from 'react';
import { Check } from 'lucide-react';

/**
 * A panel of the invoicing area that holds nothing: a neutral tick with what
 * that means for this job and, underneath, why nothing applies.
 */
export default function InvoiceSectionEmpty({ title, reasons = [] }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-4 py-6 text-center">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
        <Check className="h-4 w-4 text-muted-foreground" strokeWidth={3} />
      </span>
      <p className="text-xs font-semibold text-foreground">{title}</p>
      {reasons.length > 0 && (
        <p className="max-w-[38ch] text-[11px] leading-snug text-muted-foreground">{reasons.join(' · ')}</p>
      )}
    </div>
  );
}