import React, { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { deriveInvoiceStatus, invoiceStatusNeedsReview } from '@/components/shared/invoiceChecklist';
import { Button } from '@/components/ui/button';
import InvoiceReviewModal from './InvoiceReviewModal';

/**
 * Claims the old "Email Accounts" button marked Invoiced while their invoices
 * are still outstanding. They are only ever listed here — nothing is changed
 * automatically.
 */
export default function InvoiceStatusReviewBanner({ claims, onOpenClaim }) {
  const [isOpen, setIsOpen] = useState(false);

  const flagged = useMemo(
    () => (claims || [])
      .map((claim) => {
        const review = invoiceStatusNeedsReview(claim);
        return review ? { claim, derived: deriveInvoiceStatus(claim), ...review } : null;
      })
      .filter(Boolean),
    [claims]
  );

  if (flagged.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 px-5 py-2 border-b border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-900/20 flex-shrink-0">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <p className="text-[11px] text-amber-800 dark:text-amber-200 flex-1">
          {flagged.length} claim{flagged.length === 1 ? '' : 's'} marked Invoiced with invoices still outstanding or figures missing.
        </p>
        <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => setIsOpen(true)}>
          Review
        </Button>
      </div>

      <InvoiceReviewModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        flagged={flagged}
        onOpenClaim={onOpenClaim}
      />
    </>
  );
}