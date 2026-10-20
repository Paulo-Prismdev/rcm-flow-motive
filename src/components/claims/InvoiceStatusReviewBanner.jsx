import React, { useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { deriveInvoiceStatus, invoiceStatusNeedsReview } from '@/components/shared/invoiceChecklist';
import InvoiceReviewModal from './InvoiceReviewModal';

const DISMISS_KEY = 'invoiceStatusReviewBannerDismissed';

const readDismissed = () => {
  try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
};
const rememberDismissed = () => {
  try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {/* session storage unavailable */}
};

/**
 * Claims the old "Email Accounts" button marked Invoiced while their invoices
 * are still outstanding. They are only ever listed here — nothing is changed
 * automatically.
 */
export default function InvoiceStatusReviewBanner({ claims, onOpenClaim }) {
  const [isOpen, setIsOpen] = useState(false);
  // Dismissed for this browser session only — it comes back in a new session.
  const [dismissed, setDismissed] = useState(readDismissed);

  const flagged = useMemo(
    () => (claims || [])
      .map((claim) => {
        const review = invoiceStatusNeedsReview(claim);
        return review ? { claim, derived: deriveInvoiceStatus(claim), ...review } : null;
      })
      .filter(Boolean),
    [claims]
  );

  if (flagged.length === 0 || dismissed) return null;

  const dismiss = () => {
    rememberDismissed();
    setDismissed(true);
  };

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-900/20 flex-shrink-0">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <p className="text-[11px] text-amber-800 dark:text-amber-200 flex-1 truncate m-ellipsis">
          {flagged.length} claim{flagged.length === 1 ? '' : 's'} marked Invoiced with invoices still outstanding or figures missing.
        </p>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-[11px] font-medium text-amber-700 dark:text-amber-300 underline underline-offset-2 flex-shrink-0">
          Review
        </button>
        <button
          type="button"
          onClick={dismiss}
          title="Dismiss for this session"
          className="p-1 -mr-1 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
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