import React from 'react';
import { Archive, AlertTriangle } from 'lucide-react';
import UnifiedModal from '@/components/shared/UnifiedModal';
import { Button } from '@/components/ui/button';

/**
 * The warning before a claim with money still on it is filed away: everything
 * outstanding is listed by name and amount, and archiving carries on knowing the
 * lines stay on the Invoicing page until they are settled.
 */
export default function ArchiveClaimDialog({ isOpen, claim, items = [], onClose, onConfirm }) {
  const job = claim?.job_number ? `${claim.job_number} — ` : '';

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Archive with invoices outstanding?"
      description={`${job}this claim still has ${items.length} item${items.length === 1 ? '' : 's'} outstanding.`}
      className="max-w-md"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="button" size="sm" onClick={onConfirm}>
            <Archive className="w-4 h-4 mr-1.5" />
            Archive anyway
          </Button>
        </div>
      }
    >
      <div className="space-y-2.5">
        <div className="flex items-start gap-2 rounded-[10px] border border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 p-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-200">
            Archiving takes the claim off the Repairs list. Anything still outstanding stays on the Invoicing page, so the money is still chased.
          </p>
        </div>

        <div className="rounded-[10px] border border-border bg-muted/40 p-3">
          <p className="mb-1.5 text-[11px] font-semibold text-foreground">Still outstanding</p>
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.key} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </UnifiedModal>
  );
}