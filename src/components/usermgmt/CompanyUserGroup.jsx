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
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Company Header - clickable to expand */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
        )}
        {company.logo_url ? (
          <img src={company.logo_url} alt={company.name} className="w-7 h-7 object-contain rounded flex-shrink-0" />
        ) : (
          <div className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{company.name?.[0]?.toUpperCase()}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{company.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${users.length > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
          {users.length}
        </span>
      </button>

      {/* Portal sections — always visible below header */}
      {(companyType === 'bodyshop' || companyType === 'referrer') && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800">
          <CompanyPortalSections
            company={company}
            companyType={companyType}
            canEdit={isSuperAdmin}
          />
        </div>
      )}

      {/* Users list - expanded */}
      {isOpen && (
        <div className="border-t border-gray-200 dark:border-gray-800 px-3 py-2">
          {users.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">No users linked</p>
          ) : (
            <div className="space-y-2">
              {users.map(user => (
                <div key={user.id} className="bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <User className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white text-xs truncate">{user.full_name || 'Unnamed'}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {(user.user_type === 'referrer' || user.user_type === 'bodyshop') && (
                        <button
                          onClick={() => onFeedbackRequest(user.id)}
                          className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
                          title="Request feedback"
                        >
                          <MessageCircle className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingUserId(editingUserId === user.id ? null : user.id)}
                        className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Edit user"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Role badges */}
                  {(user.role === 'super_admin' || user.role === 'company_admin' || user.can_manage_permissions) && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {user.role === 'super_admin' && <span className="text-[9px] px-1 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Admin</span>}
                      {user.role === 'company_admin' && <span className="text-[9px] px-1 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">Co Admin</span>}
                      {user.can_manage_permissions && <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Mgr</span>}
                    </div>
                  )}

                  {/* Inline edit form */}
                  {editingUserId === user.id && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <UserEditForm
                        user={user}
                        defaultCompanyLink={company.id !== '__unlinked__' ? { type: companyType, id: company.id } : null}
                        onSave={(data) => updateMutation.mutate({ id: user.id, data })}
                        onCancel={() => setEditingUserId(null)}
                        isSaving={updateMutation.isPending}
                      />
                    </div>
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