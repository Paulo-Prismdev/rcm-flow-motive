import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Available placeholders for each item type
const PLACEHOLDERS = {
  Claim: [
    { tag: '{{reg}}', label: 'Registration' },
    { tag: '{{client_name}}', label: 'Client Name' },
    { tag: '{{client_phone}}', label: 'Client Phone' },
    { tag: '{{client_email}}', label: 'Client Email' },
    { tag: '{{make_model}}', label: 'Make/Model' },
    { tag: '{{insurer}}', label: 'Insurer' },
    { tag: '{{claim_ref}}', label: 'Claim Reference' },
    { tag: '{{policy_number}}', label: 'Policy Number' },
    { tag: '{{bodyshop}}', label: 'Bodyshop' },
    { tag: '{{referrer}}', label: 'Referrer' },
    { tag: '{{job_status}}', label: 'Job Status' },
    { tag: '{{date_received}}', label: 'Date Received' },
    { tag: '{{vehicle_location}}', label: 'Vehicle Location' },
    { tag: '{{circumstances}}', label: 'Circumstances' },
  ],
  Estimate: [
    { tag: '{{name}}', label: 'Job Reference' },
    { tag: '{{repairer}}', label: 'Repairer' },
    { tag: '{{email_address}}', label: 'Email Address' },
    { tag: '{{make_model}}', label: 'Make/Model' },
    { tag: '{{insurer_work_provider}}', label: 'Insurer/Work Provider' },
    { tag: '{{claim_number}}', label: 'Claim Number' },
    { tag: '{{status}}', label: 'Status' },
    { tag: '{{date_received}}', label: 'Date Received' },
    { tag: '{{estimate_value}}', label: 'Estimate Value' },
    { tag: '{{authorised_value}}', label: 'Authorised Value' },
  ],
  Engineering: [
    { tag: '{{reference}}', label: 'Reference' },
    { tag: '{{vehicle_reg}}', label: 'Vehicle Registration' },
    { tag: '{{make_model}}', label: 'Make/Model' },
    { tag: '{{client_name}}', label: 'Client Name' },
    { tag: '{{client_phone}}', label: 'Client Phone' },
    { tag: '{{client_email}}', label: 'Client Email' },
    { tag: '{{insurer}}', label: 'Insurer' },
    { tag: '{{engineer_assigned}}', label: 'Engineer Assigned' },
    { tag: '{{status}}', label: 'Status' },
    { tag: '{{inspection_date}}', label: 'Inspection Date' },
    { tag: '{{vehicle_location}}', label: 'Vehicle Location' },
  ],
  Part: [
    { tag: '{{vehicle_ref}}', label: 'Vehicle Reference' },
    { tag: '{{manufacturer}}', label: 'Manufacturer' },
    { tag: '{{part_description}}', label: 'Part Description' },
    { tag: '{{part_number}}', label: 'Part Number' },
    { tag: '{{bodyshop_company}}', label: 'Bodyshop Company' },
    { tag: '{{contact_name}}', label: 'Contact Name' },
    { tag: '{{contact_email}}', label: 'Contact Email' },
    { tag: '{{supplier}}', label: 'Supplier' },
    { tag: '{{sourcing_status}}', label: 'Sourcing Status' },
    { tag: '{{delivery_time}}', label: 'Delivery Time' },
  ],
  General: [
    { tag: '{{recipient_name}}', label: 'Recipient Name' },
    { tag: '{{date}}', label: 'Date' },
    { tag: '{{company_name}}', label: 'Company Name' },
  ],
};

export default function EmailTemplates() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.EmailTemplate.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      setIsModalOpen(false);
      setEditingTemplate(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmailTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      setIsModalOpen(false);
      setEditingTemplate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
    },
  });

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="neomorph p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Email Templates</h2>
            <p className="text-sm text-foreground-muted">Manage email templates for different item types</p>
          </div>
          <Button onClick={handleCreate} className="neomorph-flat px-4 py-2 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Template
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-foreground-muted">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-foreground-muted">
            No email templates yet. Create your first template to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div key={template.id} className="neomorph-flat p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold">{template.name}</h3>
                      <span className="neomorph-flat px-2 py-1 text-xs">
                        {template.item_type}
                      </span>
                    </div>
                    {template.description && (
                      <p className="text-sm text-foreground-muted mb-2">{template.description}</p>
                    )}
                    <p className="text-xs text-foreground-subtle">
                      <strong>Subject:</strong> {template.subject}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(template)}
                      variant="ghost"
                      size="icon"
                      className="neomorph-flat p-2"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(template.id)}
                      variant="ghost"
                      size="icon"
                      className="neomorph-flat p-2 text-red-600"
                      disabled={deleteMutation.isLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TemplateFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTemplate(null);
        }}
        template={editingTemplate}
        onSubmit={(data) => {
          if (editingTemplate) {
            updateMutation.mutate({ id: editingTemplate.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

function TemplateFormModal({ isOpen, onClose, template, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    name: '',
    item_type: 'General',
    subject: '',
    body: '',
    description: '',
  });

  const subjectRef = useRef(null);
  const bodyRef = useRef(null);

  React.useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        item_type: template.item_type || 'General',
        subject: template.subject || '',
        body: template.body || '',
        description: template.description || '',
      });
    } else {
      setFormData({
        name: '',
        item_type: 'General',
        subject: '',
        body: '',
        description: '',
      });
    }
  }, [template, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const insertPlaceholder = (placeholder, field) => {
    if (field === 'subject' && subjectRef.current) {
      const input = subjectRef.current;
      const start = input.selectionStart || formData.subject.length;
      const end = input.selectionEnd || formData.subject.length;
      const newValue = formData.subject.substring(0, start) + placeholder + formData.subject.substring(end);
      setFormData({ ...formData, subject: newValue });
      
      // Set cursor position after inserted placeholder
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    } else if (field === 'body' && bodyRef.current) {
      const textarea = bodyRef.current;
      const start = textarea.selectionStart || formData.body.length;
      const end = textarea.selectionEnd || formData.body.length;
      const newValue = formData.body.substring(0, start) + placeholder + formData.body.substring(end);
      setFormData({ ...formData, body: newValue });
      
      // Set cursor position after inserted placeholder
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    }
  };

  const availablePlaceholders = PLACEHOLDERS[formData.item_type] || PLACEHOLDERS.General;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit Template' : 'Create Template'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Template Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Authority Request"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Item Type *</label>
            <Select
              value={formData.item_type}
              onValueChange={(value) => setFormData({ ...formData, item_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="General">General</SelectItem>
                <SelectItem value="Claim">Claim</SelectItem>
                <SelectItem value="Estimate">Estimate</SelectItem>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="Part">Part</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of when to use this template"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Subject *</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="text-xs">
                    + Insert Placeholder
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-64 overflow-y-auto">
                  {availablePlaceholders.map(({ tag, label }) => (
                    <DropdownMenuItem
                      key={tag}
                      onSelect={(e) => {
                        e.preventDefault();
                        insertPlaceholder(tag, 'subject');
                      }}
                    >
                      <span className="font-mono text-xs mr-2">{tag}</span>
                      <span className="text-foreground-muted">{label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Input
              ref={subjectRef}
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Email subject"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Body *</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="text-xs">
                    + Insert Placeholder
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-64 overflow-y-auto">
                  {availablePlaceholders.map(({ tag, label }) => (
                    <DropdownMenuItem
                      key={tag}
                      onSelect={(e) => {
                        e.preventDefault();
                        insertPlaceholder(tag, 'body');
                      }}
                    >
                      <span className="font-mono text-xs mr-2">{tag}</span>
                      <span className="text-foreground-muted">{label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Textarea
              ref={bodyRef}
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Email body"
              className="h-64 font-mono text-sm"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isLoading || !formData.name || !formData.subject || !formData.body}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Submitting template:', formData);
                onSubmit(formData);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Saving...' : (template ? 'Update Template' : 'Create Template')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}