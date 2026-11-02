import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";
import { isClientTagged } from "@/components/shared/directoryTags";

// "Not set up" is what a new account starts as: it sees no part of the app until a
// type is chosen here. Internal gives full staff access, so it is never the default.
const USER_TYPES = [
  { value: 'external', label: 'Not set up (no access)' },
  { value: 'internal', label: 'Internal (staff)' },
  { value: 'bodyshop', label: 'Repairer' },
  { value: 'referrer', label: 'Referrer' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'client', label: 'Client' },
];

export default function UserEditForm({ user, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    role: user?.role || 'user',
    user_type: user?.user_type || 'external',
    company_id: user?.company_id || '',
    is_active: user?.is_active ?? true,
    can_manage_permissions: user?.can_manage_permissions || false,
    departments_access: user?.departments_access || [],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list('name'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('name'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  // RCM admins can clear someone's sign-in code lockout (5 wrong codes locks for 15
  // minutes). The server checks the admin's rights and records the reset.
  const [resetState, setResetState] = useState('idle');
  const [devicesState, setDevicesState] = useState('idle');
  const removeDevices = async () => {
    if (!window.confirm(`Remove all Face ID / fingerprint devices for ${user.email}? They'll sign in with the emailed code until they set one up again.`)) return;
    setDevicesState('busy');
    try {
      await base44.functions.invoke('passkeyManage', { action: 'adminRemoveAll', target_user_id: user.id });
      setDevicesState('done');
    } catch (err) {
      setDevicesState('idle');
      alert(err?.response?.data?.error || 'Could not remove the devices.');
    }
  };
  const resetSignIn = async () => {
    setResetState('busy');
    try {
      await base44.functions.invoke('twofaManage', { action: 'reset', target_user_id: user.id });
      setResetState('done');
    } catch (err) {
      setResetState('idle');
      alert(err?.response?.data?.error || 'Could not reset the sign-in step.');
    }
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

      <div>
        <label className="block text-xs font-medium text-foreground-muted mb-1">Role</label>
        <select
          value={formData.role || 'user'}
          onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}
          className="neomorph-inset w-full px-3 py-2 rounded-lg text-sm"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="company_admin">Company Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground-muted mb-1">User Type</label>
        <select
          value={formData.user_type || 'external'}
          onChange={(e) => setFormData(p => ({ ...p, user_type: e.target.value }))}
          className="neomorph-inset w-full px-3 py-2 rounded-lg text-sm"
        >
          {USER_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2 border border-border rounded-lg p-3">
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData(p => ({ ...p, is_active: e.target.checked }))}
            className="rounded"
          />
          <span>Active</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={formData.can_manage_permissions}
            onChange={(e) => setFormData(p => ({ ...p, can_manage_permissions: e.target.checked }))}
            className="rounded"
          />
          <span>Can Manage Permissions</span>
        </label>
      </div>

      {formData.user_type === 'client' ? (
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">Linked Client *</label>
          <select
            value={formData.company_id}
            onChange={(e) => setFormData(p => ({ ...p, company_id: e.target.value }))}
            className="neomorph-inset w-full px-3 py-2 rounded-lg text-sm"
          >
            <option value="">— Select Client —</option>
            {clients.filter(isClientTagged).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      ) : (
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
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        {user?.id && user?.user_type === 'internal' && (
          <Button type="button" onClick={resetSignIn} disabled={resetState === 'busy'} className="neomorph-flat px-3 py-1.5 text-sm mr-auto" title="Clears a lockout after too many wrong codes, and asks for a fresh code at the next sign-in">
            {resetState === 'busy' ? 'Resetting…' : resetState === 'done' ? 'Sign-in step reset' : 'Reset sign-in code step'}
          </Button>
        )}
        {user?.id && user?.user_type === 'internal' && (
          <Button type="button" onClick={removeDevices} disabled={devicesState === 'busy'} className="neomorph-flat px-3 py-1.5 text-sm" title="For a lost or replaced phone: they'll use the emailed code until they set Face ID up again">
            {devicesState === 'busy' ? 'Removing…' : devicesState === 'done' ? 'Face ID devices removed' : 'Remove Face ID devices'}
          </Button>
        )}
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