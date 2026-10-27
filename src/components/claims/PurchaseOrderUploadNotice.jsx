import React from 'react';
import { FileCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { finalPurchaseOrder, purchaseOrderFigures } from '@/components/shared/purchaseOrders';
import { isPrivatePayingClaim } from '@/components/shared/invoiceChecklist';

const dayLabel = (value) => {
  if (!value) return '';
  try {
    return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return '';
  }
};

/**
 * A purchase order dropped into the Documents panel is not an authority: it is the
 * order we issue ourselves from Financials, and the one the repairer's invoice is
 * measured against. So rather than being read and recorded as an authority, it is
 * recognised here and the user is pointed at the order in Financials — nothing is
 * filed and nothing is written to the claim.
 */
export default function PurchaseOrderUploadNotice({ claim, item, found, onClose }) {
  const privateJob = isPrivatePayingClaim(claim);
  const authority = String(item?.key || '').includes('authority');
  const what = authority ? 'authority' : 'estimate';

  const order = finalPurchaseOrder(claim);
  const figures = order ? purchaseOrderFigures(order) : null;

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-2">
        <FileCheck2 className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-px" />
        <div className="space-y-1">
          <p className="text-[12px] font-bold text-purple-800 dark:text-purple-200">
            This file is a purchase order, not {authority ? 'an' : 'an'} {what}
          </p>
          <p className="text-[11px] text-purple-800/90 dark:text-purple-200/90">
            Nothing has been filed against "{item?.label}" and nothing has been saved to the claim.
          </p>
        </div>
      </div>

      {privateJob ? (
        <div className="rounded-lg border border-border bg-card px-3 py-2.5 space-y-1">
          <p className="text-[11px] text-muted-foreground">
            A purchase order is issued from the system on a job the customer is paying for privately.
            It lives in Financials, under Job figures.
          </p>
          {figures ? (
            <p className="text-[12px] font-semibold text-foreground">
              {order.number} · {fmtGBP(figures.total)} inc VAT
              {order.date ? ` · issued ${dayLabel(order.date)}` : ''}
            </p>
          ) : (
            <p className="text-[12px] font-semibold text-foreground">
              No purchase order has been issued on this job yet — issue it from Financials, under Job figures.
            </p>
          )}
          {found?.number && figures && found.number !== order.number && (
            <p className="text-[10px] text-muted-foreground">
              The file's own number reads {found.number}.
            </p>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground px-1">
          A purchase order isn't recorded as {authority ? 'an' : 'an'} {what} on this job type. If it belongs
          with this claim, file it under General Documents instead.
        </p>
      )}

      <div className="flex justify-end pt-1">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}