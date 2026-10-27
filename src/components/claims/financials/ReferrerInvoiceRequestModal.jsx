import React, { useEffect, useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  REFERRER_REMINDER_DAYS,
  RCM_INVOICE_ADDRESS,
  RCM_INVOICES_EMAIL,
  buildReferrerInvoiceRequestEmail,
  resolveReferrerParty,
} from './referrerRequest';
import { createReferrerRequestNote } from './referrerRequestNote';

const sameAddress = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

/**
 * The pre-filled email asking a referrer to send their own invoice for one job, or
 * chasing it with a reminder. The address it goes to comes from their directory
 * record — an accounts contact first where one is saved, with every other contact
 * there to pick from — and everything is editable before it is sent.
 */
export default function ReferrerInvoiceRequestModal({
  isOpen, onClose, claim, item, state, currentUser, hold = '', reminder = false, onSent,
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [party, setParty] = useState(null);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saveEmail, setSaveEmail] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // The referrer behind this claim is loaded as the screen opens, and the email is
  // written for whoever we hold for them.
  useEffect(() => {
    if (!isOpen || !item) return undefined;
    let cancelled = false;
    setParty(null);
    setTo('');
    setCc('');
    setBody('');
    setEmailTouched(false);
    (async () => {
      const found = await resolveReferrerParty(claim, item);
      if (cancelled) return;
      setParty(found);
      applyContact(found, found.options[0] || null, found.options.length === 0);
    })();
    return () => { cancelled = true; };
  }, [isOpen, item?.key, reminder]);

  /** Writing the email for one of the referrer's contacts — everyone is editable after. */
  const applyContact = (found, contact, nothingSaved = false) => {
    setTo(contact?.email || found?.defaultEmail || '');
    setSaveEmail(nothingSaved);
    const built = buildReferrerInvoiceRequestEmail({
      claim,
      item,
      state,
      referrerName: found?.name,
      contactName: contact?.name,
      user: currentUser,
      reminder,
    });
    setSubject(built.subject);
    setBody(built.body);
  };

  const contacts = party?.options || [];
  const heldByRecord = [
    ...(party?.record?.contacts || []).map((c) => c.email),
    party?.record?.contact_email,
  ].filter(Boolean);
  // Offered wherever the address isn't one the referrer's record already holds.
  const canSaveEmail = !!party?.record?.id && !!to.trim() && !heldByRecord.some((email) => sameAddress(email, to));

  const handleSend = async () => {
    if (!to.trim()) {
      toast({ title: "Add the referrer's email address", variant: 'destructive' });
      return;
    }
    setIsSending(true);
    try {
      const res = await base44.functions.invoke('requestReferrerInvoice', {
        claim_id: claim.id,
        item_key: item.key,
        item_label: item.label,
        to: to.trim(),
        cc: cc.trim(),
        subject,
        body,
        reminder,
        referrer_name: party?.name || '',
      });
      const data = res?.data || {};
      if (data.error) throw new Error(data.error);

      // An address the referrer's record didn't hold can be saved to it, so the next
      // request goes out without anyone typing it again.
      if (saveEmail && canSaveEmail) {
        try {
          await base44.entities.Company.update(party.record.id, { contact_email: to.trim() });
          queryClient.invalidateQueries({ queryKey: ['companies'] });
        } catch (saveErr) {
          console.error('Could not save the referrer email', saveErr);
        }
      }

      // The request itself belongs in the claim's Internal Updates as an outgoing
      // communication to the referrer. A failure to log it never hides the send.
      try {
        await createReferrerRequestNote({
          claim,
          item,
          referrerName: party?.name,
          to: to.trim(),
          cc: cc.trim(),
          total: state?.total,
          reminder,
        });
        queryClient.invalidateQueries({ queryKey: ['notes', claim.id, 'Claim'] });
      } catch (noteErr) {
        console.error('Create referrer request update failed', noteErr);
      }

      onSent({
        requestedAt: data.requested_at,
        reminderAt: data.reminder_sent_at,
        reminder,
        to: to.trim(),
      });
      toast({
        title: reminder ? 'Reminder sent' : 'Request sent',
        description: reminder
          ? `${item.label} — the referrer has been chased for it.`
          : `${item.label} marked as requested from the referrer.`,
      });
      onClose();
    } catch (e) {
      // The function answers a refused send with the email service's own wording,
      // which says far more than the bare status the SDK reports.
      toast({
        title: reminder ? 'Could not send the reminder' : 'Could not send the request',
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
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            {reminder ? "Chase the referrer's invoice" : 'Request invoice from referrer'}
          </DialogTitle>
          <DialogDescription>
            {item?.label} — Job {claim?.job_number || '—'} · {claim?.reg || '—'}.
            {reminder
              ? ` Asked for more than ${REFERRER_REMINDER_DAYS} days ago with nothing received.`
              : ' Sending this asks the referrer for their invoice and marks only this invoice as requested.'}
          </DialogDescription>
        </DialogHeader>

        {hold && (
          <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-900/20 px-3 py-2">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Not yet — {hold}</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 space-y-1">
            <p className="text-[11px] text-muted-foreground">
              Sending to <span className="font-semibold text-foreground">{party?.name || 'the referrer'}</span>. Your
              invoice has to be addressed to {RCM_INVOICE_ADDRESS[0]} and sent to {RCM_INVOICES_EMAIL} — both are in the
              email below.
            </p>

            {contacts.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contacts</span>
                {contacts.map((contact) => (
                  <button
                    key={contact.email}
                    type="button"
                    onClick={() => { setEmailTouched(true); applyContact(party, contact); }}
                    className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${sameAddress(contact.email, to)
                      ? 'border-primary bg-primary/10 font-semibold text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/60 hover:text-foreground'}`}
                    title={contact.email}
                  >
                    {contact.name || contact.email}
                    {contact.position ? ` · ${contact.position}` : ''}
                  </button>
                ))}
              </div>
            )}

            {party && !party.defaultEmail && (
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                No email address is saved for {party.name || 'this referrer'} — enter one below.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Referrer Email
              </label>
              <Input
                value={to}
                onChange={(e) => { setEmailTouched(true); setTo(e.target.value); }}
                placeholder="invoices@referrer.co.uk"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">CC</label>
              <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Optional" className="h-9 text-sm" />
            </div>
          </div>

          {canSaveEmail && (
            <label className="flex cursor-pointer items-start gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={saveEmail}
                onChange={(e) => setSaveEmail(e.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              <span>
                Save {to.trim()} to {party?.name || 'the referrer'}&apos;s record
                {emailTouched ? '' : ' — nothing is saved for them yet'}.
              </span>
            </label>
          )}

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 text-sm" />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Email</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={20}
              className="w-full px-3 py-2 rounded-md border border-border bg-transparent text-xs font-mono leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>Cancel</Button>
          <Button onClick={handleSend} disabled={isSending || !!hold} className="gap-2">
            <Send className="w-4 h-4" />
            {isSending ? 'Sending...' : (reminder ? 'Send reminder' : 'Send request')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}