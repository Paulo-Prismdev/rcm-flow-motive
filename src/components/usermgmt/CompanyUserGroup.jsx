import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, User, Edit2, MessageCircle } from "lucide-react";
import UserEditForm from "./UserEditForm";
import CompanyPortalSections from "./CompanyPortalSections";

export default function CompanyUserGroup({ company, companyType, users, isSuperAdmin, onFeedbackRequest }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUserId(null);
    },
  });

  return (
    <div className="neomorph-flat overflow-hidden">
      {/* Company Header - clickable to expand */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-hover transition-colors"
      >
        <div className="flex-shrink-0">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-foreground-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-foreground-muted" />
          )}
        </div>
        {company.logo_url ? (
          <img src={company.logo_url} alt={company.name} className="w-8 h-8 object-contain rounded flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-accent">{company.name?.[0]?.toUpperCase()}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{company.name}</p>
          <p className="text-xs text-foreground-muted">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${users.length > 0 ? 'bg-green-100 text-green-700' : 'bg-surface text-foreground-muted'}`}>
          {users.length > 0 ? `${users.length} linked` : 'No users'}
        </span>
      </button>

      {/* Portal sections — always visible below header */}
      {(companyType === 'bodyshop' || companyType === 'referrer') && (
        <div className="px-4 pb-3">
          <CompanyPortalSections
            company={company}
            companyType={companyType}
            canEdit={isSuperAdmin}
          />
        </div>
      )}

      {/* Users list - expanded */}
      {isOpen && (
        <div className="border-t border-border px-4 pb-4">
          {users.length === 0 ? (
            <p className="text-sm text-foreground-muted py-3 text-center">No users linked to this company</p>
          ) : (
            <div className="space-y-3 mt-3">
              {users.map(user => (
                <div key={user.id} className="neomorph-flat p-3 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{user.full_name || 'Unnamed'}</p>
                        <p className="text-xs text-foreground-muted truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {(user.user_type === 'referrer' || user.user_type === 'bodyshop') && (
                        <Button
                          onClick={() => onFeedbackRequest(user.id)}
                          className="neomorph-flat p-1.5 text-green-600"
                          title="Request feedback"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        onClick={() => setEditingUserId(editingUserId === user.id ? null : user.id)}
                        className="neomorph-flat p-1.5 text-blue-600"
                        title="Edit user"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Role badges */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {user.role === 'super_admin' && <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Super Admin</span>}
                    {user.role === 'company_admin' && <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700">Company Admin</span>}
                    {user.can_manage_permissions && <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">Can Manage Permissions</span>}
                  </div>

                  {/* Inline edit form */}
                  {editingUserId === user.id && (
                    <UserEditForm
                      user={user}
                      onSave={(data) => updateMutation.mutate({ id: user.id, data })}
                      onCancel={() => setEditingUserId(null)}
                      isSaving={updateMutation.isPending}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}