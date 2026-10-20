import React from 'react';
import { ExternalLink } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { INVOICE_STATUS_META } from '@/components/shared/invoiceChecklist';

/**
 * The claims list for review: what each claim says its invoicing status is,
 * what the invoices themselves say, and how many are still outstanding.
 */
export default function InvoiceReviewModal({ isOpen, onClose, flagged, onOpenClaim }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Claims to review</DialogTitle>
          <DialogDescription>
            These claims are marked Invoiced but their invoices say otherwise. Nothing has been changed — open a claim to put its invoices right.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {flagged.map(({ claim, stored, derived, outstanding }) => (
            <div key={claim.id} className="rounded-[10px] border border-border p-2.5 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  {claim.job_number || claim.reg || 'Claim'}
                  {claim.reg && <span className="ml-2 text-xs font-normal text-muted-foreground">{claim.reg}</span>}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {claim.client_name || '—'} · stored as <span className="font-medium">{stored}</span> · invoices say{' '}
                  <span className="font-medium">{INVOICE_STATUS_META[derived]?.label || derived}</span>
                  {outstanding > 0 ? ` · ${outstanding} outstanding` : ''}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px] gap-1 flex-shrink-0"
                onClick={() => { onOpenClaim(claim); onClose(); }}
              >
                <ExternalLink className="w-3 h-3" /> Open
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}