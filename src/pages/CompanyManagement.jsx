import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Building2, RefreshCw } from "lucide-react";
import { MASTER_FEATURES } from "@/components/shared/featureConfig";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function CompanyManagement() {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    enabled: !!currentUser?.is_super_admin,
  });

  const createCompanyMutation = useMutation({
    mutationFn: (data) => base44.entities.Company.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setEditDialogOpen(false);
      setEditingCompany(null);
      toast.success('Company created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create company: ' + error.message);
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Company.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setEditDialogOpen(false);
      setEditingCompany(null);
      toast.success('Company updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update company: ' + error.message);
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: (id) => base44.entities.Company.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete company: ' + error.message);
    },
  });

  const handleEdit = (company) => {
    setEditingCompany(company);
    setEditDialogOpen(true);
  };

  const handleDelete = (company) => {
    if (window.confirm(`Are you sure you want to delete "${company.name}"?`)) {
      deleteCompanyMutation.mutate(company.id);
    }
  };

  if (!currentUser?.is_super_admin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Access denied. Super admin access required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Company Management</h1>
          <p className="text-muted-foreground mt-1">Manage companies and their feature access</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = '/admin/migrate-users'}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Migrate Users
          </Button>
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <CompanyForm
                company={editingCompany}
                onSubmit={(data) => {
                  if (editingCompany) {
                    updateCompanyMutation.mutate({ id: editingCompany.id, data });
                  } else {
                    createCompanyMutation.mutate(data);
                  }
                }}
                onCancel={() => {
                  setEditDialogOpen(false);
                  setEditingCompany(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="grid gap-4">
          {companies.map((company) => (
            <Card key={company.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-primary" />
                    <div>
                      <CardTitle>{company.name}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={company.company_type === 'platform_owner' ? 'default' : 'secondary'}>
                          {company.company_type.replace('_', ' ')}
                        </Badge>
                        <Badge variant={company.is_active ? 'default' : 'secondary'}>
                          {company.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleEdit(company)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDelete(company)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {company.contact_name && (
                  <p className="text-sm text-muted-foreground">
                    Contact: {company.contact_name} | {company.contact_email} | {company.contact_phone}
                  </p>
                )}
                <div className="mt-3">
                  <p className="text-sm font-medium mb-2">Enabled Features ({company.enabled_features?.length || 0})</p>
                  <div className="flex flex-wrap gap-2">
                    {(company.enabled_features || []).slice(0, 8).map((feature) => {
                      const featureDef = MASTER_FEATURES.find(f => f.key === feature);
                      return (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {featureDef?.label || feature}
                        </Badge>
                      );
                    })}
                    {(company.enabled_features?.length || 0) > 8 && (
                      <Badge variant="outline" className="text-xs">
                        +{company.enabled_features.length - 8} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyForm({ company, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: company?.name || '',
    company_type: company?.company_type || 'repairer',
    is_active: company?.is_active ?? true,
    enabled_features: company?.enabled_features || [],
    contact_name: company?.contact_name || '',
    contact_email: company?.contact_email || '',
    contact_phone: company?.contact_phone || '',
    address_line_1: company?.address_line_1 || '',
    address_line_2: company?.address_line_2 || '',
    town: company?.town || '',
    county: company?.county || '',
    postcode: company?.postcode || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const toggleFeature = (featureKey) => {
    setFormData(prev => ({
      ...prev,
      enabled_features: prev.enabled_features.includes(featureKey)
        ? prev.enabled_features.filter(f => f !== featureKey)
        : [...prev.enabled_features, featureKey]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <DialogHeader>
        <DialogTitle>{company ? 'Edit Company' : 'Add Company'}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Company Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="company_type">Company Type *</Label>
            <Select
              value={formData.company_type}
              onValueChange={(value) => setFormData({ ...formData, company_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platform_owner">Platform Owner</SelectItem>
                <SelectItem value="referrer">Referrer</SelectItem>
                <SelectItem value="repairer">Repairer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Contact Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Address</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="address_line_1">Address Line 1</Label>
              <Input
                id="address_line_1"
                value={formData.address_line_1}
                onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="address_line_2">Address Line 2</Label>
              <Input
                id="address_line_2"
                value={formData.address_line_2}
                onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="town">Town</Label>
                <Input
                  id="town"
                  value={formData.town}
                  onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="county">County</Label>
                <Input
                  id="county"
                  value={formData.county}
                  onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Feature Access</h3>
          <p className="text-sm text-muted-foreground mb-3">Select which features this company can access</p>
          <div className="grid grid-cols-2 gap-3">
            {MASTER_FEATURES.map((feature) => (
              <div key={feature.key} className="flex items-start gap-2 p-3 border rounded-lg">
                <Checkbox
                  id={`feature-${feature.key}`}
                  checked={formData.enabled_features.includes(feature.key)}
                  onCheckedChange={() => toggleFeature(feature.key)}
                />
                <div className="flex-1">
                  <Label htmlFor={`feature-${feature.key}`} className="font-medium cursor-pointer">
                    {feature.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {company ? 'Update Company' : 'Create Company'}
        </Button>
      </div>
    </form>
  );
}