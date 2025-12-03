import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Upload, X, Building2, Users, Package, MapPin, Loader, AlertCircle } from 'lucide-react';

const COMPANY_TYPES = [
  { id: 'bodyshop', label: 'Bodyshops', icon: Building2, entity: 'Bodyshop' },
  { id: 'referrer', label: 'Referrers', icon: Users, entity: 'Referrer' },
  { id: 'supplier', label: 'Suppliers', icon: Package, entity: 'Supplier' },
];

export default function CompanyManagementTab() {
  const [activeType, setActiveType] = useState('bodyshop');
  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const currentConfig = COMPANY_TYPES.find(t => t.id === activeType);

  const { data: items = [], isLoading } = useQuery({
    queryKey: [currentConfig.entity],
    queryFn: () => base44.entities[currentConfig.entity].list('name'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities[currentConfig.entity].create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [currentConfig.entity] });
      setShowForm(false);
      setEditingItem(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities[currentConfig.entity].update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [currentConfig.entity] });
      setShowForm(false);
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities[currentConfig.entity].delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [currentConfig.entity] });
    },
  });

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const handleSubmit = (formData) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-4">
      {/* Type Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {COMPANY_TYPES.map(type => (
          <button
            key={type.id}
            onClick={() => {
              setActiveType(type.id);
              setShowForm(false);
              setEditingItem(null);
            }}
            className={`neomorph-flat px-4 py-2 text-sm whitespace-nowrap flex items-center gap-2 transition-all ${
              activeType === type.id ? 'border-accent text-accent' : 'hover:border-accent'
            }`}
          >
            <type.icon className="w-4 h-4" />
            {type.label}
          </button>
        ))}
      </div>

      {/* Add Button */}
      {!showForm && (
        <Button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="neomorph-flat bg-accent/10 text-accent"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add {currentConfig.label.slice(0, -1)}
        </Button>
      )}

      {/* Form */}
      {showForm && (
        <CompanyForm
          type={activeType}
          initialData={editingItem}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* List */}
      {isLoading ? (
        <div className="text-center py-8 text-foreground-muted">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-foreground-muted">
          No {currentConfig.label.toLowerCase()} found
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className="neomorph-flat p-4 flex items-center gap-4"
            >
              {item.logo_url ? (
                <img
                  src={item.logo_url}
                  alt={item.name}
                  className="w-12 h-12 object-contain rounded"
                />
              ) : (
                <div className="w-12 h-12 rounded bg-accent/10 flex items-center justify-center">
                  <currentConfig.icon className="w-6 h-6 text-accent" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{item.name}</h3>
                <p className="text-sm text-foreground-muted truncate">
                  {item.contact_name} • {item.email}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleEdit(item)}
                  className="neomorph-flat p-2"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => handleDelete(item)}
                  className="neomorph-flat p-2 text-red-500"
                  title="Delete"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyForm({ type, initialData, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    logo_url: '',
    contact_name: '',
    phone: '',
    email: '',
    address_line_1: '',
    address_line_2: '',
    town: '',
    county: '',
    postcode: '',
    notes: '',
  });
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG or PNG)');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, logo_url: file_url }));
    } catch (error) {
      console.error('Failed to upload logo:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const showNotesField = type === 'referrer' || type === 'supplier';

  return (
    <form onSubmit={handleSubmit} className="neomorph-flat p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">{initialData ? 'Edit' : 'Add'} {type.charAt(0).toUpperCase() + type.slice(1)}</h3>
        <Button type="button" onClick={onCancel} variant="ghost" size="icon">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-medium mb-2">Company Logo</label>
        <div className="flex items-center gap-4">
          {formData.logo_url ? (
            <div className="relative">
              <img
                src={formData.logo_url}
                alt="Logo preview"
                className="w-20 h-20 object-contain rounded border"
              />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <label className="w-20 h-20 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors">
              <Upload className="w-6 h-6 text-foreground-muted" />
              <span className="text-xs text-foreground-muted mt-1">
                {uploading ? 'Uploading...' : 'Upload'}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
          <p className="text-xs text-foreground-muted">
            Upload a JPEG or PNG logo (recommended: 200x200px or larger)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Company Name *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
            className="neomorph-inset"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contact Name *</label>
          <Input
            value={formData.contact_name}
            onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
            required
            className="neomorph-inset"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone *</label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            required
            className="neomorph-inset"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email *</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
            className="neomorph-inset"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Address Line 1</label>
          <Input
            value={formData.address_line_1}
            onChange={(e) => setFormData(prev => ({ ...prev, address_line_1: e.target.value }))}
            className="neomorph-inset"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Address Line 2</label>
          <Input
            value={formData.address_line_2}
            onChange={(e) => setFormData(prev => ({ ...prev, address_line_2: e.target.value }))}
            className="neomorph-inset"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Town/City</label>
          <Input
            value={formData.town}
            onChange={(e) => setFormData(prev => ({ ...prev, town: e.target.value }))}
            className="neomorph-inset"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">County</label>
          <Input
            value={formData.county}
            onChange={(e) => setFormData(prev => ({ ...prev, county: e.target.value }))}
            className="neomorph-inset"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Postcode</label>
          <Input
            value={formData.postcode}
            onChange={(e) => setFormData(prev => ({ ...prev, postcode: e.target.value }))}
            className="neomorph-inset"
          />
        </div>
      </div>

      {showNotesField && (
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <Textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="neomorph-inset"
            rows={3}
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" onClick={onCancel} className="neomorph-flat">
          Cancel
        </Button>
        <Button
          type="submit"
          className="neomorph-flat bg-accent/10 text-accent"
          disabled={isLoading || uploading}
        >
          {isLoading ? 'Saving...' : initialData ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}