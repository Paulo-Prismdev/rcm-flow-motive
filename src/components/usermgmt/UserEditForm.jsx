import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

const USER_TYPES = [
  { value: 'internal', label: 'Internal' },
  { value: 'bodyshop', label: 'Bodyshop / Repairer' },
  { value: 'referrer', label: 'Referrer' },
  { value: 'supplier', label: 'Supplier' },
];

const ALL_DEPARTMENTS = ["Dashboard", "Claims", "Estimating", "Engineering", "Parts", "Invoicing", "Reports", "Map"];

export default function UserEditForm({ user, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    role: user?.role || 'user',
    user_type: user?.user_type || 'internal',
    job_role_id: user?.job_role_id || '',
    departments_access: user?.departments_access || ['Dashboard', 'Claims', 'Estimating', 'Engineering', 'Parts', 'Map'],
    can_manage_permissions: user?.can_manage_permissions || false,
    linked_referrer_id: user?.linked_referrer_id || '',
    linked_bodyshop_id: user?.linked_bodyshop_id || '',
    linked_client_id: user?.linked_client_id || '',
    linked_supplier_id: user?.linked_supplier_id || '',
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const { data: referrers = [] } = useQuery({
    queryKey: ['referrers'],
    queryFn: () => base44.entities.Referrer.list('name'),
    enabled: formData.user_type === 'referrer',
  });

  const { data: bodyshops = [] } = useQuery({
    queryKey: ['bodyshops'],
    queryFn: () => base44.entities.Bodyshop.list('name'),
    enabled: formData.user_type === 'bodyshop',
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('name'),
    enabled: formData.user_type === 'supplier',
  });

  const handleRoleChange = (roleId) => {
    const selectedRole = roles.find(r => r.id === roleId);
    setFormData(prev => ({
      ...prev,
      job_role_id: roleId,
      departments_access: selectedRole ? (selectedRole.departments_access || ['Dashboard']) : prev.departments_access,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const activeRoles = roles.filter(r => r.is_active);
  const isInternal = formData.user_type === 'internal' || !formData.user_type;
  const isReferrer = formData.user_type === 'referrer';
  const isBodyshop = formData.user_type === 'bodyshop';
  const isSupplier = formData.user_type === 'supplier';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-3 border-t border-border mt-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Full Name</label>
          <Input
            value={formData.full_name}
            onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
            className="neomorph-inset text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">System Role</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}
            className="neomorph-inset w-full px-3 py-2 rounded-lg text-sm"
          >
            <option value="user">User</option>
            <option value="company_admin">Company Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground-muted mb-1">User Type</label>
        <select
          value={formData.user_type || 'internal'}
          onChange={(e) => setFormData(p => ({
            ...p,
            user_type: e.target.value,
            linked_referrer_id: '',
            linked_bodyshop_id: '',
            linked_supplier_id: '',
          }))}
          className="neomorph-inset w-full px-3 py-2 rounded-lg text-sm"
        >
          {USER_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {isReferrer && (
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Linked Referrer</label>
          <select
            value={formData.linked_referrer_id}
            onChange={(e) => setFormData(p => ({ ...p, linked_referrer_id: e.target.value }))}
            className="neomorph-inset w-full px-3 py-2 rounded-lg text-sm"
          >
            <option value="">— Select Referrer —</option>
            {referrers.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      )}

      {isBodyshop && (
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Linked Bodyshop</label>
          <select
            value={formData.linked_bodyshop_id}
            onChange={(e) => setFormData(p => ({ ...p, linked_bodyshop_id: e.target.value }))}
            className="neomorph-inset w-full px-3 py-2 rounded-lg text-sm"
          >
            <option value="">— Select Bodyshop —</option>
            {bodyshops.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {isSupplier && (
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Linked Supplier</label>
          <select
            value={formData.linked_supplier_id}
            onChange={(e) => setFormData(p => ({ ...p, linked_supplier_id: e.target.value }))}
            className="neomorph-inset w-full px-3 py-2 rounded-lg text-sm"
          >
            <option value="">— Select Supplier —</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {isInternal && (
        <>
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">Job Role</label>
            <select
              value={formData.job_role_id}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="neomorph-inset w-full px-3 py-2 rounded-lg text-sm"
            >
              <option value="">No Role Assigned</option>
              {activeRoles.map(r => (
                <option key={r.id} value={r.id}>{r.role_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-2">Department Access</label>
            <div className="flex flex-wrap gap-2">
              {ALL_DEPARTMENTS.map(dept => {
                const enabled = formData.departments_access?.includes(dept);
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => {
                      const newDepts = enabled
                        ? formData.departments_access.filter(d => d !== dept)
                        : [...(formData.departments_access || []), dept];
                      setFormData(p => ({ ...p, departments_access: newDepts }));
                    }}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all ${
                      enabled
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-surface text-foreground-muted border-border hover:border-foreground-muted'
                    }`}
                  >
                    {dept}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={formData.can_manage_permissions}
              onChange={(e) => setFormData(p => ({ ...p, can_manage_permissions: e.target.checked }))}
              className="rounded"
            />
            Can manage user permissions
          </label>
        </>
      )}

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