import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Users, Shield, Building2, UserCheck, Package, User, Wrench, UserPlus } from "lucide-react";
import CompanyUserGroup from "../components/usermgmt/CompanyUserGroup";
import InternalNavSections from "../components/usermgmt/InternalNavSections";
import InviteUserModal from "../components/usermgmt/InviteUserModal";
import UserEditForm from "../components/usermgmt/UserEditForm";

const TABS = [
  { id: "internal",  label: "Internal Staff",  icon: UserCheck,  type: "internal"  },
  { id: "bodyshop",  label: "Repairers",        icon: Wrench,     type: "bodyshop"  },
  { id: "referrer",  label: "Referrers",        icon: Building2,  type: "referrer"  },
  { id: "supplier",  label: "Suppliers",        icon: Package,    type: "supplier"  },
  { id: "client",    label: "Clients",          icon: User,       type: "client"    },
];

const COMPANY_TYPE_MAP = {
  bodyshop: "repairer",
  referrer: "referrer",
  supplier: "supplier",
  client: "client",
};

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

  const { data: companies = [] } = useQuery({
    queryKey: ['Company'],
    queryFn: () => base44.entities.Company.list('name'),
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
  const { companyMap } = useMemo(() => {
    if (activeTab === 'internal') return { companyMap: {} };
    const companyType = COMPANY_TYPE_MAP[activeTab];
    const filteredCompanies = companies.filter(c => c.company_type === companyType);
    const map = {};
    filteredCompanies.forEach(c => { map[c.id] = []; });
    // "Unlinked" bucket for users of this type with no matching company
    map['__unlinked__'] = [];
    users.filter(u => u.user_type === activeTab).forEach(u => {
      const cid = u.company_id;
      if (cid && map[cid] !== undefined) map[cid].push(u);
      else map['__unlinked__'].push(u);
    });
    return { companyMap: map };
  }, [activeTab, users, companies]);

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
      <div className="text-center py-6">
        <Shield className="w-10 h-10 mx-auto mb-3 text-red-500" />
        <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Access Denied</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">No permission to manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 h-full flex flex-col">
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage users by company type</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-3 py-1.5 text-sm font-medium text-white bg-[#131d47] hover:bg-[#1a2660] rounded-lg flex items-center gap-2 transition-colors flex-shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const count = tab.id === 'internal'
            ? internalUsers.length
            : users.filter(u => u.user_type === tab.type).length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#131d47] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className={`text-[10px] px-1 py-0.5 rounded-full font-semibold ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {usersLoading ? (
          <div className="text-center py-6 text-sm text-gray-400">Loading...</div>
        ) : activeTab === 'internal' ? (
          // Internal staff — flat list with accordion per user
          <div className="space-y-2">
            <InternalNavSections canEdit={canManage} />
            {internalUsers.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">No internal users found.</div>
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
            {Object.keys(companyMap).filter(k => k !== '__unlinked__').length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-400">
                No {TABS.find(t => t.id === activeTab)?.label.toLowerCase()} found.
              </div>
            ) : (
              Object.keys(companyMap).filter(k => k !== '__unlinked__').map(companyId => {
                const company = companies.find(c => c.id === companyId);
                return (
                  <CompanyUserGroup
                    key={companyId}
                    company={company}
                    companyType={activeTab}
                    users={companyMap[companyId] || []}
                    isSuperAdmin={isSuperAdmin}
                    onFeedbackRequest={handleFeedbackRequest}
                  />
                );
              })
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
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
            {(user.full_name || user.email)?.[0]?.toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{user.full_name || 'Unnamed'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {user.role === 'super_admin' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Admin</span>}
          {user.role === 'company_admin' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">Co Admin</span>}
          {user.can_manage_permissions && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hidden sm:inline">Mgr</span>}
          <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-gray-200 dark:border-gray-800 px-3 py-3 space-y-2">
          {/* Dept access display */}
          {!isEditing && (
            <>
              {(user.role !== 'super_admin' && user.role !== 'company_admin') && (
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Departments</p>
                  <div className="flex flex-wrap gap-1">
                    {(user.departments_access || []).length > 0
                      ? user.departments_access.map(d => (
                          <span key={d} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 whitespace-nowrap">{d}</span>
                        ))
                      : <span className="text-xs text-gray-500">None assigned</span>
                    }
                  </div>
                </div>
              )}
              {isSuperAdmin && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs px-2 py-1 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors w-full text-left"
                >
                  Edit User
                </button>
              )}
            </>
          )}

          {isEditing && (
            <UserEditForm
              user={user}
              onSave={(data) => updateMutation.mutate({ id: user.id, data })}
              onCancel={() => setIsEditing(false)}
              isSaving={updateMutation.isPending}
            />
          )}
        </div>
      )}
    </div>
  );
}