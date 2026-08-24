import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Sparkles, Send } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { replacePlaceholders } from './WizardConstants';
import { base44 } from '@/api/base44Client';
import { sendInstructionEmail } from '@/functions/sendInstructionEmail';
import { useToast } from '@/components/ui/use-toast';

export default function WizardEmailStep({
  selectedBodyshop, emailTemplates, emailTo, emailSubject, emailBody,
  selectedEmailTemplateId, claim,
  onEmailToChange, onEmailSubjectChange, onEmailBodyChange, onTemplateSelect
}) {
  const [isGenerating, setIsGenerating] = useState(false);
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

  const handleAiGenerate = async () => {
    setIsGenerating(true);
    try {
      const contactName = claim.instruction_contact_name || claim.driver_name || claim.client_name || 'the customer';
      const authorisedBy = claim.authorised_by || 'Client Insurer';
      const insurerName = authorisedBy === 'Third Party Insurer' ? claim.tp_insurer : claim.insurer;
      const claimRef = authorisedBy === 'Third Party Insurer' ? claim.tp_claim_ref : claim.claim_ref;

      const prompt = `You are drafting a professional repair instruction email from RCM Automotive to a bodyshop/repairer, asking them to carry out vehicle body repairs.

Use ONLY the facts below. Do not invent details; if something is missing, leave it out rather than guessing.

Repairer: ${selectedBodyshop?.name || ''}
Repairer email: ${selectedBodyshop?.email || ''}
Repairer phone: ${selectedBodyshop?.phone || ''}

Job number: ${claim.job_number || ''}
Vehicle: ${claim.vehicle_make || ''} ${claim.vehicle_model || ''} (Reg: ${claim.reg || ''})
Vehicle damage: ${claim.vehicle_damage || 'Not specified'}
Vehicle location: ${claim.vehicle_location || 'Not specified'}

Client / Contact name: ${contactName}
Contact phone: ${claim.instruction_contact_phone || claim.driver_phone || claim.client_phone || ''}
Contact email: ${claim.instruction_contact_email || claim.driver_email || claim.client_email || ''}

Authorised by: ${authorisedBy}
Insurer: ${insurerName || ''}
Claim reference: ${claimRef || ''}
Policy number: ${claim.policy_number || ''}
Policy excess: ${claim.policy_excess ? '£' + claim.policy_excess : ''}

Courtesy car required: ${claim.courtesy_car_required ? 'Yes' : 'No'}
Recovery required: ${claim.recovery_required ? 'Yes' : 'No'}
Unroadworthy: ${claim.unroadworthy ? 'Yes' : 'No'}

Instructions for the email body:
- Start with a one-line greeting to the repairer.
- Write a short opening paragraph explaining that we are instructing them to carry out repairs on the vehicle above.
- Then use a CLEARLY LABELED section titled "Vehicle Details" (in capitals on its own line) listing the vehicle, reg, and damage.
- Then a section titled "Customer Contact Details" listing the contact name, phone, and email.
- Then a section titled "Insurance Details" listing the authorised by, insurer, claim reference, and policy number (only include lines that have values).
- Then a section titled "Additional Requirements" listing courtesy car, recovery, and unroadworthy status (only if any are relevant/yes).
- Then a short closing paragraph asking them to confirm acceptance and to contact the customer to arrange booking/collection.
- Sign off with "Kind regards," followed by "RCM Automotive" on the next line.
- Use blank lines between paragraphs and sections so it is easy to read.
- Return JSON with two fields: "subject" (a short email subject line including the job number and vehicle reg) and "body" (the full email body as plain text with the structure above, no markdown).`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" }
          },
          required: ["subject", "body"]
        }
      });

      if (result?.subject) onEmailSubjectChange(result.subject);
      if (result?.body) onEmailBodyChange(result.body);
      onTemplateSelect('');
    } catch (error) {
      console.error('AI email generation failed:', error);
      alert('Failed to generate email with AI. Please try again or write it manually.');
    } finally {
      setIsGenerating(false);
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
        <div className="flex items-end">
          <Button
            onClick={handleAiGenerate}
            disabled={isGenerating}
            variant="outline"
            className="w-full h-10 border-primary/40 text-primary hover:bg-primary/10"
          >
            <Sparkles className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating…' : 'Generate with AI'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">To *</label>
          <Input type="email" value={emailTo} onChange={(e) => onEmailToChange(e.target.value)} placeholder="recipient@example.com" />
        </div>

        <div>
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