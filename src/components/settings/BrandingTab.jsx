import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Image, Upload, Trash2, Building2 } from 'lucide-react';

export default function BrandingTab() {
  const [logoUploading, setLogoUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: appConfigs = [], isLoading } = useQuery({
    queryKey: ['appConfigs'],
    queryFn: () => base44.entities.AppConfig.list(),
  });

  const companyLogo = appConfigs.find(c => c.config_key === 'company_logo')?.config_value || '';

  const logoMutation = useMutation({
    mutationFn: async (logoUrl) => {
      const existing = appConfigs.find(c => c.config_key === 'company_logo');
      if (existing) {
        return base44.entities.AppConfig.update(existing.id, { config_value: logoUrl });
      } else {
        return base44.entities.AppConfig.create({ config_key: 'company_logo', config_value: logoUrl });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appConfigs'] });
    },
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      logoMutation.mutate(result.file_url);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    logoMutation.mutate('');
  };

  if (isLoading) {
    return (
      <div className="neomorph p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-foreground-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="neomorph p-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-6 h-6 text-accent" />
          <div>
            <h2 className="text-lg font-bold">Company Logo</h2>
            <p className="text-sm text-foreground-muted">
              This logo appears in the header across the entire application
            </p>
          </div>
        </div>

        <div className="flex items-start gap-8">
          {/* Logo Preview */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-surface-hover">
              {companyLogo ? (
                <img 
                  src={companyLogo} 
                  alt="Company Logo" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <Image className="w-10 h-10 text-foreground-muted" />
              )}
            </div>
            <p className="text-xs text-foreground-muted">Preview</p>
          </div>

          {/* Upload Controls */}
          <div className="flex-1 space-y-4">
            <div className="flex gap-3">
              <label className="neomorph-flat px-5 py-2.5 cursor-pointer flex items-center gap-2 hover:bg-surface-hover font-medium">
                <Upload className="w-4 h-4" />
                {logoUploading ? 'Uploading...' : 'Upload New Logo'}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={logoUploading}
                />
              </label>
              {companyLogo && (
                <Button 
                  variant="outline" 
                  onClick={handleRemoveLogo}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Logo
                </Button>
              )}
            </div>
            <div className="neomorph-inset p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Guidelines:</p>
              <ul className="text-xs text-foreground-muted space-y-1">
                <li>• Recommended size: 80x80 pixels or larger (square)</li>
                <li>• Supported formats: PNG, JPG, SVG</li>
                <li>• Transparent backgrounds work best</li>
                <li>• Logo will appear next to "ARTECH One" in the header</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}