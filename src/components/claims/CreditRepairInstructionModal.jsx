import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import RichTextEditor from '@/components/shared/RichTextEditor';
import { Send, Mail, FileText, Download, Save, RefreshCw, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { sendInstructionEmail } from '@/functions/sendInstructionEmail';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';

function buildDefaultBody(claim, pdfUrl) {
  const lines = [
    `Dear ${claim.credit_repair_company_contact_name || claim.credit_repair_company_name || 'Sir/Madam'},`,
    '',
    'We would like to instruct you to deal with the following claim on our behalf:',
    '',
    `<strong>RCM Reference:</strong> ${claim.job_number || 'N/A'}`,
    `<strong>Client:</strong> ${claim.client_name || 'N/A'}`,
    `<strong>Vehicle:</strong> ${claim.make_model || 'N/A'} (${claim.reg || 'N/A'})`,
    `<strong>Date of Loss:</strong> ${claim.loss_date || 'N/A'}`,
    '',
    'Please find the full instruction document via the link below. Kindly proceed with the credit repair process and contact us should you require any further information.',
  ];
  if (pdfUrl) {
    lines.push('', `<a href="${pdfUrl}">View Instruction PDF</a>`);
  }
  lines.push('', 'Kind regards,', '<br>RCM Automotive');
  return lines.join('<br>');
}

export default function CreditRepairInstructionModal({ claim, isOpen, onClose }) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState(null);
  const [savedToDocs, setSavedToDocs] = useState(false);
  const [isSavingToDocs, setIsSavingToDocs] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen && claim) {
      setEmailTo(claim.credit_repair_company_email || '');
      setEmailCc('');
      setEmailSubject(`New Credit Repair Instruction - ${claim.job_number || claim.reg || ''}`);
      setEmailBody(buildDefaultBody(claim, null));
      setGeneratedPdfUrl(null);
      setSavedToDocs(false);
    }
  }, [isOpen, claim?.id]);

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const response = await base44.functions.invoke('generateCreditRepairInstructionPdf', {
        claimId: claim.id,
        saveToClaim: false,
      });
      const { file_url } = response.data;
      if (!file_url) throw new Error('No file URL returned');
      setGeneratedPdfUrl(file_url);
      setSavedToDocs(false);
      setEmailBody(buildDefaultBody(claim, file_url));
      window.open(file_url, '_blank');
    } catch (error) {
      console.error('Error generating credit repair PDF:', error);
      toast({ title: 'PDF generation failed', description: error.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSaveToDocs = async () => {
    if (!generatedPdfUrl) return;
    setIsSavingToDocs(true);
    try {
      const current = Array.isArray(claim.file_urls) ? claim.file_urls : [];
      const updated = current.includes(generatedPdfUrl) ? current : [...current, generatedPdfUrl];
      await base44.entities.Claim.update(claim.id, { file_urls: updated });
      setSavedToDocs(true);
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['claim', claim.id] });
    } catch (error) {
      console.error('Error saving PDF to docs:', error);
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSavingToDocs(false);
    }
  };

  const handleSendBranded = async () => {
    if (!emailTo) {
      toast({ title: 'Recipient required', description: 'Please enter a recipient email before sending.', variant: 'destructive' });
      return;
    }
    if (!emailSubject || !emailBody) {
      toast({ title: 'Content required', description: 'Please add a subject and message before sending.', variant: 'destructive' });
      return;
    }
    setIsSending(true);
    try {
      const res = await sendInstructionEmail({
        to: emailTo,
        cc: emailCc,
        subject: emailSubject,
        email_body: emailBody,
        claim_id: claim.id,
        job_number: claim.job_number,
      });
      const data = res?.data || res;
      if (data?.success) {
        toast({ title: 'Email sent', description: `Credit repair instruction sent to ${emailTo}.` });
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to send branded email:', error);
      toast({ title: 'Send failed', description: error.message || 'Could not send the email.', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenInOutlook = () => {
    if (!emailTo) {
      toast({ title: 'Recipient required', variant: 'destructive' });
      return;
    }
    const plainBody = (emailBody || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim();
    const ccParam = emailCc ? `&cc=${encodeURIComponent(emailCc)}` : '';
    window.location.href = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(emailSubject || '')}${ccParam}&body=${encodeURIComponent(plainBody)}`;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
      <DialogContent className="max-w-2xl w-full max-h-[95vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Credit Repair Instruction — {claim.job_number || claim.reg}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generate the instruction PDF and email it to {claim.credit_repair_company_name || 'the credit repair company'}.
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* PDF generation */}
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium">Instruction PDF</span>
              </div>
              <div className="flex items-center gap-2">
                {generatedPdfUrl && (
                  <Button variant="outline" size="sm" onClick={() => window.open(generatedPdfUrl, '_blank')} className="gap-2">
                    <Download className="w-4 h-4" /> View
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleGeneratePdf} disabled={isGeneratingPdf} className="gap-2">
                  <RefreshCw className={`w-4 h-4 ${isGeneratingPdf ? 'animate-spin' : ''}`} />
                  {isGeneratingPdf ? 'Generating...' : generatedPdfUrl ? 'Regenerate' : 'Generate PDF'}
                </Button>
              </div>
            </div>
            {generatedPdfUrl && !isGeneratingPdf && (
              <div className="mt-3 pt-3 border-t border-accent/20 space-y-2">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm flex-1">{savedToDocs ? 'Saved to claim docs.' : 'PDF generated.'}</span>
                </div>
                {!savedToDocs && (
                  <Button variant="outline" size="sm" onClick={handleSaveToDocs} disabled={isSavingToDocs} className="w-full gap-2">
                    {isSavingToDocs ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="w-4 h-4" /> Save to Claim Docs</>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Email compose */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm">Compose Email to Credit Repair Company</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">To *</label>
                <Input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="creditrepair@example.com" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">CC</label>
                <Input type="email" value={emailCc} onChange={(e) => setEmailCc(e.target.value)} placeholder="cc@example.com" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">Subject</label>
                <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Message</label>
              <RichTextEditor value={emailBody} onChange={setEmailBody} placeholder="Email message" minHeight={160} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button onClick={handleSendBranded} disabled={isSending} className="h-10">
                <Send className={`w-4 h-4 mr-2 ${isSending ? 'animate-pulse' : ''}`} />
                {isSending ? 'Sending…' : 'Send Branded Email'}
              </Button>
              <Button onClick={handleOpenInOutlook} variant="outline" className="h-10">
                <Mail className="w-4 h-4 mr-2" /> Open in Outlook
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              "Send Branded Email" sends directly with the RCM logo &amp; footer. "Open in Outlook" opens your email client to review first.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}