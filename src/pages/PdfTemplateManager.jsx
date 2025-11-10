import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  FileText,
  CheckSquare,
  Square,
  GripVertical,
  Settings,
  Share2,
  Lock,
  Users,
  Globe
} from 'lucide-react';
import ShareTemplateModal from '../components/pdfTemplates/ShareTemplateModal';

export default function PdfTemplateManager() {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sharingTemplate, setSharingTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['pdfTemplates'],
    queryFn: () => base44.entities.PdfTemplateConfig.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PdfTemplateConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfTemplates'] });
      setIsCreating(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PdfTemplateConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfTemplates'] });
      setSelectedTemplate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PdfTemplateConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfTemplates'] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (template) => {
      const { id, created_date, updated_date, created_by, ...templateData } = template;
      return base44.entities.PdfTemplateConfig.create({
        ...templateData,
        template_name: `${template.template_name} (Copy)`,
        is_default: false,
        visibility: 'private',
        shared_with_users: [],
        shared_with_roles: [],
        shared_with_departments: [],
        can_edit_users: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfTemplates'] });
    },
  });

  const canEditTemplate = (template) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (template.created_by === currentUser.email) return true;
    if (template.can_edit_users?.includes(currentUser.email)) return true;
    return false;
  };

  const canDeleteTemplate = (template) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (template.created_by === currentUser.email) return true;
    return false;
  };

  const canDuplicateTemplate = (template) => {
    if (!currentUser) return false;
    return template.allow_others_to_duplicate !== false;
  };

  const getVisibilityIcon = (visibility) => {
    switch (visibility) {
      case 'private':
        return <Lock className="w-4 h-4" />;
      case 'team':
        return <Users className="w-4 h-4" />;
      case 'organization':
        return <Globe className="w-4 h-4" />;
      default:
        return <Lock className="w-4 h-4" />;
    }
  };

  const getVisibilityLabel = (visibility) => {
    switch (visibility) {
      case 'private':
        return 'Private';
      case 'team':
        return 'Shared';
      case 'organization':
        return 'Organization';
      default:
        return 'Private';
    }
  };

  if (selectedTemplate || isCreating) {
    return (
      <TemplateEditor
        template={selectedTemplate}
        onSave={(data) => {
          if (selectedTemplate) {
            updateMutation.mutate({ id: selectedTemplate.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        onCancel={() => {
          setSelectedTemplate(null);
          setIsCreating(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <ShareTemplateModal
        template={sharingTemplate}
        isOpen={!!sharingTemplate}
        onClose={() => setSharingTemplate(null)}
        onSave={(shareData) => {
          updateMutation.mutate({ id: sharingTemplate.id, data: shareData });
          setSharingTemplate(null);
        }}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="neomorph p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">PDF Template Manager</h1>
              <p className="text-foreground-muted">Create, customize, and share PDF instruction templates</p>
            </div>
            <Button
              onClick={() => setIsCreating(true)}
              className="neomorph-flat flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Template
            </Button>
          </div>
        </div>

        {/* Templates List */}
        {isLoading ? (
          <div className="text-center py-12">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="neomorph p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-foreground-muted" />
            <h3 className="text-lg font-semibold mb-2">No Templates Yet</h3>
            <p className="text-foreground-muted mb-4">Create your first custom PDF template</p>
            <Button onClick={() => setIsCreating(true)} className="neomorph-flat">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              const isOwner = template.created_by === currentUser?.email;
              const canEdit = canEditTemplate(template);
              const canDelete = canDeleteTemplate(template);
              const canDuplicate = canDuplicateTemplate(template);

              return (
                <div key={template.id} className="neomorph p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg mb-1 truncate">{template.template_name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-1 rounded neomorph-flat flex items-center gap-1">
                          {getVisibilityIcon(template.visibility)}
                          {getVisibilityLabel(template.visibility)}
                        </span>
                        <span className="text-xs px-2 py-1 rounded neomorph-flat">
                          {template.template_type}
                        </span>
                        {template.is_default && (
                          <span className="text-xs px-2 py-1 rounded bg-gold/20 text-gold font-semibold">
                            Default
                          </span>
                        )}
                        {!template.is_active && (
                          <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">
                            Inactive
                          </span>
                        )}
                        {!isOwner && (
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-600">
                            Shared
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-foreground-muted mb-4 space-y-1">
                    <div>• {template.sections_config?.length || 0} sections configured</div>
                    <div>• {template.header_config?.show_logo ? 'Logo enabled' : 'No logo'}</div>
                    <div>• {template.footer_config?.show_footer ? 'Footer enabled' : 'No footer'}</div>
                    {template.shared_with_users?.length > 0 && (
                      <div>• Shared with {template.shared_with_users.length} user(s)</div>
                    )}
                    {template.visibility === 'organization' && (
                      <div className="text-blue-600 font-medium">• Available to all users</div>
                    )}
                  </div>

                  {isOwner && (
                    <div className="text-xs text-foreground-muted mb-3 pb-3 border-b border-gray-200">
                      Created by you
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {canEdit && (
                      <Button
                        onClick={() => setSelectedTemplate(template)}
                        className="flex-1 neomorph-flat text-sm"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}
                    {isOwner && (
                      <Button
                        onClick={() => setSharingTemplate(template)}
                        className="neomorph-flat text-sm"
                        title="Share template"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    )}
                    {canDuplicate && (
                      <Button
                        onClick={() => duplicateMutation.mutate(template)}
                        className="neomorph-flat text-sm"
                        disabled={duplicateMutation.isLoading}
                        title="Duplicate template"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        onClick={() => {
                          if (confirm('Delete this template? This cannot be undone.')) {
                            deleteMutation.mutate(template.id);
                          }
                        }}
                        className="neomorph-flat text-sm text-red-600"
                        disabled={deleteMutation.isLoading}
                        title="Delete template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateEditor({ template, onSave, onCancel }) {
  const [formData, setFormData] = useState(template || {
    template_name: '',
    template_type: 'custom',
    logo_url: 'https://static.wixstatic.com/media/5c6f27_83688e603c0547b0bc1ca365405be769~mv2.jpg/v1/fill/w_600,h_587,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/external-file_edited.jpg',
    logo_size: { width: 50, height: 30 },
    header_config: {
      show_logo: true,
      show_claim_type: true,
      custom_text: ''
    },
    sections_config: [
      {
        section_id: 'repairer',
        section_name: 'Repairer & Client Details',
        enabled: true,
        order: 1,
        fields: [
          { field_id: 'bodyshop', field_label: 'Appointed Repairer', enabled: true },
          { field_id: 'client_name', field_label: 'Client Name', enabled: true },
          { field_id: 'client_address', field_label: 'Client Address', enabled: true },
          { field_id: 'driver_contact_name', field_label: 'Contact Name', enabled: true },
          { field_id: 'client_email', field_label: 'Email Address', enabled: true },
          { field_id: 'client_phone', field_label: 'Contact Number', enabled: true },
          { field_id: 'client_vat_status', field_label: 'Clients VAT Status', enabled: true }
        ]
      },
      {
        section_id: 'vehicle',
        section_name: 'Vehicle Details',
        enabled: true,
        order: 2,
        fields: [
          { field_id: 'make_model', field_label: 'Vehicle Make & Model', enabled: true },
          { field_id: 'reg', field_label: 'Vehicle Registration', enabled: true },
          { field_id: 'vehicle_location', field_label: 'Vehicle Location', enabled: true },
          { field_id: 'vehicle_damage', field_label: 'Vehicle Damage', enabled: true },
          { field_id: 'recovery_required', field_label: 'Urgent Recovery Required?', enabled: true },
          { field_id: 'unroadworthy', field_label: 'Vehicle Unroadworthy', enabled: true },
          { field_id: 'courtesy_car_required', field_label: 'Courtesy Car Required?', enabled: true }
        ]
      },
      {
        section_id: 'insurance',
        section_name: 'Insurance Details',
        enabled: true,
        order: 3,
        fields: [
          { field_id: 'insurer', field_label: 'Insurer', enabled: true },
          { field_id: 'claim_ref', field_label: 'Claim Number', enabled: true },
          { field_id: 'policy_number', field_label: 'Policy Number', enabled: true },
          { field_id: 'send_estimate_email', field_label: 'Email Estimate to', enabled: true },
          { field_id: 'audatex_code', field_label: 'Audatex Code', enabled: true },
          { field_id: 'policy_excess', field_label: 'Excess', enabled: true }
        ]
      }
    ],
    footer_config: {
      show_footer: true,
      company_name: 'Artura',
      address: 'Artura, The Nexus, Systematic Business Park, Old Ipswich Rd, Ardleigh, Colchester CO7 7QL',
      contact_info: 'www.artura.uk | info@artura.uk'
    },
    payment_terms: {
      show_section: true,
      terms_text: '24 HOUR PAYMENT via ACG'
    },
    invoice_deductions: {
      show_section: true,
      custom_deductions: []
    },
    visibility: 'private',
    shared_with_users: [],
    shared_with_roles: [],
    shared_with_departments: [],
    can_edit_users: [],
    allow_others_to_duplicate: true,
    is_active: true
  });

  const toggleSection = (sectionId) => {
    setFormData(prev => ({
      ...prev,
      sections_config: prev.sections_config.map(s =>
        s.section_id === sectionId ? { ...s, enabled: !s.enabled } : s
      )
    }));
  };

  const toggleField = (sectionId, fieldId) => {
    setFormData(prev => ({
      ...prev,
      sections_config: prev.sections_config.map(section =>
        section.section_id === sectionId
          ? {
              ...section,
              fields: section.fields.map(f =>
                f.field_id === fieldId ? { ...f, enabled: !f.enabled } : f
              )
            }
          : section
      )
    }));
  };

  const moveSectionUp = (index) => {
    if (index === 0) return;
    const newSections = [...formData.sections_config];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    newSections.forEach((s, i) => s.order = i + 1);
    setFormData(prev => ({ ...prev, sections_config: newSections }));
  };

  const moveSectionDown = (index) => {
    if (index === formData.sections_config.length - 1) return;
    const newSections = [...formData.sections_config];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    newSections.forEach((s, i) => s.order = i + 1);
    setFormData(prev => ({ ...prev, sections_config: newSections }));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="neomorph p-6 mb-6">
          <div className="flex items-center gap-4">
            <Button onClick={onCancel} className="neomorph-flat p-3">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">
                {template ? 'Edit Template' : 'Create Template'}
              </h1>
            </div>
            <Button
              onClick={() => onSave(formData)}
              className="neomorph-flat px-6 py-3 bg-accent/10 font-medium"
            >
              Save Template
            </Button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="neomorph p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Template Name *</label>
              <Input
                value={formData.template_name}
                onChange={(e) => setFormData(prev => ({ ...prev, template_name: e.target.value }))}
                className="neomorph-inset"
                placeholder="e.g., Standard Instruction"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Template Type</label>
              <select
                value={formData.template_type}
                onChange={(e) => setFormData(prev => ({ ...prev, template_type: e.target.value }))}
                className="neomorph-inset w-full px-4 py-3 rounded-xl border-0"
              >
                <option value="standard">Standard</option>
                <option value="driversure">Driversure</option>
                <option value="orkin">Orkin</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        </div>

        {/* Header Configuration */}
        <div className="neomorph p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">Header Configuration</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFormData(prev => ({
                  ...prev,
                  header_config: { ...prev.header_config, show_logo: !prev.header_config.show_logo }
                }))}
                className="neomorph-flat p-2"
              >
                {formData.header_config.show_logo ? (
                  <CheckSquare className="w-5 h-5 text-accent" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>
              <span className="font-medium">Show Logo</span>
            </div>

            {formData.header_config.show_logo && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-10">
                <div className="md:col-span-2">
                  <label className="block text-sm mb-2">Logo URL</label>
                  <Input
                    value={formData.logo_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                    className="neomorph-inset"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Width (mm)</label>
                  <Input
                    type="number"
                    value={formData.logo_size.width}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      logo_size: { ...prev.logo_size, width: parseInt(e.target.value) }
                    }))}
                    className="neomorph-inset"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setFormData(prev => ({
                  ...prev,
                  header_config: { ...prev.header_config, show_claim_type: !prev.header_config.show_claim_type }
                }))}
                className="neomorph-flat p-2"
              >
                {formData.header_config.show_claim_type ? (
                  <CheckSquare className="w-5 h-5 text-accent" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>
              <span className="font-medium">Show Claim Type Header</span>
            </div>
          </div>
        </div>

        {/* Sections Configuration */}
        <div className="neomorph p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">Sections & Fields</h2>
          <p className="text-sm text-foreground-muted mb-4">
            Configure which sections and fields to include in the PDF
          </p>

          <div className="space-y-4">
            {formData.sections_config.map((section, sectionIndex) => (
              <div key={section.section_id} className="neomorph-flat p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveSectionUp(sectionIndex)}
                      disabled={sectionIndex === 0}
                      className="neomorph-flat p-1 disabled:opacity-30"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => toggleSection(section.section_id)}
                    className="neomorph-flat p-2"
                  >
                    {section.enabled ? (
                      <CheckSquare className="w-5 h-5 text-accent" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                  <span className="font-semibold flex-1">{section.section_name}</span>
                  <span className="text-sm text-foreground-muted">
                    {section.fields.filter(f => f.enabled).length} / {section.fields.length} fields
                  </span>
                </div>

                {section.enabled && (
                  <div className="ml-10 space-y-2">
                    {section.fields.map((field) => (
                      <div key={field.field_id} className="flex items-center gap-3 py-2">
                        <button
                          onClick={() => toggleField(section.section_id, field.field_id)}
                          className="neomorph-flat p-1"
                        >
                          {field.enabled ? (
                            <CheckSquare className="w-4 h-4 text-accent" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <span className="text-sm">{field.field_label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Configuration */}
        <div className="neomorph p-6">
          <h2 className="font-bold text-lg mb-4">Footer Configuration</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFormData(prev => ({
                  ...prev,
                  footer_config: { ...prev.footer_config, show_footer: !prev.footer_config.show_footer }
                }))}
                className="neomorph-flat p-2"
              >
                {formData.footer_config.show_footer ? (
                  <CheckSquare className="w-5 h-5 text-accent" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>
              <span className="font-medium">Show Footer</span>
            </div>

            {formData.footer_config.show_footer && (
              <div className="ml-10 space-y-4">
                <div>
                  <label className="block text-sm mb-2">Company Address</label>
                  <Input
                    value={formData.footer_config.address}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      footer_config: { ...prev.footer_config, address: e.target.value }
                    }))}
                    className="neomorph-inset"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Contact Info</label>
                  <Input
                    value={formData.footer_config.contact_info}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      footer_config: { ...prev.footer_config, contact_info: e.target.value }
                    }))}
                    className="neomorph-inset"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}