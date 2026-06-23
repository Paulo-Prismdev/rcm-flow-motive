import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { replacePlaceholders } from './WizardConstants';

export default function WizardEmailStep({
  selectedBodyshop, emailTemplates, emailTo, emailSubject, emailBody,
  selectedEmailTemplateId, claim,
  onEmailToChange, onEmailSubjectChange, onEmailBodyChange, onTemplateSelect
}) {
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
    const mailtoUrl = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(emailSubject || '')}&body=${encodeURIComponent(emailBody || '')}`;
    window.location.href = mailtoUrl;
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
        <p className="font-medium">Selected Repairer: {selectedBodyshop?.name}</p>
        <p className="text-sm text-muted-foreground">{selectedBodyshop?.email}</p>
      </div>

      <h3 className="font-bold text-lg">Compose Email to Repairer</h3>
      <p className="text-sm text-muted-foreground">
        Send the instruction email to the bodyshop. This will open in your default email client (Outlook).
      </p>

      <div>
        <label className="block text-sm font-medium mb-2">Email Template (Optional)</label>
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

      <div>
        <label className="block text-sm font-medium mb-2">To *</label>
        <Input type="email" value={emailTo} onChange={(e) => onEmailToChange(e.target.value)} placeholder="recipient@example.com" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Subject</label>
        <Input value={emailSubject} onChange={(e) => onEmailSubjectChange(e.target.value)} placeholder="Email subject" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Message</label>
        <Textarea value={emailBody} onChange={(e) => onEmailBodyChange(e.target.value)} placeholder="Email message" className="h-40" />
      </div>

      <Button onClick={handleOpenInOutlook} className="w-full py-3">
        <Mail className="w-4 h-4 mr-2" /> Open in Outlook
      </Button>

      <p className="text-xs text-muted-foreground">
        You can skip this step if you prefer to send the email manually later.
      </p>
    </div>
  );
}