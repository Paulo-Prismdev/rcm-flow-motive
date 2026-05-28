import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Image, 
  ExternalLink, 
  GripVertical,
  X,
  Save,
  Upload,
  Gift,
  Calculator,
  Package,
  FileText,
  TrendingUp,
  Wrench,
  Shield,
  Truck,
  Clock,
  DollarSign,
  Users
} from 'lucide-react';
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

const ICON_OPTIONS = [
  { value: 'Calculator', icon: Calculator },
  { value: 'Package', icon: Package },
  { value: 'FileText', icon: FileText },
  { value: 'TrendingUp', icon: TrendingUp },
  { value: 'Wrench', icon: Wrench },
  { value: 'Shield', icon: Shield },
  { value: 'Truck', icon: Truck },
  { value: 'Clock', icon: Clock },
  { value: 'DollarSign', icon: DollarSign },
  { value: 'Users', icon: Users },
];

const COLOR_OPTIONS = ['blue', 'green', 'purple', 'orange', 'red', 'yellow', 'indigo', 'pink'];

const getIconComponent = (iconName) => {
  const found = ICON_OPTIONS.find(i => i.value === iconName);
  return found ? found.icon : Package;
};

export default function PortalManagementTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdvert, setEditingAdvert] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    image_url: '',
    mobile_image_url: '',
    link_url: '',
    alt_text: '',
    is_active: true,
    sort_order: 0
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingMobile, setIsUploadingMobile] = useState(false);

  // Product management state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productFormData, setProductFormData] = useState({
    name: '',
    description: '',
    icon: 'Package',
    color: 'blue',
    features: [],
    link_url: '',
    is_active: true,
    sort_order: 0
  });
  const [newFeature, setNewFeature] = useState('');

  const queryClient = useQueryClient();

  const { data: adverts = [], isLoading } = useQuery({
    queryKey: ['advertBanners'],
    queryFn: () => base44.entities.AdvertBanner.list('sort_order'),
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['portalProducts'],
    queryFn: () => base44.entities.PortalProduct.list('sort_order'),
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

  // Product mutations
  const createProductMutation = useMutation({
    mutationFn: (data) => base44.entities.PortalProduct.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalProducts'] });
      closeProductModal();
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PortalProduct.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalProducts'] });
      closeProductModal();
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => base44.entities.PortalProduct.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalProducts'] });
    },
  });

  const openModal = (advert = null) => {
    if (advert) {
      setEditingAdvert(advert);
      setFormData({
        name: advert.name || '',
        image_url: advert.image_url || '',
        mobile_image_url: advert.mobile_image_url || '',
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
        mobile_image_url: '',
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
      mobile_image_url: '',
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

  const handleMobileFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMobile(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, mobile_image_url: result.file_url }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingMobile(false);
    }
  };

  // Product handlers
  const openProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductFormData({
        name: product.name || '',
        description: product.description || '',
        icon: product.icon || 'Package',
        color: product.color || 'blue',
        features: product.features || [],
        link_url: product.link_url || '',
        is_active: product.is_active !== false,
        sort_order: product.sort_order || 0
      });
    } else {
      setEditingProduct(null);
      setProductFormData({
        name: '',
        description: '',
        icon: 'Package',
        color: 'blue',
        features: [],
        link_url: '',
        is_active: true,
        sort_order: products.length
      });
    }
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
    setNewFeature('');
  };

  const handleProductSubmit = (e) => {
    e.preventDefault();
    if (!productFormData.name || !productFormData.description) {
      alert('Please provide a name and description');
      return;
    }
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: productFormData });
    } else {
      createProductMutation.mutate(productFormData);
    }
  };

  const handleDeleteProduct = (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProductMutation.mutate(id);
    }
  };

  const handleToggleProductActive = (product) => {
    updateProductMutation.mutate({ 
      id: product.id, 
      data: { ...product, is_active: !product.is_active } 
    });
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setProductFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setProductFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-4">
      {/* Advert Banners Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Advert Banners</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Recommended: 1200x150px
            </p>
          </div>
          <button onClick={() => openModal()} className="px-3 py-1.5 text-sm font-medium text-white bg-[#131d47] hover:bg-[#1a2660] rounded-lg flex items-center gap-2 flex-shrink-0 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-6 text-sm text-gray-400">Loading...</div>
        ) : adverts.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-400">
            No adverts configured
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden divide-y divide-gray-200 dark:divide-gray-800">
            {adverts.map((advert) => (
              <div 
                key={advert.id} 
                className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-3 ${!advert.is_active ? 'opacity-50' : ''}`}
              >
                <div className="w-20 h-10 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                  {advert.image_url ? (
                    <img 
                      src={advert.image_url} 
                      alt={advert.alt_text || advert.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{advert.name}</div>
                  {advert.link_url && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {advert.link_url}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch 
                    checked={advert.is_active !== false}
                    onCheckedChange={() => handleToggleActive(advert)}
                  />
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button 
                    onClick={() => openModal(advert)}
                    className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(advert.id)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Products & Services Section */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Products & Services</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Shown in ARTURA Products tab
            </p>
          </div>
          <button onClick={() => openProductModal()} className="px-3 py-1.5 text-sm font-medium text-white bg-[#131d47] hover:bg-[#1a2660] rounded-lg flex items-center gap-2 flex-shrink-0 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {productsLoading ? (
          <div className="text-center py-6 text-sm text-gray-400">Loading...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-400">
            No products configured
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden divide-y divide-gray-200 dark:divide-gray-800">
            {products.map((product) => {
              const IconComp = getIconComponent(product.icon);
              const colorMap = {
                blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
                red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
                yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
                indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
                pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
              };
              return (
                <div 
                  key={product.id} 
                  className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-3 ${!product.is_active ? 'opacity-50' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[product.color] || colorMap.blue}`}>
                    <IconComp className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{product.description}</div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch 
                      checked={product.is_active !== false}
                      onCheckedChange={() => handleToggleProductActive(product)}
                    />
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button 
                      onClick={() => openProductModal(product)}
                      className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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

      {/* Add/Edit Advert Modal */}
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
              <Label>Desktop Image (1200x150px recommended)</Label>
              <div className="space-y-2">
                {formData.image_url && (
                  <div className="relative w-full h-24 rounded overflow-hidden bg-surface-hover">
                    <img 
                      src={formData.image_url} 
                      alt="Desktop Preview"
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
                    placeholder="Desktop image URL"
                    className="flex-1"
                    required
                  />
                  <label className="neomorph-flat px-4 py-2 cursor-pointer flex items-center gap-2 hover:bg-surface-hover">
                    <Upload className="w-4 h-4" />
                    {isUploading ? '...' : 'Upload'}
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
              <Label>Mobile Image (600x200px recommended) - Optional</Label>
              <p className="text-xs text-foreground-muted mb-2">If not provided, desktop image will be used</p>
              <div className="space-y-2">
                {formData.mobile_image_url && (
                  <div className="relative w-full h-24 rounded overflow-hidden bg-surface-hover">
                    <img 
                      src={formData.mobile_image_url} 
                      alt="Mobile Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, mobile_image_url: '' }))}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Input
                    value={formData.mobile_image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, mobile_image_url: e.target.value }))}
                    placeholder="Mobile image URL (optional)"
                    className="flex-1"
                  />
                  <label className="neomorph-flat px-4 py-2 cursor-pointer flex items-center gap-2 hover:bg-surface-hover">
                    <Upload className="w-4 h-4" />
                    {isUploadingMobile ? '...' : 'Upload'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleMobileFileUpload}
                      className="hidden"
                      disabled={isUploadingMobile}
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

      {/* Add/Edit Product Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="neomorph max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleProductSubmit} className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={productFormData.name}
                onChange={(e) => setProductFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. ARTURA Estimating Services"
                required
              />
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                value={productFormData.description}
                onChange={(e) => setProductFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the product or service..."
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Icon</Label>
                <Select
                  value={productFormData.icon}
                  onValueChange={(value) => setProductFormData(prev => ({ ...prev, icon: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {opt.value}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Color</Label>
                <Select
                  value={productFormData.color}
                  onValueChange={(value) => setProductFormData(prev => ({ ...prev, color: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map(color => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded bg-${color}-500`} />
                          {color.charAt(0).toUpperCase() + color.slice(1)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Features</Label>
              <div className="space-y-2">
                {productFormData.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={feature} disabled className="flex-1" />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeFeature(index)}
                      className="h-8 w-8 text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    placeholder="Add a feature..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  />
                  <Button type="button" onClick={addFeature} className="neomorph-flat">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label>Link URL (optional)</Label>
              <Input
                value={productFormData.link_url}
                onChange={(e) => setProductFormData(prev => ({ ...prev, link_url: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch 
                checked={productFormData.is_active}
                onCheckedChange={(checked) => setProductFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={closeProductModal}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="gap-2"
                disabled={createProductMutation.isPending || updateProductMutation.isPending}
              >
                <Save className="w-4 h-4" />
                {editingProduct ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}