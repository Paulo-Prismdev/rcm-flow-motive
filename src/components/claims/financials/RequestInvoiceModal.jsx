import React, { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { DEFAULT_ACCOUNTS_EMAIL } from '@/components/shared/invoiceChecklist';
import { buildInvoiceRequestEmail } from './requestEmail';

/**
 * The pre-filled email asking accounts to raise one invoice. Everything is
 * editable, and sending it touches that invoice only — never the final invoice.
 */
export default function RequestInvoiceModal({ isOpen, onClose, claim, item, state, party, accountsEmail, currentUser, onRequested }) {
  const { toast } = useToast();
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isOpen || !item) return;
    const built = buildInvoiceRequestEmail({ claim, item, state, party, user: currentUser });
    setTo(accountsEmail || DEFAULT_ACCOUNTS_EMAIL);
    setCc('');
    setSubject(built.subject);
    setBody(built.body);
  }, [isOpen, item?.key]);

  const handleSend = async () => {
    if (!to.trim()) {
      toast({ title: 'Add an accounts email address', variant: 'destructive' });
      return;
    }
    setIsSending(true);
    try {
      const res = await base44.functions.invoke('requestInvoiceFromAccounts', {
        claim_id: claim.id,
        item_key: item.key,
        item_label: item.label,
        to: to.trim(),
        cc: cc.trim(),
        subject,
        body,
      });
      const data = res?.data || {};
      if (data.error) throw new Error(data.error);
      onRequested(data.requested_at);
      toast({ title: 'Request sent', description: `${item.label} marked as requested from accounts.` });
      onClose();
    } catch (e) {
      toast({
        title: 'Could not send the request',
        description: e?.message || 'Please try again.',
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
          <DialogTitle>Request from accounts</DialogTitle>
          <DialogDescription>
            {item?.label} — Job {claim.job_number || '—'} · {claim.reg || '—'}. Sending this marks only this invoice as requested.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Accounts Email</label>
              <Input value={to} onChange={(e) => setTo(e.target.value)} className="h-9 text-sm" />
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
              rows={18}
              className="w-full px-3 py-2 rounded-md border border-border bg-transparent text-xs font-mono leading-relaxed"
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