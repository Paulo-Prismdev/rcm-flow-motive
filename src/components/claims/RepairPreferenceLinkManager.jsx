import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, Copy, Check, RefreshCw, Loader, ExternalLink, CheckCircle2, FileText, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Internal-only control. Generates a secure, unguessable per-claim link containing a
// repair_preference_token. External security comes from the token: the public submit
// endpoint only updates the claim whose stored repair_preference_token matches the link.
export default function RepairPreferenceLinkManager({ claim, onUpdate }) {
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const hasToken = !!claim.repair_preference_token;
  const linkUrl = hasToken ? `${window.location.origin}/repair-preference-form?token=${claim.repair_preference_token}` : '';
  const signed = !!claim.repair_preference_signed;

  const genToken = () => (crypto?.randomUUID?.() || (Math.random().toString(36).slice(2) + Date.now().toString(36)));

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onUpdate({
        ...claim,
        repair_preference_token: genToken(),
        repair_preference_link_sent_at: new Date().toISOString(),
      });
      toast({ title: 'Repair preference link generated', description: 'Copy the link below and send it to the client.' });
    } catch (e) {
      toast({ title: 'Failed to generate link', variant: 'destructive' });
    }
    setGenerating(false);
  };

  const handleRegenerate = async () => {
    setGenerating(true);
    try {
      await onUpdate({
        ...claim,
        repair_preference_token: genToken(),
        repair_preference_link_sent_at: new Date().toISOString(),
        repair_preference_signed: false,
        repair_preference_signed_at: null,
      });
      toast({ title: 'New repair preference link generated', description: 'The previous link is no longer valid.' });
    } catch (e) {
      toast({ title: 'Failed to generate link', variant: 'destructive' });
    }
    setGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(linkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {!hasToken ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Generate a secure link to send to the client so they can sign the Statement of Repair Preference online. Once signed, a PDF is generated and saved to this claim.</p>
          <Button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2 shrink-0">
            {generating ? <Loader className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {generating ? 'Generating...' : 'Request Repair Preference'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {signed && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Statement of Repair Preference signed by {claim.repair_preference_client_name || 'client'} on {claim.repair_preference_signed_at ? new Date(claim.repair_preference_signed_at).toLocaleDateString('en-GB') : ''}.</span>
            </div>
          )}
          {signed && claim.repair_preference_pdf_url && (
            <Button variant="outline" size="sm" onClick={() => window.open(claim.repair_preference_pdf_url, '_blank')} className="flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> View signed PDF
            </Button>
          )}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Repair preference link</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input readOnly value={linkUrl} className="flex-1 text-xs" onClick={(e) => e.target.select()} />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} className="flex items-center gap-1.5">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input text-sm hover:bg-accent">
                  <ExternalLink className="w-3.5 h-3.5" /> Open
                </a>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Generated {claim.repair_preference_link_sent_at ? new Date(claim.repair_preference_link_sent_at).toLocaleString('en-GB') : ''}
            </p>
            <Button variant="ghost" size="sm" onClick={handleRegenerate} disabled={generating} className="flex items-center gap-1.5 text-xs">
              {generating ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Regenerate link
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}