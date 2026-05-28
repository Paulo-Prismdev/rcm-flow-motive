import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";

const USER_TYPES = [
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
];

export default function UserEditForm({ user, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    is_super_admin: user?.is_super_admin || false,
    is_company_admin: user?.is_company_admin || false,
    user_type: user?.user_type || 'internal',
    company_id: user?.company_id || '',
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list('name'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-3 border-t border-border mt-3">
      <div>
        <label className="block text-xs font-medium text-foreground-muted mb-1">Full Name</label>
        <Input
          value={formData.full_name}
          onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
          className="neomorph-inset text-sm"
        />
      </div>

      <div className="space-y-2 border border-border rounded-lg p-3">
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_super_admin}
            onChange={(e) => setFormData(p => ({ ...p, is_super_admin: e.target.checked }))}
            className="rounded"
          />
          <span>Super Admin (full platform access)</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_company_admin}
            onChange={(e) => setFormData(p => ({ ...p, is_company_admin: e.target.checked }))}
            className="rounded"
          />
          <span>Company Admin (full company access)</span>
        </label>
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground-muted mb-1">User Type</label>
        <select
          value={formData.user_type || 'internal'}
          onChange={(e) => setFormData(p => ({ ...p, user_type: e.target.value }))}
          className="neomorph-inset w-full px-3 py-2 rounded-lg text-sm"
        >
          {USER_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
         <label className="block text-xs font-medium text-foreground-muted mb-1">Company *</label>
         {companies.length === 0 ? (
           <div className="w-full px-3 py-2 rounded-lg text-sm border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-2">
             <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
             <span className="text-yellow-700 dark:text-yellow-500 text-xs">No companies available. Check user permissions.</span>
           </div>
         ) : (
           <select
             value={formData.company_id}
             onChange={(e) => setFormData(p => ({ ...p, company_id: e.target.value }))}
             className="neomorph-inset w-full px-3 py-2 rounded-lg text-sm"
           >
             <option value="">— Select Company —</option>
             {companies.map(c => (
               <option key={c.id} value={c.id}>{c.name}</option>
             ))}
           </select>
         )}
       </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" onClick={onCancel} className="neomorph-flat px-3 py-1.5 text-sm">
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving} className="neomorph-flat px-3 py-1.5 text-sm bg-accent/10 text-accent">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}