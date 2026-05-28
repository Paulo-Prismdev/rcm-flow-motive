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
    <div className="space-y-3">
      {/* Type Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {COMPANY_TYPES.map(type => (
          <button
            key={type.id}
            onClick={() => {
              setActiveType(type.id);
              setShowForm(false);
              setEditingItem(null);
            }}
            className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap rounded-lg border transition-all ${
              activeType === type.id ? 'bg-[#131d47] text-white border-[#131d47]' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <type.icon className="w-3.5 h-3.5 inline mr-1.5" />
            {type.label}
          </button>
        ))}
      </div>

      {/* Add Button */}
      {!showForm && (
        <button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="w-full px-3 py-2 text-sm font-medium text-white bg-[#131d47] hover:bg-[#1a2660] rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add {currentConfig.label.slice(0, -1)}
        </button>
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

      {/* Geocode Missing Coordinates Button - Only for Bodyshops */}
      {activeType === 'bodyshop' && !showForm && (
        <GeocodeBodyshopsButton items={items} />
      )}

      {/* List */}
      {isLoading ? (
        <div className="text-center py-6 text-sm text-gray-400">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-400">
          No {currentConfig.label.toLowerCase()} found
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden divide-y divide-gray-200 dark:divide-gray-800">
          {items.map(item => {
            const hasCoordinates = item.latitude && item.longitude;
            return (
              <div
                key={item.id}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-3"
              >
                {item.logo_url ? (
                  <img
                    src={item.logo_url}
                    alt={item.name}
                    className="w-10 h-10 object-contain rounded flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <currentConfig.icon className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</h3>
                    {activeType === 'bodyshop' && !hasCoordinates && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 flex-shrink-0">No GPS</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {item.contact_name} • {item.email}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Delete"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
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

// Component to batch geocode bodyshops missing coordinates
function GeocodeBodyshopsButton({ items }) {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const queryClient = useQueryClient();

  const bodyshopsMissingCoords = items.filter(b => !b.latitude || !b.longitude);

  const handleGeocodeAll = async () => {
    if (bodyshopsMissingCoords.length === 0) return;

    setIsGeocoding(true);
    setProgress({ current: 0, total: bodyshopsMissingCoords.length, success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < bodyshopsMissingCoords.length; i++) {
      const bodyshop = bodyshopsMissingCoords[i];
      setProgress(prev => ({ ...prev, current: i + 1 }));

      const addressToGeocode = [
        bodyshop.address_line_1,
        bodyshop.town,
        bodyshop.postcode
      ].filter(Boolean).join(', ');

      if (!addressToGeocode) {
        failedCount++;
        setProgress(prev => ({ ...prev, failed: failedCount }));
        continue;
      }

      try {
        const response = await base44.functions.invoke('geocodeAddress', { address: addressToGeocode });
        // Response from functions.invoke is an axios response, data is in response.data
        const result = response?.data || response;
        
        console.log(`Geocode result for ${bodyshop.name}:`, result);
        
        if (result && result.latitude && result.longitude) {
          await base44.entities.Bodyshop.update(bodyshop.id, {
            latitude: result.latitude,
            longitude: result.longitude
          });
          successCount++;
          setProgress(prev => ({ ...prev, success: successCount }));
        } else {
          console.log(`No coordinates found for ${bodyshop.name}:`, result);
          failedCount++;
          setProgress(prev => ({ ...prev, failed: failedCount }));
        }
      } catch (error) {
        console.error(`Failed to geocode ${bodyshop.name}:`, error);
        failedCount++;
        setProgress(prev => ({ ...prev, failed: failedCount }));
      }

      // Small delay to avoid rate limiting
      if (i < bodyshopsMissingCoords.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsGeocoding(false);
    queryClient.invalidateQueries({ queryKey: ['Bodyshop'] });
  };

  if (bodyshopsMissingCoords.length === 0) return null;

  return (
    <div className="neomorph-flat p-4 border-l-4 border-orange-400">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-orange-700">
            {bodyshopsMissingCoords.length} bodyshop{bodyshopsMissingCoords.length !== 1 ? 's' : ''} missing map coordinates
          </h4>
          <p className="text-sm text-foreground-muted mt-1">
            These bodyshops won't appear on the map. Click below to automatically geocode their addresses.
          </p>
          
          {isGeocoding ? (
            <div className="mt-3">
              <div className="flex items-center gap-2 text-sm">
                <Loader className="w-4 h-4 animate-spin" />
                <span>Processing {progress.current} of {progress.total}...</span>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all" 
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-foreground-muted mt-1">
                ✓ {progress.success} geocoded • ✗ {progress.failed} failed
              </p>
            </div>
          ) : (
            <Button
              onClick={handleGeocodeAll}
              className="mt-3 neomorph-flat bg-orange-100 text-orange-700 hover:bg-orange-200"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Geocode All Missing ({bodyshopsMissingCoords.length})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}