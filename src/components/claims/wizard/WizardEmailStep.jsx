import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Send } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { replacePlaceholders } from './WizardConstants';
import { sendInstructionEmail } from '@/functions/sendInstructionEmail';
import { useToast } from '@/components/ui/use-toast';

export default function WizardEmailStep({
  selectedBodyshop, emailTemplates, emailTo, emailCc, emailSubject, emailBody,
  selectedEmailTemplateId, claim,
  onEmailToChange, onEmailCcChange, onEmailSubjectChange, onEmailBodyChange, onTemplateSelect
}) {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleTemplateSelect = (templateId) => {
    onTemplateSelect(templateId);
    if (templateId && templateId !== 'null') {
      const template = emailTemplates.find(t => t.id === templateId);
      if (template) {
        const itemData = {
          ...claim,
          bodyshop: selectedBodyshop?.name,
          bodyshop_name: selectedBodyshop?.name,
          bodyshop_email: selectedBodyshop?.email,
          bodyshop_phone: selectedBodyshop?.phone,
        };
        onEmailSubjectChange(replacePlaceholders(template.subject, itemData));
        onEmailBodyChange(replacePlaceholders(template.body, itemData));
      }
    }
  };

  const handleOpenInOutlook = () => {
    if (!emailTo) {
      alert('Please enter a recipient email');
      return;
    }
    const ccParam = emailCc ? `&cc=${encodeURIComponent(emailCc)}` : '';
    const mailtoUrl = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(emailSubject || '')}${ccParam}&body=${encodeURIComponent(emailBody || '')}`;
    window.location.href = mailtoUrl;
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
        claim_id: claim?.id,
        job_number: claim?.job_number
      });
      const data = res?.data || res;
      if (data?.success) {
        toast({ title: 'Email sent', description: `Branded instruction email sent to ${emailTo}.` });
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to send branded email:', error);
      toast({ title: 'Send failed', description: error.message || 'Could not send the email. Please try again or use Outlook.', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
        <p className="font-medium text-sm">Selected Repairer: {selectedBodyshop?.name}</p>
        <p className="text-xs text-muted-foreground">{selectedBodyshop?.email}</p>
      </div>

      <h3 className="font-bold text-sm">Compose Email to Repairer</h3>
      <p className="text-xs text-muted-foreground">
        Send the instruction email to the bodyshop. This will open in your default email client (Outlook).
      </p>

      <div>
        <label className="block text-xs font-medium mb-1">Email Template (Optional)</label>
        <Select value={selectedEmailTemplateId || 'none'} onValueChange={handleTemplateSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select a template or write custom email" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (Custom Email)</SelectItem>
            {emailTemplates.map(template => (
              <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
            ))}
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
          <Input type="email" value={emailCc} onChange={(e) => onEmailCcChange(e.target.value)} placeholder="cc@example.com (comma-separated)" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1">Subject</label>
          <Input value={emailSubject} onChange={(e) => onEmailSubjectChange(e.target.value)} placeholder="Email subject" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">Message</label>
        <Textarea value={emailBody} onChange={(e) => onEmailBodyChange(e.target.value)} placeholder="Email message" className="h-28" />
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
  );
}