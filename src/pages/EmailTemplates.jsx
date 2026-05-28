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
    mutationFn: async (data) => {
      const result = await base44.entities.EmailTemplate.create(data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      setIsModalOpen(false);
      setEditingTemplate(null);
    },
    onError: (error) => {
      console.error('Failed to create template:', error);
      alert('Failed to create template. Please try again.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const result = await base44.entities.EmailTemplate.update(id, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      setIsModalOpen(false);
      setEditingTemplate(null);
    },
    onError: (error) => {
      console.error('Failed to update template:', error);
      alert('Failed to update template. Please try again.');
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
    <div className="space-y-3">
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Email Templates</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Manage email templates for different item types</p>
          </div>
          <button onClick={handleCreate} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0 whitespace-nowrap">
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-6 text-gray-500 text-sm">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            No email templates yet. Create your first template to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <div key={template.id} className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm">{template.name}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex-shrink-0">
                        {template.item_type}
                      </span>
                    </div>
                    {template.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-1">{template.description}</p>
                    )}
                    <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5 truncate">
                      <span className="font-medium">Subject:</span> {template.subject}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                      disabled={deleteMutation.isLoading}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
        onSubmit={async (data) => {
          try {
            if (editingTemplate) {
              await updateMutation.mutateAsync({ id: editingTemplate.id, data });
            } else {
              await createMutation.mutateAsync(data);
            }
          } catch (error) {
            console.error('Template save error:', error);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="text-lg">{template ? 'Edit Template' : 'Create Template'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Template Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Authority Request"
              className="text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Item Type *</label>
              <Select
                value={formData.item_type}
                onValueChange={(value) => setFormData({ ...formData, item_type: value })}
              >
                <SelectTrigger className="text-sm">
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
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="When to use"
                className="text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Subject *</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="text-[10px] px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    + Placeholder
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-48 overflow-y-auto text-xs">
                  {availablePlaceholders.map(({ tag, label }) => (
                    <DropdownMenuItem
                      key={tag}
                      onSelect={(e) => {
                        e.preventDefault();
                        insertPlaceholder(tag, 'subject');
                      }}
                    >
                      <span className="font-mono text-[10px] mr-1">{tag}</span>
                      <span className="text-gray-500 dark:text-gray-400">{label}</span>
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
              className="text-sm"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Body *</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="text-[10px] px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    + Placeholder
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-48 overflow-y-auto text-xs">
                  {availablePlaceholders.map(({ tag, label }) => (
                    <DropdownMenuItem
                      key={tag}
                      onSelect={(e) => {
                        e.preventDefault();
                        insertPlaceholder(tag, 'body');
                      }}
                    >
                      <span className="font-mono text-[10px] mr-1">{tag}</span>
                      <span className="text-gray-500 dark:text-gray-400">{label}</span>
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
              className="h-40 font-mono text-xs"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLoading || !formData.name || !formData.subject || !formData.body}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSubmit(formData);
              }}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium flex items-center gap-1"
            >
              <Save className="w-3 h-3" />
              {isLoading ? 'Saving...' : (template ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}