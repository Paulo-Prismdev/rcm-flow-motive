import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Send, Mail } from 'lucide-react';
import RichTextEditor from '@/components/shared/RichTextEditor';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/components/ui/use-toast';
import { BUILT_IN_PDF_TEMPLATES, replacePlaceholders } from './WizardConstants';
import { sendInstructionEmail } from '@/functions/sendInstructionEmail';
import WizardGeneratePdfBar from './WizardGeneratePdfBar';

export default function WizardInstructionEmailStep({
  claim, selectedBodyshop,
  pdfTemplates, selectedPdfTemplate, onSelectTemplate,
  isGeneratingPdf, generatedPdfUrl, onGeneratePdf,
  isSavingToDocs, savedToDocs, onSaveToDocs,
  emailTemplates, emailTo, emailCc, emailSubject, emailBody,
  selectedEmailTemplateId,
  onEmailToChange, onEmailCcChange, onEmailSubjectChange, onEmailBodyChange, onEmailTemplateSelect,
}) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const handleEmailTemplateSelect = (templateId) => {
    onEmailTemplateSelect(templateId);
    if (templateId && templateId !== 'null') {
      const template = emailTemplates.find(t => t.id === templateId);
      if (template) {
        const itemData = {
          ...claim, bodyshop: selectedBodyshop?.name, bodyshop_name: selectedBodyshop?.name,
          bodyshop_email: selectedBodyshop?.email, bodyshop_phone: selectedBodyshop?.phone,
        };
        onEmailSubjectChange(replacePlaceholders(template.subject, itemData));
        onEmailBodyChange(replacePlaceholders(template.body, itemData));
      }
    }
  };

  const handleOpenInOutlook = () => {
    if (!emailTo) { toast({ title: 'Recipient required', variant: 'destructive' }); return; }
    const plainBody = (emailBody || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n')
      .replace(/<\/li>/gi, '\n').replace(/<li[^>]*>/gi, '• ').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
    const ccParam = emailCc ? `&cc=${encodeURIComponent(emailCc)}` : '';
    window.location.href = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(emailSubject || '')}${ccParam}&body=${encodeURIComponent(plainBody)}`;
  };

  const handleSendBranded = async () => {
    if (!emailTo) { toast({ title: 'Recipient required', description: 'Please enter a recipient email.', variant: 'destructive' }); return; }
    if (!emailSubject || !emailBody) { toast({ title: 'Content required', description: 'Add a subject and message.', variant: 'destructive' }); return; }
    setIsSending(true);
    try {
      const res = await sendInstructionEmail({ to: emailTo, cc: emailCc, subject: emailSubject, email_body: emailBody, claim_id: claim?.id, job_number: claim?.job_number });
      const data = res?.data || res;
      if (data?.success) toast({ title: 'Email sent', description: `Branded instruction email sent to ${emailTo}.` });
      else throw new Error(data?.error || 'Unknown error');
    } catch (error) {
      toast({ title: 'Send failed', description: error.message || 'Could not send the email.', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const activeCustomTemplates = pdfTemplates.filter(t => t.is_active);

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
        <p className="font-medium text-sm">Selected Repairer: {selectedBodyshop?.name}</p>
        <p className="text-xs text-muted-foreground">{selectedBodyshop?.email}</p>
      </div>

      {/* ── Template picker ── */}
      <div>
        <h3 className="font-bold text-sm mb-1">Instruction Template</h3>
        <p className="text-xs text-muted-foreground mb-2">Pre-selected from your instruction type. Switch only if you need a different layout.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {BUILT_IN_PDF_TEMPLATES.map((template) => {
            const IconComponent = template.icon;
            return (
              <div key={template.id} className={`p-2.5 rounded-lg border-2 cursor-pointer transition-all text-center ${selectedPdfTemplate === template.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`} onClick={() => onSelectTemplate(template.id)}>
                <IconComponent className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="font-medium text-xs">{template.name}</p>
              </div>
            );
          })}
        </div>
        {activeCustomTemplates.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {activeCustomTemplates.map((template) => (
              <div key={template.id} className={`p-2.5 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-2 ${selectedPdfTemplate === template.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`} onClick={() => onSelectTemplate(template.id)}>
                <FileText className="w-4 h-4 text-primary" />
                <p className="font-medium text-xs">{template.template_name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Generate PDF + save to docs ── */}
      <WizardGeneratePdfBar
        isGeneratingPdf={isGeneratingPdf}
        generatedPdfUrl={generatedPdfUrl}
        onGeneratePdf={onGeneratePdf}
        isSavingToDocs={isSavingToDocs}
        savedToDocs={savedToDocs}
        onSaveToDocs={onSaveToDocs}
      />

      {/* ── Email compose ── */}
      <div className="pt-2 border-t border-border space-y-3">
        <h3 className="font-bold text-sm">Compose Email to Repairer</h3>
        <div>
          <label className="block text-xs font-medium mb-1">Email Template (Optional)</label>
          <Select value={selectedEmailTemplateId || 'none'} onValueChange={handleEmailTemplateSelect}>
            <SelectTrigger><SelectValue placeholder="Select a template or write custom email" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Custom Email)</SelectItem>
              {emailTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">To *</label>
            <Input type="email" value={emailTo} onChange={(e) => onEmailToChange(e.target.value)} placeholder="recipient@example.com" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">CC</label>
            <Input type="email" value={emailCc} onChange={(e) => onEmailCcChange(e.target.value)} placeholder="cc@example.com" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1">Subject</label>
            <Input value={emailSubject} onChange={(e) => onEmailSubjectChange(e.target.value)} placeholder="Email subject" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Message</label>
          <RichTextEditor value={emailBody} onChange={onEmailBodyChange} placeholder="Email message" minHeight={140} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button onClick={handleSendBranded} disabled={isSending} className="h-10">
            <Send className={`w-4 h-4 mr-2 ${isSending ? 'animate-pulse' : ''}`} /> {isSending ? 'Sending…' : 'Send Branded Email'}
          </Button>
          <Button onClick={handleOpenInOutlook} variant="outline" className="h-10">
            <Mail className="w-4 h-4 mr-2" /> Open in Outlook
          </Button>
        </div>
      </div>
    </div>
  );
}