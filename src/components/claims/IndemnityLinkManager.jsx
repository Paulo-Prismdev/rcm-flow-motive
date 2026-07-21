import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, Copy, Check, RefreshCw, Loader, ExternalLink, CheckCircle2, Trash2, FileDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

// Internal-only control shown on the Indemnity Details screen.
// Generates a secure, unguessable per-claim link containing an indemnity_token.
// No internal access restrictions — any user who can edit the claim can generate/copy it.
// External security comes from the token: the public submit endpoint only updates
// the claim whose stored indemnity_token matches the one in the link.
export default function IndemnityLinkManager({ claim, onUpdate }) {
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const hasToken = !!claim.indemnity_token;
  const linkUrl = hasToken ? `${window.location.origin}/indemnity-form?token=${claim.indemnity_token}` : '';
  const completed = !!claim.indemnity_completed_at;

  const genToken = () => (crypto?.randomUUID?.() || (Math.random().toString(36).slice(2) + Date.now().toString(36)));

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onUpdate({
        ...claim,
        indemnity_token: genToken(),
        indemnity_link_sent_at: new Date().toISOString(),
        requires_indemnity: true,
      });
      toast({ title: 'Indemnity link generated', description: 'Copy the link below and send it to the client.' });
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
        indemnity_token: genToken(),
        indemnity_link_sent_at: new Date().toISOString(),
        indemnity_completed_at: null,
      });
      toast({ title: 'New indemnity link generated', description: 'The previous link is no longer valid.' });
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

  const buildExportText = () => {
    const fmt = (v) => (v && String(v).trim() !== '') ? v : '—';
    const dob = claim.indemnity_driver_dob ? new Date(claim.indemnity_driver_dob).toLocaleDateString('en-GB') : '—';
    const mods = claim.indemnity_vehicle_modifications === 'Yes' && claim.indemnity_modification_details
      ? ` — ${claim.indemnity_modification_details}` : '';
    return [
      'INDEMNITY QUESTIONNAIRE — RESPONSES',
      `Claim: ${claim.job_number || '—'}    Reg: ${claim.reg || '—'}`,
      `Client: ${claim.client_name || '—'}`,
      `Completed: ${claim.indemnity_completed_at ? new Date(claim.indemnity_completed_at).toLocaleString('en-GB') : '—'}`,
      '',
      'Driver & Licence',
      `Date of birth: ${dob}${claim.indemnity_driver_age ? ` (age ${claim.indemnity_driver_age})` : ''}`,
      `Registered owner/keeper: ${fmt(claim.indemnity_registered_owner)}`,
      `Held full UK/EU licence 12+ months: ${fmt(claim.indemnity_full_license_12_months)}`,
      '',
      'Driver History',
      `Pending prosecutions: ${fmt(claim.indemnity_pending_prosecutions)}`,
      `DVLA/medical restrictions: ${fmt(claim.indemnity_dvla_medical_restrictions)}`,
      `Convictions (last 5 years): ${fmt(claim.indemnity_convictions_last_5_years)}`,
      `Incidents (last 5 years): ${fmt(claim.indemnity_incidents_last_5_years)}`,
      '',
      'Vehicle & Incident',
      `Vehicle use at incident: ${fmt(claim.indemnity_vehicle_use_at_incident)}`,
      `Vehicle modifications: ${fmt(claim.indemnity_vehicle_modifications)}${mods}`,
      `Pre-existing damage: ${fmt(claim.indemnity_pre_existing_damage)}`,
      '',
      'Evidence & Info',
      `CCTV/dashcam footage: ${fmt(claim.indemnity_cctv_dashcam)}`,
      `Property damaged: ${fmt(claim.indemnity_property_damaged)}`,
      `Can provide more photos: ${fmt(claim.indemnity_more_photos)}`,
      claim.indemnity_other_info ? `Other info: ${claim.indemnity_other_info}` : '',
    ].filter(Boolean).join('\n');
  };

  const handleExport = async () => {
    try {
      await navigator.clipboard.writeText(buildExportText());
      toast({ title: 'Answers copied', description: 'Paste into an email or document.' });
    } catch (e) {
      toast({ title: 'Copy failed', description: 'Please copy manually.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    setGenerating(true);
    try {
      await onUpdate({
        ...claim,
        indemnity_token: '',
        indemnity_link_sent_at: null,
        indemnity_completed_at: null,
        indemnity_driver_dob: '',
        indemnity_driver_age: null,
        indemnity_registered_owner: '',
        indemnity_pending_prosecutions: '',
        indemnity_dvla_medical_restrictions: '',
        indemnity_full_license_12_months: '',
        indemnity_convictions_last_5_years: '',
        indemnity_incidents_last_5_years: '',
        indemnity_vehicle_use_at_incident: '',
        indemnity_vehicle_modifications: '',
        indemnity_modification_details: '',
        indemnity_pre_existing_damage: '',
        indemnity_cctv_dashcam: '',
        indemnity_property_damaged: '',
        indemnity_more_photos: '',
        indemnity_other_info: '',
      });
      toast({ title: 'Indemnity answers deleted', description: 'Generate a fresh link to resend.' });
    } catch (e) {
      toast({ title: 'Failed to delete answers', variant: 'destructive' });
    }
    setGenerating(false);
  };

  return (
    <div className="rounded-[10px] border border-border bg-card p-4 md:p-5 shadow-sm">
      <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-border">
        <Link2 className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Request Indemnity Details</h3>
      </div>

      {!hasToken ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Generate a secure link to send to the client so they can complete the indemnity questionnaire online. Their responses will feed directly into this claim.</p>
          <Button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2 shrink-0">
            {generating ? <Loader className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {generating ? 'Generating...' : 'Request Indemnity Details'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {completed && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Indemnity details received from client on {new Date(claim.indemnity_completed_at).toLocaleDateString('en-GB')}.</span>
            </div>
          )}
          {completed && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-1.5">
                <FileDown className="w-3.5 h-3.5" /> Export answers
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={generating} className="flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                    {generating ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete answers
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete indemnity answers?</AlertDialogTitle>
                    <AlertDialogDescription>This clears the client's submitted responses and the link token, so you can generate a fresh link to resend. This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete & reset</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Indemnity link</label>
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
              Generated {claim.indemnity_link_sent_at ? new Date(claim.indemnity_link_sent_at).toLocaleString('en-GB') : ''}
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