import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Loader2 } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import {
  finalPurchaseOrder,
  nextPurchaseOrderNumber,
  purchaseOrderFigureSource,
  splitPurchaseOrderTotal,
} from '@/components/shared/purchaseOrders';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const money = (n) => round2(n).toFixed(2);

/**
 * Issuing a purchase order: the amount it will be issued at, worked out from the
 * latest authorised figure (the supplementary authority where there is one, otherwise
 * the initial authority, and failing an authority the latest estimate), shown before
 * anything is generated and adjustable on the spot.
 *
 * The order is the authorisation for a job the customer is paying for privately, so the
 * figure is the whole of the repair — ex VAT, the VAT on it, and the total.
 */
export default function PurchaseOrderDialog({ open, onClose, claim, onIssued }) {
  const { toast } = useToast();
  const source = useMemo(() => purchaseOrderFigureSource(claim), [claim]);
  const existing = finalPurchaseOrder(claim);
  const [amounts, setAmounts] = useState({ net: '', vat: '', total: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const split = splitPurchaseOrderTotal(source.total);
    setAmounts({ net: money(split.net), vat: money(split.vat), total: money(split.total) });
  }, [open, source.total]);

  // Whichever figure is typed stands, and the other two follow it at 20% VAT, so the
  // three always agree with one another.
  const setAmount = (key, value) => {
    const entered = Number(String(value).replace(/[^0-9.-]/g, '')) || 0;
    if (key === 'total') {
      const net = entered / 1.2;
      setAmounts({ net: money(net), vat: money(entered - net), total: money(entered) });
      return;
    }
    if (key === 'net') {
      const vat = entered * 0.2;
      setAmounts({ net: money(entered), vat: money(vat), total: money(entered + vat) });
      return;
    }
    const net = entered / 0.2;
    setAmounts({ net: money(net), vat: money(entered), total: money(net + entered) });
  };

  const total = Number(amounts.total) || 0;
  const canIssue = total > 0 && !busy;

  const issue = async () => {
    setBusy(true);
    try {
      const response = await base44.functions.invoke('generatePurchaseOrderPdf', {
        claimId: claim.id,
        total,
      });
      const order = response.data?.purchaseOrder;
      if (!order?.file_url) throw new Error(response.data?.error || 'The order was not generated');
      onIssued?.(order);
      onClose();
    } catch (e) {
      toast({ title: 'Could not issue the purchase order', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-primary" />
            {existing ? 'Revise the purchase order' : 'Issue the purchase order'}
          </DialogTitle>
          <DialogDescription>
            {existing
              ? `${nextPurchaseOrderNumber(claim)} replaces ${existing.number} as the Final Purchase Order.`
              : `${nextPurchaseOrderNumber(claim)} becomes the Final Purchase Order the repairer's invoice is measured against.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
            {source.source ? (
              <p className="text-xs text-foreground">
                Based on the <span className="font-semibold">{source.source.toLowerCase()}</span> —{' '}
                {fmtGBP(source.total)} inc VAT. Check the amount; you can change it below.
              </p>
            ) : (
              <p className="text-xs text-foreground">
                No authority or estimate figure is on this claim yet — enter the amount the repair is ordered at.
              </p>
            )}
            {existing && (
              <p className="text-[11px] text-muted-foreground mt-1">
                The current order stands at {fmtGBP(Number(existing.total) || 0)}.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { key: 'net', label: 'Ex VAT' },
              { key: 'vat', label: 'VAT' },
              { key: 'total', label: 'Total inc VAT' },
            ].map((field) => (
              <label key={field.key} className="space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground block">{field.label}</span>
                <Input
                  value={amounts[field.key]}
                  onChange={(e) => setAmount(field.key, e.target.value)}
                  inputMode="decimal"
                  disabled={busy}
                  className={field.key === 'total' ? 'font-semibold' : ''}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={issue} disabled={!canIssue} className="gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {existing ? 'Issue revised order' : 'Issue the order'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}