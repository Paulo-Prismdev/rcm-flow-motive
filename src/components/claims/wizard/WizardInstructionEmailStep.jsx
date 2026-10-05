import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Loader, CheckCircle, Save, Download, RefreshCw, Send, Mail, User, Users, Car, Phone } from 'lucide-react';
import RichTextEditor from '@/components/shared/RichTextEditor';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { BUILT_IN_PDF_TEMPLATES, replacePlaceholders } from './WizardConstants';
import { sendInstructionEmail } from '@/functions/sendInstructionEmail';

const SECTION_OPTIONS = [
  { key: 'client_repairer', label: 'Client & Repairer' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'recovery', label: 'Recovery & Courtesy' },
  { key: 'insurance', label: 'Insurance' },
];

function ContactField({ label, field, value, onCommit }) {
  const [val, setVal] = useState(value ?? '');
  useEffect(() => { setVal(value ?? ''); }, [value]);
  const commit = () => {
    if (String(val ?? '') !== String(value ?? '')) onCommit(field, val);
  };
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
      />
    </div>
  );
}

export default function WizardInstructionEmailStep({
  claim, selectedBodyshop,
  pdfTemplates, selectedPdfTemplate, onSelectTemplate,
  isGeneratingPdf, generatedPdfUrl, onGeneratePdf,
  isSavingToDocs, savedToDocs, onSaveToDocs,
  emailTemplates, emailTo, emailCc, emailSubject, emailBody,
  selectedEmailTemplateId,
  onEmailToChange, onEmailCcChange, onEmailSubjectChange, onEmailBodyChange, onEmailTemplateSelect,
  onContactChange,
  includeSections, onToggleSection,
}) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState(claim.instruction_contact_type || 'client');

  const { data: clientEntity } = useQuery({
    queryKey: ['client', claim?.client_id],
    queryFn: () => base44.entities.Client.get(claim.client_id),
    enabled: !!claim?.client_id,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const contactOptions = useMemo(() => {
    const opts = [];
    opts.push({
      id: 'client', label: claim.client_name || 'Client', sublabel: 'Client',
      name: claim.client_name, phone: claim.client_phone, email: claim.client_email,
    });
    if (!claim.driver_same_as_client) {
      const dName = claim.driver_name || claim.driver_contact_name;
      if (dName) opts.push({
        id: 'driver', label: dName, sublabel: 'Driver',
        name: dName, phone: claim.driver_phone || claim.driver_contact_phone,
        email: claim.driver_email || claim.driver_contact_email,
      });
    }
    if (clientEntity?.contacts?.length) {
      clientEntity.contacts.forEach((c, i) => {
        if (c.name || c.email || c.phone) opts.push({
          id: `client-contact-${i}`, label: c.name || c.email || c.phone,
          sublabel: c.position || 'Client Contact',
          name: c.name || '', phone: c.phone || '', email: c.email || '',
        });
      });
    }
    opts.push({ id: 'custom', label: 'Custom', sublabel: 'Enter manually', name: '', phone: '', email: '' });
    return opts;
  }, [claim, clientEntity]);

  const handleSelectContact = (opt) => {
    setSelectedContactId(opt.id);
    onContactChange({
      last_contact_source: opt.id === 'client' ? 'Client' : opt.id === 'driver' ? 'Driver' : 'Custom',
      instruction_contact_type: opt.id,
      instruction_contact_name: opt.name || '',
      instruction_contact_email: opt.email || '',
      instruction_contact_phone: opt.phone || '',
    });
  };

  const handleFieldCommit = (field, value) => {
    setSelectedContactId('custom');
    onContactChange({ [field]: value, instruction_contact_type: 'custom', last_contact_source: 'Custom' });
  };

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
  const activeContact = contactOptions.find(o => o.id === selectedContactId) || contactOptions[0];

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
        <p className="font-medium text-sm">Selected Repairer: {selectedBodyshop?.name}</p>
        <p className="text-xs text-muted-foreground">{selectedBodyshop?.email}</p>
      </div>

      {/* ── Instruction Content panel ── */}
      <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-3">
        <h3 className="font-bold text-sm flex items-center gap-1.5">
          <User className="w-4 h-4 text-primary" /> Instruction Content
        </h3>
        <p className="text-xs text-muted-foreground">Choose the instruction contact and which sections appear on the PDF.</p>

        {/* Contact radio list */}
        <div>
          <label className="block text-xs font-medium mb-1.5">Contact for this instruction</label>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {contactOptions.map((opt) => {
              const Icon = opt.id === 'driver' ? Car : opt.id.startsWith('client-contact') ? Users : opt.id === 'custom' ? Phone : User;
              const checked = selectedContactId === opt.id;
              return (
                <label key={opt.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                  <input type="radio" name="bs-contact" checked={checked} onChange={() => handleSelectContact(opt)} className="w-4 h-4 flex-shrink-0" />
                  <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 min-w-0 text-sm">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-muted-foreground"> · {opt.sublabel}</span>
                  </span>
                  <span className="text-xs text-muted-foreground truncate hidden sm:block">
                    {[opt.phone, opt.email].filter(Boolean).join(' · ') || '—'}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Editable contact details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <ContactField label="Contact Name" field="instruction_contact_name" value={claim.instruction_contact_name} onCommit={handleFieldCommit} />
          <ContactField label="Email" field="instruction_contact_email" value={claim.instruction_contact_email} onCommit={handleFieldCommit} />
          <ContactField label="Phone" field="instruction_contact_phone" value={claim.instruction_contact_phone} onCommit={handleFieldCommit} />
        </div>

        {/* Section toggles */}
        <div>
          <label className="block text-xs font-medium mb-1.5">Sections to include</label>
          <div className="flex flex-wrap gap-2">
            {SECTION_OPTIONS.map((s) => (
              <label key={s.key} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs transition-colors ${includeSections[s.key] ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border text-muted-foreground'}`}>
                <input type="checkbox" checked={includeSections[s.key]} onChange={(e) => onToggleSection(s.key, e.target.checked)} className="w-3.5 h-3.5" />
                {s.label}
              </label>
            ))}
          </div>
        </div>
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

      {/* ── Generate PDF ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {generatedPdfUrl && (
          <Button variant="outline" size="sm" onClick={() => window.open(generatedPdfUrl, '_blank')} className="gap-2">
            <Download className="w-4 h-4" /> View PDF
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onGeneratePdf} disabled={isGeneratingPdf} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isGeneratingPdf ? 'animate-spin' : ''}`} />
          {isGeneratingPdf ? 'Generating...' : generatedPdfUrl ? 'Regenerate PDF' : 'Generate PDF'}
        </Button>
      </div>
      {generatedPdfUrl && !isGeneratingPdf && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-2.5 space-y-2">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{savedToDocs ? 'Saved to claim docs.' : 'PDF generated — save it now or it saves at allocation.'}</span>
          </div>
          {!savedToDocs && (
            <Button variant="outline" size="sm" onClick={onSaveToDocs} disabled={isSavingToDocs} className="w-full gap-2 border-green-300 text-green-700 hover:bg-green-100">
              {isSavingToDocs ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save to Claim Docs Now</>}
            </Button>
          )}
        </div>
      )}

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