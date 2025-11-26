import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Loader, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Function to replace placeholders in template with actual data
const replacePlaceholders = (text, itemData) => {
  if (!text || !itemData) return text;
  
  let result = text;
  
  // Replace all {{field}} placeholders with actual values
  Object.keys(itemData).forEach(key => {
    const value = itemData[key];
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value || '');
  });
  
  return result;
};

// Extract all email addresses from item data
const extractEmails = (itemData) => {
  if (!itemData) return [];
  
  const emailFields = [
    { key: 'client_email', label: 'Client' },
    { key: 'email', label: 'Email' },
    { key: 'contact_email', label: 'Contact' },
    { key: 'bodyshop_email', label: 'Bodyshop' },
    { key: 'repairer_email', label: 'Repairer' },
    { key: 'email_address', label: 'Email Address' },
    { key: 'referrer_email', label: 'Referrer' },
    { key: 'tp_email', label: 'Third Party' },
  ];
  
  const emails = [];
  emailFields.forEach(({ key, label }) => {
    if (itemData[key] && itemData[key].includes('@')) {
      emails.push({
        email: itemData[key],
        label: `${label} (${itemData[key]})`
      });
    }
  });
  
  return emails;
};

export default function EmailComposerModal({ isOpen, onClose, itemType, itemData }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [useCustomEmail, setUseCustomEmail] = useState(false);

  // Query email templates
  const { data: templates = [] } = useQuery({
    queryKey: ['emailTemplates', itemType],
    queryFn: async () => {
      const allTemplates = await base44.entities.EmailTemplate.list();
      // Filter templates for this item type or general templates
      return allTemplates.filter(t => t.item_type === itemType || t.item_type === 'General');
    },
    enabled: isOpen,
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (emailData) => {
      return base44.integrations.Core.SendEmail({
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
      });
    },
    onSuccess: () => {
      onClose();
      // Reset form
      setTo('');
      setSubject('');
      setBody('');
      setSelectedTemplateId('');
      setUseCustomEmail(false);
    },
  });

  // Get available emails from item
  const availableEmails = extractEmails(itemData);

  // Pre-select first available email
  useEffect(() => {
    if (isOpen && availableEmails.length > 0 && !to) {
      setTo(availableEmails[0].email);
      setUseCustomEmail(false);
    }
  }, [isOpen, itemData]);

  // Handle template selection
  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        // Replace placeholders in subject and body
        const processedSubject = replacePlaceholders(template.subject, itemData);
        const processedBody = replacePlaceholders(template.body, itemData);
        
        setSubject(processedSubject);
        setBody(processedBody);
      }
    } else {
      // Clear if "None" selected
      setSubject('');
      setBody('');
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!to || !subject || !body) {
      alert('Please fill in all fields');
      return;
    }
    
    sendEmailMutation.mutate({ to, subject, body });
  };

  const handleOpenInOutlook = () => {
    if (!to) {
      alert('Please select a recipient');
      return;
    }
    
    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(body || '')}`;
    window.location.href = mailtoUrl;
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSend} className="space-y-4">
          {/* Template Selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Email Template (Optional)</label>
            <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template or write custom email" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None (Custom Email)</SelectItem>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplateId && (
              <p className="text-xs text-foreground-muted mt-1">
                {templates.find(t => t.id === selectedTemplateId)?.description}
              </p>
            )}
          </div>

          {/* To Field - Select from available emails or enter custom */}
          <div>
            <label className="block text-sm font-medium mb-2">To *</label>
            {!useCustomEmail && availableEmails.length > 0 ? (
              <div className="space-y-2">
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmails.map((item, index) => (
                      <SelectItem key={index} value={item.email}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUseCustomEmail(true);
                    setTo('');
                  }}
                  className="text-xs"
                >
                  Or enter custom email address
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="recipient@example.com"
                  required
                />
                {availableEmails.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUseCustomEmail(false);
                      setTo(availableEmails[0].email);
                    }}
                    className="text-xs"
                  >
                    Select from available emails
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Subject Field */}
          <div>
            <label className="block text-sm font-medium mb-2">Subject *</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              required
            />
          </div>

          {/* Body Field */}
          <div>
            <label className="block text-sm font-medium mb-2">Message *</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email message"
              className="h-64"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={sendEmailMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleOpenInOutlook}
              className="flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Open in Outlook
            </Button>
            <Button
              type="submit"
              disabled={sendEmailMutation.isPending}
              className="flex items-center gap-2"
            >
              {sendEmailMutation.isPending ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send via System
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}