import React from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildTrackerMetaPatch, formatInvoiceDay } from '@/components/shared/invoiceChecklist';
import { releasedBeforeTracking } from '@/components/shared/invoicingQueue';

/**
 * The note on a claim whose job dates from before invoicing tracking started: it is
 * left out of Today's actions and the aged invoices, with the switch that pulls this
 * one claim back in where money is still owed on it. Everything on the claim keeps
 * working either way.
 */
export default function BeforeTrackingNotice({ claim, trackingStart, onTrackerChange }) {
  if (!releasedBeforeTracking(claim, trackingStart)) return null;
  const pulledIn = claim?.invoice_tracker?.tracking_override === true;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-dashed border-border bg-muted/30 px-3 py-2">
      <Info className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
      <p className="flex-1 min-w-[220px] text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">Invoiced before tracking started</span>
        {` — this job dates from before ${formatInvoiceDay(trackingStart)}, so ${
          pulledIn
            ? 'it is back on the Invoicing page.'
            : "it is left out of Today's actions and the aged invoices."
        } Everything here still works, and anything you record is kept.`}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-[11px]"
        onClick={() => onTrackerChange(
          buildTrackerMetaPatch(claim, { tracking_override: !pulledIn }),
          pulledIn
            ? 'Claim left out of invoicing tracking'
            : 'Claim pulled back into invoicing tracking',
        )}
      >
        {pulledIn ? 'Leave out of tracking' : 'Track this claim’s invoices'}
      </Button>
    </div>
  );
}