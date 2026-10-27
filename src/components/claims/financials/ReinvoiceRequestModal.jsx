import React, { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { buildReinvoiceEmail } from './invoiceAuthorityCheck';
import { finalInvoiceLabel } from '@/components/shared/invoiceChecklist';

/**
 * The pre-filled email asking the repairer for a corrected invoice at the amount
 * the job was authorised at. Everything is editable, and sending it records the
 * request against the Final Insurer Invoice — which is what leaves that invoice
 * amber until the corrected copy is uploaded.
 */
export default function ReinvoiceRequestModal({ isOpen, onClose, claim, comparison, currentUser }) {
  const { toast } = useToast();
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isOpen || !comparison) return;
    const built = buildReinvoiceEmail({ claim, comparison, user: currentUser });
    setTo(claim?.bodyshop_email || '');
    setCc('');
    setSubject(built.subject);
    setBody(built.body);
    // The figure being questioned is the insurer's share of the invoice, which is
    // the invoice's whole total on an invoice billing them for all of it.
  }, [isOpen, comparison?.insurerPart, comparison?.authority]);

  const handleSend = async () => {
    if (!to.trim()) {
      toast({ title: "Add the repairer's email address", variant: 'destructive' });
      return;
    }
    setIsSending(true);
    try {
      const res = await base44.functions.invoke('requestCorrectedInvoice', {
        claim_id: claim.id,
        to: to.trim(),
        cc: cc.trim(),
        subject,
        body,
        invoice_total: comparison?.insurerPart,
        authority_amount: comparison?.authority,
      });
      const data = res?.data || {};
      if (data.error) throw new Error(data.error);
      toast({
        title: 'Request sent',
        description: `The repairer has been asked for a corrected invoice — the ${finalInvoiceLabel(claim)} stays amber until it arrives.`,
      });
      onClose();
    } catch (e) {
      // The function answers a refused send with the email service's own wording,
      // which says far more than the bare status the SDK reports.
      toast({
        title: 'Could not send the request',
        description: e?.response?.data?.error || e?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ask the repairer for a corrected invoice</DialogTitle>
          <DialogDescription>
            {claim?.bodyshop || 'The repairer'} — Job {claim?.job_number || '—'} · {claim?.reg || '—'}. Sending this
            records the request against the {finalInvoiceLabel(claim)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Repairer Email</label>
              <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="repairer@example.com" className="h-9 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">CC</label>
              <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Optional" className="h-9 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 text-sm" />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Email</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              className="w-full px-3 py-2 rounded-md border border-border bg-transparent text-xs leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>Cancel</Button>
          <Button onClick={handleSend} disabled={isSending} className="gap-2">
            <Send className="w-4 h-4" /> {isSending ? 'Sending...' : 'Send request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}