import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { ClipboardList, Copy, Check, Loader2, Send } from 'lucide-react';
import { serverMessage } from '@/lib/publicForm';

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/**
 * Send a repairer the details questionnaire: email it from here, or get the link to
 * paste into your own email or a WhatsApp. The link opens this repairer's form only.
 */
export default function RepairerDetailsRequest({ bodyshop }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [onboarding, setOnboarding] = useState(false);
  const [busy, setBusy] = useState('');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const start = () => {
    setTo(bodyshop.email || bodyshop.bs_manager_email || '');
    setOnboarding(!bodyshop.details_last_confirmed_at && !bodyshop.contact_name);
    setLink(''); setError(''); setCopied(false);
    setOpen(true);
  };

  const run = async (send) => {
    setBusy(send ? 'send' : 'link'); setError('');
    try {
      const res = await base44.functions.invoke('issueRepairerDetailsLink', {
        bodyshop_id: bodyshop.id, ...(send ? { send_to: to, onboarding } : {}),
      });
      if (send) {
        queryClient.invalidateQueries({ queryKey: ['bodyshop-detail', bodyshop.id] });
        toast({ title: 'Details form sent', description: res.data?.sent_to?.join(', ') });
        setOpen(false);
      } else {
        setLink(res.data?.url || '');
      }
    } catch (e) {
      setError(serverMessage(e, 'That did not work. Please try again.'));
    } finally {
      setBusy('');
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { document.getElementById('repairer-details-link')?.select(); }
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
        <ClipboardList className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Details form</p>
          <p className="text-xs text-muted-foreground">
            {bodyshop.details_last_confirmed_at
              ? `Last sent back by the repairer ${fmt(bodyshop.details_last_confirmed_at)}`
              : bodyshop.details_form_sent_at
                ? `Sent to ${bodyshop.details_form_sent_to} ${fmt(bodyshop.details_form_sent_at)} — not back yet`
                : 'Ask the repairer to fill in or check their details'}
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={start}>Send</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send the details form</DialogTitle>
            <DialogDescription>
              {bodyshop.name} gets a secure link to a form with everything we hold filled in. What they send back waits here for you to review. The link works for 30 days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label htmlFor="details-to" className="block text-sm text-muted-foreground mb-1">Email to</label>
              <Input id="details-to" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@repairer.co.uk" />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={onboarding} onChange={(e) => setOnboarding(e.target.checked)} className="w-4 h-4" />
              New repairer — use the welcome wording
            </label>
            {error && <p className="text-sm text-danger-fg" role="alert">{error}</p>}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="button" className="flex-1" onClick={() => run(true)} disabled={!!busy || !to.trim()}>
                {busy === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send email
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => run(false)} disabled={!!busy}>
                {busy === 'link' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />} Get the link instead
              </Button>
            </div>
            {link && (
              <div className="flex gap-2">
                <Input id="repairer-details-link" readOnly value={link} onFocus={(e) => e.target.select()} className="text-xs" />
                <Button type="button" variant="outline" onClick={copy} aria-label="Copy link">
                  {copied ? <Check className="w-4 h-4 text-success-fg" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
