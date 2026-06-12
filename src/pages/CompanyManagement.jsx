import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Pencil, Trash2, Building2, Percent, Save, X } from "lucide-react";
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

  const isAdmin = ['admin', 'super_admin', 'company_admin'].includes(currentUser?.role);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    enabled: !!currentUser,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Company.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setEditDialogOpen(false);
      setEditingCompany(null);
      toast.success('Company created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Company.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setEditDialogOpen(false);
      setEditingCompany(null);
      toast.success('Company updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Company.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company deleted');
    },
  });

  const handleEdit = (company) => {
    setEditingCompany(company);
    setEditDialogOpen(true);
  };

  const handleDelete = (company) => {
    if (window.confirm(`Delete "${company.name}"?`)) {
      deleteMutation.mutate(company.id);
    }
  };

  const openCreate = () => {
    setEditingCompany(null);
    setEditDialogOpen(true);
  };

  const { data: referrers = [], isLoading: referrersLoading } = useQuery({
    queryKey: ['referrers'],
    queryFn: () => base44.entities.Referrer.list('name'),
    enabled: !!currentUser && isAdmin,
  });

  const updateReferrerMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Referrer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrers'] });
      setEditingReferrerRates(null);
      toast.success('Rates updated');
    },
  });

  const [editingReferrerRates, setEditingReferrerRates] = useState(null);
  const [ratesForm, setRatesForm] = useState({});

  const openRatesEdit = (referrer) => {
    setEditingReferrerRates(referrer);
    setRatesForm({
      default_percent_to_referrer: referrer.default_percent_to_referrer ?? '',
      default_repairer_referral_fee: referrer.default_repairer_referral_fee ?? '',
    });
  };

  const saveRates = () => {
    updateReferrerMutation.mutate({
      id: editingReferrerRates.id,
      data: {
        default_percent_to_referrer: ratesForm.default_percent_to_referrer !== '' ? parseFloat(ratesForm.default_percent_to_referrer) : null,
        default_repairer_referral_fee: ratesForm.default_repairer_referral_fee !== '' ? parseFloat(ratesForm.default_repairer_referral_fee) : null,
      }
    });
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-gray-500">Access denied.</div>
    );
  }

  const typeColors = {
    platform_owner: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    referrer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    repairer: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">{companies.length} companies</p>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Company
        </Button>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingCompany(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <CompanyForm
            company={editingCompany}
            onSubmit={(data) => {
              if (editingCompany) {
                updateMutation.mutate({ id: editingCompany.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => { setEditDialogOpen(false); setEditingCompany(null); }}
          />
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-gray-400">Loading...</div>
      ) : companies.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">No companies yet.</div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {companies.map((company) => (
            <div key={company.id} className="flex items-center gap-3 px-4 py-3">
              <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 dark:text-white text-sm">{company.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColors[company.company_type] || 'bg-gray-100 text-gray-700'}`}>
                    {company.company_type?.replace('_', ' ')}
                  </span>
                  {!company.is_active && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600">Inactive</span>
                  )}
                </div>
                {company.contact_name && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{company.contact_name} · {company.contact_email}</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleEdit(company)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(company)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Referrer Rates Section ── */}
      <div className="border-t pt-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Referrer Fee Rates</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Set default rates per referrer — these auto-populate when a referrer is selected on a claim.
          </p>
        </div>

        {referrersLoading ? (
          <div className="text-center py-6 text-sm text-gray-400">Loading...</div>
        ) : referrers.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-400">No referrers found</div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="grid grid-cols-[1fr_110px_130px_36px] gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Referrer</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">% to Referrer</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Repairer Fee %</span>
              <span />
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {referrers.map((referrer) => (
                editingReferrerRates?.id === referrer.id ? (
                  // Inline edit row
                  <div key={referrer.id} className="grid grid-cols-[1fr_110px_130px_36px] gap-2 px-4 py-2 items-center bg-blue-50 dark:bg-blue-900/10">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{referrer.name}</span>
                    <div className="relative">
                      <Input
                        type="number" min="0" max="100" step="0.5"
                        value={ratesForm.default_percent_to_referrer}
                        onChange={(e) => setRatesForm(prev => ({ ...prev, default_percent_to_referrer: e.target.value }))}
                        placeholder="e.g. 5"
                        className="pr-6 h-7 text-xs"
                      />
                      <Percent className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    </div>
                    <div className="relative">
                      <Input
                        type="number" min="0" max="100" step="0.5"
                        value={ratesForm.default_repairer_referral_fee}
                        onChange={(e) => setRatesForm(prev => ({ ...prev, default_repairer_referral_fee: e.target.value }))}
                        placeholder="e.g. 20"
                        className="pr-6 h-7 text-xs"
                      />
                      <Percent className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={saveRates} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded" title="Save">
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingReferrerRates(null)} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Cancel">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  // Display row
                  <div key={referrer.id} className="grid grid-cols-[1fr_110px_130px_36px] gap-2 px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{referrer.name}</div>
                      {referrer.email && <div className="text-xs text-gray-400">{referrer.email}</div>}
                    </div>
                    <div className="text-center">
                      {referrer.default_percent_to_referrer != null ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          {referrer.default_percent_to_referrer}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </div>
                    <div className="text-center">
                      {referrer.default_repairer_referral_fee != null ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          {referrer.default_repairer_referral_fee}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </div>
                    <button
                      onClick={() => openRatesEdit(referrer)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyForm({ company, onSubmit, onCancel }) {
  const ALL_PORTAL_SECTIONS = ['Claims', 'Parts'];

  const [formData, setFormData] = useState({
    name: company?.name || '',
    company_type: company?.company_type || 'repairer',
    is_active: company?.is_active ?? true,
    contact_name: company?.contact_name || '',
    contact_email: company?.contact_email || '',
    contact_phone: company?.contact_phone || '',
    address_line_1: company?.address_line_1 || '',
    address_line_2: company?.address_line_2 || '',
    town: company?.town || '',
    county: company?.county || '',
    postcode: company?.postcode || '',
    portal_sections: company?.portal_sections || ['Claims'],
  });

  const toggleSection = (section) => {
    setFormData(prev => ({
      ...prev,
      portal_sections: prev.portal_sections.includes(section)
        ? prev.portal_sections.filter(s => s !== section)
        : [...prev.portal_sections, section],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{company ? 'Edit Company' : 'Add Company'}</DialogTitle>
      </DialogHeader>

      <div>
        <Label htmlFor="name">Company Name *</Label>
        <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Company Type *</Label>
          <Select value={formData.company_type} onValueChange={(v) => setFormData({ ...formData, company_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="platform_owner">Platform Owner</SelectItem>
              <SelectItem value="referrer">Referrer</SelectItem>
              <SelectItem value="repairer">Repairer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end pb-1">
          <div className="flex items-center gap-2">
            <Checkbox id="is_active" checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
            <Label htmlFor="is_active">Active</Label>
          </div>
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <h3 className="text-sm font-semibold">Contact</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Contact Name</Label>
            <Input value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
          </div>
          <div>
            <Label>Contact Email</Label>
            <Input type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} />
          </div>
          <div>
            <Label>Contact Phone</Label>
            <Input value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <h3 className="text-sm font-semibold">Address</h3>
        <Input placeholder="Address Line 1" value={formData.address_line_1} onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })} />
        <Input placeholder="Address Line 2" value={formData.address_line_2} onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })} />
        <div className="grid grid-cols-3 gap-3">
          <Input placeholder="Town" value={formData.town} onChange={(e) => setFormData({ ...formData, town: e.target.value })} />
          <Input placeholder="County" value={formData.county} onChange={(e) => setFormData({ ...formData, county: e.target.value })} />
          <Input placeholder="Postcode" value={formData.postcode} onChange={(e) => setFormData({ ...formData, postcode: e.target.value })} />
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <h3 className="text-sm font-semibold">Portal Access</h3>
        <p className="text-xs text-gray-500">Select which sections this company can access in their portal.</p>
        <div className="flex gap-3 flex-wrap">
          {ALL_PORTAL_SECTIONS.map(section => (
            <div key={section} className="flex items-center gap-2">
              <Checkbox
                id={`section-${section}`}
                checked={formData.portal_sections.includes(section)}
                onCheckedChange={() => toggleSection(section)}
              />
              <Label htmlFor={`section-${section}`}>{section}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{company ? 'Update' : 'Create'}</Button>
      </div>
    </form>
  );
}