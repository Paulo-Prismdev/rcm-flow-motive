import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Sparkles } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { replacePlaceholders } from './WizardConstants';
import { base44 } from '@/api/base44Client';

export default function WizardEmailStep({
  selectedBodyshop, emailTemplates, emailTo, emailSubject, emailBody,
  selectedEmailTemplateId, claim,
  onEmailToChange, onEmailSubjectChange, onEmailBodyChange, onTemplateSelect
}) {
  const [isGenerating, setIsGenerating] = useState(false);

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

Instructions:
- Write a clear, professional email body addressed to the repairer.
- Ask them to confirm acceptance of the repair and to book the vehicle in.
- Mention the vehicle, damage, and where it is located.
- Include the contact details for the customer so the repairer can arrange collection/booking.
- Mention whether a courtesy car is needed and whether recovery is required.
- Reference the insurer and claim reference where relevant.
- Keep it concise and polite. Sign off as "RCM Automotive".
- Return JSON with two fields: "subject" (a short email subject line including the job number and vehicle reg) and "body" (the full email body as plain text, no markdown).`;

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

      <Button onClick={handleOpenInOutlook} className="w-full h-10">
        <Mail className="w-4 h-4 mr-2" /> Open in Outlook
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        You can skip this step if you prefer to send the email manually later.
      </p>
    </div>
  );
}