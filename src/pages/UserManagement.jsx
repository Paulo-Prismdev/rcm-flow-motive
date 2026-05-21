import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Users, Shield, Building2, UserCheck, Package, User, Wrench, UserPlus } from "lucide-react";
import CompanyUserGroup from "../components/usermgmt/CompanyUserGroup";
import InternalNavSections from "../components/usermgmt/InternalNavSections";
import InviteUserModal from "../components/usermgmt/InviteUserModal";

const TABS = [
  { id: "internal",  label: "Internal Staff",  icon: UserCheck,  type: "internal"  },
  { id: "bodyshop",  label: "Repairers",        icon: Wrench,     type: "bodyshop"  },
  { id: "referrer",  label: "Referrers",        icon: Building2,  type: "referrer"  },
  { id: "supplier",  label: "Suppliers",        icon: Package,    type: "supplier"  },
  { id: "client",    label: "Clients",          icon: User,       type: "client"    },
];

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("internal");

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('full_name', 500),
  });

  const { data: bodyshops = [] } = useQuery({
    queryKey: ['Bodyshop'],
    queryFn: () => base44.entities.Bodyshop.list('name'),
  });

  const { data: referrers = [] } = useQuery({
    queryKey: ['Referrer'],
    queryFn: () => base44.entities.Referrer.list('name'),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['Supplier'],
    queryFn: () => base44.entities.Supplier.list('name'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['Client'],
    queryFn: () => base44.entities.Client.list('name'),
  });

  const requestFeedbackMutation = useMutation({
    mutationFn: async (userId) => {
      const response = await base44.functions.invoke('requestFeedback', { userId });
      return response.data;
    },
    onSuccess: () => alert('Feedback request sent successfully!'),
    onError: (err) => alert('Failed to send feedback request: ' + (err.message || 'Unknown error')),
  });

  const handleFeedbackRequest = (userId) => {
    if (confirm('Send a feedback prompt to this user?')) {
      requestFeedbackMutation.mutate(userId);
    }
  };

  const [showInviteModal, setShowInviteModal] = useState(false);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = isSuperAdmin || currentUser?.role === 'company_admin';
  const canManage = isAdmin || currentUser?.can_manage_permissions;

  // Build company → users mapping for the active tab
  const { companies, companyMap } = useMemo(() => {
    if (activeTab === 'internal') return { companies: [], companyMap: {} };
    const entityMap = {
      bodyshop: { list: bodyshops, idField: 'linked_bodyshop_id' },
      referrer:  { list: referrers,  idField: 'linked_referrer_id'  },
      supplier:  { list: suppliers,  idField: 'linked_supplier_id'  },
      client:    { list: clients,    idField: 'linked_client_id'    },
    };
    const { list, idField } = entityMap[activeTab] || { list: [], idField: '' };
    const map = {};
    list.forEach(c => { map[c.id] = []; });
    // "Unlinked" bucket for users of this type with no matching company
    map['__unlinked__'] = [];
    users.filter(u => u.user_type === activeTab).forEach(u => {
      const cid = u[idField];
      if (cid && map[cid] !== undefined) map[cid].push(u);
      else map['__unlinked__'].push(u);
    });
    return { companies: list, companyMap: map };
  }, [activeTab, users, bodyshops, referrers, suppliers, clients]);

  // Internal users (no company grouping)
  const internalUsers = useMemo(() => {
    return users.filter(u =>
      u.user_type === 'internal' ||
      u.role === 'super_admin' ||
      u.role === 'company_admin' ||
      u.role === 'admin' ||
      (!u.user_type && !u.linked_referrer_id && !u.linked_bodyshop_id && !u.linked_supplier_id && !u.linked_client_id)
    );
  }, [users]);

  if (!canManage) {
    return (
      <div className="neomorph p-8 text-center">
        <Shield className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-foreground-muted">You do not have permission to manage user access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Invite Modal */}
      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            queryClient.invalidateQueries({ queryKey: ['users'] });
          }}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* Header */}
      <div className="neomorph p-4 flex items-center gap-3">
        <Users className="w-5 h-5 text-accent flex-shrink-0" />
        <div className="flex-1">
          <h1 className="text-xl font-bold">User Management</h1>
          <p className="text-xs text-foreground-muted">Manage users by company type</p>
        </div>
        {isSuperAdmin && (
          <Button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-accent text-accent-foreground px-3 py-2 text-sm rounded-lg"
          >
            <UserPlus className="w-4 h-4" />
            Invite User
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="neomorph p-2 flex gap-1 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const count = tab.id === 'internal'
            ? internalUsers.length
            : users.filter(u => u.user_type === tab.type).length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-accent text-accent-foreground shadow'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-black/20 text-white' : 'bg-surface text-foreground-muted'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {usersLoading ? (
        <div className="neomorph p-8 text-center text-foreground-muted">Loading users...</div>
      ) : activeTab === 'internal' ? (
        // Internal staff — flat list with accordion per user
        <div className="space-y-2">
          <InternalNavSections canEdit={canManage} />
          {internalUsers.length === 0 ? (
            <div className="neomorph p-8 text-center text-foreground-muted">No internal users found.</div>
          ) : (
            internalUsers.map(user => (
              <InternalUserRow
                key={user.id}
                user={user}
                isSuperAdmin={isSuperAdmin}
              />
            ))
          )}
        </div>
      ) : (
        // Company-grouped view
        <div className="space-y-2">
          {companies.length === 0 ? (
            <div className="neomorph p-8 text-center text-foreground-muted">
              No {TABS.find(t => t.id === activeTab)?.label.toLowerCase()} found.
            </div>
          ) : (
            companies.map(company => (
              <CompanyUserGroup
                key={company.id}
                company={company}
                companyType={activeTab}
                users={companyMap[company.id] || []}
                isSuperAdmin={isSuperAdmin}
                onFeedbackRequest={handleFeedbackRequest}
              />
            ))
          )}
          {(companyMap['__unlinked__']?.length > 0) && (
            <CompanyUserGroup
              key="__unlinked__"
              company={{ id: '__unlinked__', name: 'Unlinked Users' }}
              companyType={activeTab}
              users={companyMap['__unlinked__']}
              isSuperAdmin={isSuperAdmin}
              onFeedbackRequest={handleFeedbackRequest}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Simple accordion row for internal staff
function InternalUserRow({ user, isSuperAdmin }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditing(false);
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
    enabled: isOpen,
  });

  const roleName = roles.find(r => r.id === user.job_role_id)?.role_name;

  return (
    <div className="neomorph-flat overflow-hidden">
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-hover transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-accent">
            {(user.full_name || user.email)?.[0]?.toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{user.full_name || 'Unnamed User'}</p>
          <p className="text-xs text-foreground-muted truncate">{user.email}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {user.role === 'super_admin' && <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Super Admin</span>}
          {user.role === 'company_admin' && <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700">Company Admin</span>}
          {roleName && <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">{roleName}</span>}
          {user.can_manage_permissions && <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 hidden sm:inline">Perm. Manager</span>}
          <svg className={`w-4 h-4 text-foreground-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border px-4 pb-4">
          {/* Dept access display */}
          {!isEditing && (
            <div className="pt-3 space-y-3">
              {(user.role !== 'super_admin' && user.role !== 'company_admin') && (
                <div>
                  <p className="text-xs font-medium text-foreground-muted mb-1.5">Department Access</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(user.departments_access || []).length > 0
                      ? user.departments_access.map(d => (
                          <span key={d} className="text-xs px-2 py-0.5 rounded bg-surface border border-border text-foreground">{d}</span>
                        ))
                      : <span className="text-xs text-foreground-muted">No departments assigned</span>
                    }
                  </div>
                </div>
              )}
              {isSuperAdmin && (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="neomorph-flat px-3 py-1.5 text-xs text-blue-600"
                >
                  Edit User
                </Button>
              )}
            </div>
          )}

          {isEditing && (
            <div className="pt-3">
              <UserEditFormInline
                user={user}
                onSave={(data) => updateMutation.mutate({ id: user.id, data })}
                onCancel={() => setIsEditing(false)}
                isSaving={updateMutation.isPending}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Inline form for internal users (dept toggles)
function UserEditFormInline({ user, onSave, onCancel, isSaving }) {
  const ALL_DEPARTMENTS = ["Dashboard", "Claims", "Estimating", "Engineering", "Parts", "Invoicing", "Reports", "Map"];
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    role: user?.role || 'user',
    departments_access: user?.departments_access || [],
    can_manage_permissions: user?.can_manage_permissions || false,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-foreground-muted mb-1">Full Name</label>
          <input
            value={formData.full_name}
            onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))}
            className="neomorph-inset w-full px-3 py-1.5 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-foreground-muted mb-1">System Role</label>
          <select
            value={formData.role}
            onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
            className="neomorph-inset w-full px-3 py-1.5 rounded-lg text-sm"
          >
            <option value="user">User</option>
            <option value="company_admin">Company Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-foreground-muted mb-1.5">Department Access</label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_DEPARTMENTS.map(dept => {
            const enabled = formData.departments_access?.includes(dept);
            return (
              <button
                key={dept}
                type="button"
                onClick={() => setFormData(p => ({
                  ...p,
                  departments_access: enabled
                    ? p.departments_access.filter(d => d !== dept)
                    : [...(p.departments_access || []), dept]
                }))}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                  enabled ? 'bg-blue-600 text-white border-blue-600' : 'bg-surface text-foreground-muted border-border hover:border-foreground-muted'
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
          onChange={e => setFormData(p => ({ ...p, can_manage_permissions: e.target.checked }))}
          className="rounded"
        />
        Can manage user permissions
      </label>

      <div className="flex gap-2 pt-1">
        <Button type="button" onClick={onCancel} className="neomorph-flat px-3 py-1.5 text-xs">Cancel</Button>
        <Button type="submit" disabled={isSaving} className="neomorph-flat px-3 py-1.5 text-xs bg-accent/10 text-accent">
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
}