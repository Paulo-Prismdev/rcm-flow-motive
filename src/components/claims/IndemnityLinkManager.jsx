import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldCheck, Link2, Copy, Mail, Check, Loader, Send, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

export default function IndemnityLinkManager({ claim, onUpdate }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailTo, setEmailTo] = useState(claim.client_email || '');

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await base44.functions.invoke('generateIndemnityLink', { claimId: claim.id });
      if (result.data?.link) {
        setLink(result.data.link);
        setEmailTo(claim.client_email || '');
        onUpdate({ ...claim, indemnity_link_sent_at: new Date().toISOString(), indemnity_completed_at: null });
        toast({ title: 'Indemnity link generated' });
      } else {
        toast({ title: 'Failed to generate link', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error: ' + (err.message || 'Failed to generate link'), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleOpen = () => {
    setLink('');
    setCopied(false);
    setOpen(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async () => {
    if (!emailTo) {
      toast({ title: 'Please enter an email address', variant: 'destructive' });
      return;
    }
    setSendingEmail(true);
    try {
      const subject = `Indemnity Details Required — Claim ${claim.job_number || ''}`;
      const body = `Hello ${claim.client_name || ''},\n\nWe require some indemnity details to proceed with your claim. Please complete the form at the link below:\n\n${link}\n\nThank you,\nRCM Automotive`;
      const mailtoUrl = `mailto:${emailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl, '_blank');
      toast({ title: 'Email draft opened in your mail client' });
    } catch (err) {
      toast({ title: 'Failed to send email', variant: 'destructive' });
    } finally {
      setSendingEmail(false);
    }
  };

  const isCompleted = !!claim.indemnity_completed_at;
  const isSent = !!claim.indemnity_link_sent_at;

  return (
    <>
      <div className="flex flex-col gap-2 p-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">External Indemnity Form</span>
        </div>

        {isCompleted ? (
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
            <Check className="w-4 h-4" />
            <span>Completed on {format(new Date(claim.indemnity_completed_at), 'dd/MM/yyyy \'at\' HH:mm')}</span>
          </div>
        ) : isSent ? (
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Link sent on {format(new Date(claim.indemnity_link_sent_at), 'dd/MM/yyyy')} — awaiting completion</span>
          </div>
        ) : (
          <p className="text-xs text-blue-600 dark:text-blue-400">Generate a secure link to send to the customer to fill out indemnity details online.</p>
        )}

        <Button onClick={handleOpen} variant="outline" size="sm" className="mt-1 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/40">
          <Link2 className="w-3.5 h-3.5" />
          {isSent && !isCompleted ? 'Manage Indemnity Link' : isCompleted ? 'View Indemnity Link' : 'Generate Indemnity Link'}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              External Indemnity Form Link
            </DialogTitle>
          </DialogHeader>

          {!link ? (
            <div className="space-y-3 py-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This will generate a unique, secure link that the customer can use to fill out their indemnity details online. The details will be saved directly to this claim.
              </p>
              <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                <p><span className="font-medium">Claim:</span> {claim.job_number || 'N/A'}</p>
                <p><span className="font-medium">Client:</span> {claim.client_name || 'N/A'}</p>
                <p><span className="font-medium">Vehicle:</span> {claim.reg || 'N/A'} {claim.make_model || ''}</p>
              </div>
              <Button onClick={handleGenerate} disabled={generating} className="w-full">
                {generating ? <><Loader className="w-4 h-4 animate-spin" /> Generating...</> : <><Link2 className="w-4 h-4" /> Generate Secure Link</>}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {isCompleted && (
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-300">Form already completed by the customer.</span>
                </div>
              )}

              {/* Link display */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Secure Link</label>
                <div className="flex gap-2">
                  <Input value={link} readOnly className="text-xs" />
                  <Button onClick={handleCopy} variant="outline" size="icon" className="flex-shrink-0">
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Email section */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Send via Email</label>
                <div className="flex gap-2">
                  <Input value={emailTo} onChange={e => setEmailTo(e.target.value)} type="email" placeholder="customer@email.com" className="text-sm" />
                  <Button onClick={handleSendEmail} disabled={sendingEmail} variant="outline" className="flex-shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Opens a pre-filled email in your mail client.</p>
              </div>

              {/* Regenerate */}
              {!isCompleted && (
                <Button onClick={handleGenerate} disabled={generating} variant="ghost" size="sm" className="w-full">
                  <RefreshCw className="w-3.5 h-3.5" />
                  {generating ? 'Regenerating...' : 'Generate New Link'}
                </Button>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}