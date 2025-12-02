import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Image, 
  ExternalLink, 
  GripVertical,
  X,
  Save,
  Upload
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PortalManagementTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdvert, setEditingAdvert] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    image_url: '',
    link_url: '',
    alt_text: '',
    is_active: true,
    sort_order: 0
  });
  const [isUploading, setIsUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: adverts = [], isLoading } = useQuery({
    queryKey: ['advertBanners'],
    queryFn: () => base44.entities.AdvertBanner.list('sort_order'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AdvertBanner.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertBanners'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AdvertBanner.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertBanners'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AdvertBanner.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertBanners'] });
    },
  });

  const openModal = (advert = null) => {
    if (advert) {
      setEditingAdvert(advert);
      setFormData({
        name: advert.name || '',
        image_url: advert.image_url || '',
        link_url: advert.link_url || '',
        alt_text: advert.alt_text || '',
        is_active: advert.is_active !== false,
        sort_order: advert.sort_order || 0
      });
    } else {
      setEditingAdvert(null);
      setFormData({
        name: '',
        image_url: '',
        link_url: '',
        alt_text: '',
        is_active: true,
        sort_order: adverts.length
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAdvert(null);
    setFormData({
      name: '',
      image_url: '',
      link_url: '',
      alt_text: '',
      is_active: true,
      sort_order: 0
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.image_url) {
      alert('Please provide a name and image URL');
      return;
    }
    if (editingAdvert) {
      updateMutation.mutate({ id: editingAdvert.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this advert?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (advert) => {
    updateMutation.mutate({ 
      id: advert.id, 
      data: { ...advert, is_active: !advert.is_active } 
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: result.file_url }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Advert Banners Header */}
      <div className="neomorph p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">Advert Banners</h2>
            <p className="text-sm text-foreground-muted">
              Manage adverts shown in the Repairer Portal. Recommended image size: 1200x150px
            </p>
          </div>
          <Button onClick={() => openModal()} className="neomorph-flat gap-2">
            <Plus className="w-4 h-4" />
            Add Advert
          </Button>
        </div>

        {/* Adverts List */}
        {isLoading ? (
          <div className="text-center py-8 text-foreground-muted">Loading...</div>
        ) : adverts.length === 0 ? (
          <div className="text-center py-12 neomorph-inset rounded-lg">
            <Image className="w-12 h-12 mx-auto mb-3 text-foreground-muted" />
            <p className="text-foreground-muted mb-4">No adverts configured yet</p>
            <Button onClick={() => openModal()} className="neomorph-flat gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Advert
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {adverts.map((advert, index) => (
              <div 
                key={advert.id} 
                className={`neomorph-flat p-4 flex items-center gap-4 ${!advert.is_active ? 'opacity-50' : ''}`}
              >
                <GripVertical className="w-5 h-5 text-foreground-muted cursor-grab" />
                
                {/* Preview */}
                <div className="w-32 h-16 rounded overflow-hidden bg-surface-hover flex-shrink-0">
                  {advert.image_url ? (
                    <img 
                      src={advert.image_url} 
                      alt={advert.alt_text || advert.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-6 h-6 text-foreground-muted" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{advert.name}</div>
                  {advert.link_url && (
                    <div className="text-xs text-foreground-muted flex items-center gap-1 truncate">
                      <ExternalLink className="w-3 h-3" />
                      {advert.link_url}
                    </div>
                  )}
                </div>

                {/* Status Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-foreground-muted">
                    {advert.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <Switch 
                    checked={advert.is_active !== false}
                    onCheckedChange={() => handleToggleActive(advert)}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => openModal(advert)}
                    className="h-8 w-8"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDelete(advert.id)}
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="neomorph max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAdvert ? 'Edit Advert' : 'Add New Advert'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Summer Promotion"
                required
              />
            </div>

            <div>
              <Label>Image</Label>
              <div className="space-y-2">
                {formData.image_url && (
                  <div className="relative w-full h-32 rounded overflow-hidden bg-surface-hover">
                    <img 
                      src={formData.image_url} 
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Input
                                  value={formData.image_url}
                                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                                  placeholder="Image URL or upload below"
                                  className="flex-1"
                                  required
                                />
                  <label className="neomorph-flat px-4 py-2 cursor-pointer flex items-center gap-2 hover:bg-surface-hover">
                    <Upload className="w-4 h-4" />
                    {isUploading ? 'Uploading...' : 'Upload'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <Label>Link URL (optional)</Label>
              <Input
                value={formData.link_url}
                onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                placeholder="https://example.com"
              />
              <p className="text-xs text-foreground-muted mt-1">
                Users will be taken to this URL when clicking the advert
              </p>
            </div>

            <div>
              <Label>Alt Text</Label>
              <Input
                value={formData.alt_text}
                onChange={(e) => setFormData(prev => ({ ...prev, alt_text: e.target.value }))}
                placeholder="Description for accessibility"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch 
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="gap-2"
                disabled={createMutation.isPending || updateMutation.isPending}
                onClick={handleSubmit}
              >
                <Save className="w-4 h-4" />
                {editingAdvert ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}