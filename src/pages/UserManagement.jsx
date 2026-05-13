import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Shield, X, Plus, AlertCircle, MessageCircle } from "lucide-react";

function UserForm({ user, onSave, onCancel }) {
  const [formData, setFormData] = useState(user || {
    full_name: '',
    email: '',
    role: 'user',
    user_type: 'internal',
    job_role_id: '',
    departments_access: ['Dashboard', 'Claims', 'Estimating', 'Engineering', 'Parts', 'Map'],
    can_manage_permissions: false,
    linked_referrer_id: '',
    linked_bodyshop_id: '',
    linked_client_id: '',
    linked_supplier_id: ''
  });

  const AVAILABLE_DEPARTMENTS_FOR_FORM = [
    "Dashboard",
    "Claims",
    "Estimating",
    "Engineering",
    "Parts",
    "Invoicing",
    "Map"
  ];

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const { data: referrers = [] } = useQuery({
    queryKey: ['referrers'],
    queryFn: () => base44.entities.Referrer.list(),
  });

  const { data: bodyshops = [] } = useQuery({
    queryKey: ['bodyshops'],
    queryFn: () => base44.entities.Bodyshop.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const handleRoleChange = (roleId) => {
    const selectedRole = roles.find(r => r.id === roleId);
    if (selectedRole) {
      setFormData({
        ...formData,
        job_role_id: roleId,
        departments_access: selectedRole.departments_access || ['Dashboard']
      });
    } else {
      setFormData({
        ...formData,
        job_role_id: ''
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const cleanedData = { ...formData };
    if (formData.user_type !== 'referrer') cleanedData.linked_referrer_id = '';
    if (formData.user_type !== 'bodyshop') cleanedData.linked_bodyshop_id = '';
    if (formData.user_type !== 'client') cleanedData.linked_client_id = '';
    if (formData.user_type !== 'supplier') cleanedData.linked_supplier_id = '';
    
    onSave(cleanedData);
  };

  const activeRoles = roles.filter(r => r.is_active);

  return (
    <div className="glass p-6 max-w-2xl w-full mx-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-700">{user ? 'Edit User' : 'New User'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
          <Input
            value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            required
            className="glass-inset"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
            disabled={!!user}
            className="glass-inset"
          />
          {user && <p className="text-xs text-gray-500 mt-1">Email cannot be changed after creation</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
            className="glass-inset w-full px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">User Type *</label>
          <select
            value={formData.user_type}
            onChange={(e) => setFormData({...formData, user_type: e.target.value})}
            className="glass-inset w-full px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
          >
            <option value="internal">Internal Staff</option>
            <option value="referrer">Referrer</option>
            <option value="bodyshop">Bodyshop/Repairer</option>
            <option value="client">Client</option>
            <option value="supplier">Supplier</option>
          </select>
        </div>

        {formData.user_type === 'referrer' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Linked Referrer</label>
            <select
              value={formData.linked_referrer_id}
              onChange={(e) => setFormData({...formData, linked_referrer_id: e.target.value})}
              className="glass-inset w-full px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            >
              <option value="">Select Referrer...</option>
              {referrers.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        )}

        {formData.user_type === 'bodyshop' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Linked Bodyshop</label>
            <select
              value={formData.linked_bodyshop_id}
              onChange={(e) => setFormData({...formData, linked_bodyshop_id: e.target.value})}
              className="glass-inset w-full px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            >
              <option value="">Select Bodyshop...</option>
              {bodyshops.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {formData.user_type === 'client' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Linked Client</label>
            <select
              value={formData.linked_client_id}
              onChange={(e) => setFormData({...formData, linked_client_id: e.target.value})}
              className="glass-inset w-full px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            >
              <option value="">Select Client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {formData.user_type === 'supplier' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Linked Supplier</label>
            <select
              value={formData.linked_supplier_id}
              onChange={(e) => setFormData({...formData, linked_supplier_id: e.target.value})}
              className="glass-inset w-full px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
            >
              <option value="">Select Supplier...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {formData.user_type === 'internal' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Job Role</label>
              <select
                value={formData.job_role_id}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="glass-inset w-full px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              >
                <option value="">No Role Assigned</option>
                {activeRoles.map(role => (
                  <option key={role.id} value={role.id}>{role.role_name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Selecting a role will auto-populate department access</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department Access</label>
              <div className="glass-inset p-4 space-y-2 rounded-xl">
                {AVAILABLE_DEPARTMENTS_FOR_FORM.map(dept => (
                  <label key={dept} className="flex items-center gap-2 text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.departments_access?.includes(dept)}
                      onChange={(e) => {
                        const newDepts = e.target.checked
                          ? [...(formData.departments_access || []), dept]
                          : (formData.departments_access || []).filter(d => d !== dept);
                        setFormData({...formData, departments_access: newDepts});
                      }}
                      className="form-checkbox h-4 w-4 text-gold rounded focus:ring-gold border-gray-300"
                    />
                    <span>{dept}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.can_manage_permissions}
                  onChange={(e) => setFormData({...formData, can_manage_permissions: e.target.checked})}
                  className="form-checkbox h-4 w-4 text-gold rounded focus:ring-gold border-gray-300"
                />
                <span>Can manage user permissions</span>
              </label>
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" onClick={onCancel} className="neomorph-flat px-4 py-2 text-gray-600">
            Cancel
          </Button>
          <Button type="submit" className="glass-button px-4 py-2 text-gold-700">
            {user ? 'Update User' : 'Create User'}
          </Button>
        </div>
      </form>
    </div>
  );
}


export default function UserManagement() {
  const queryClient = useQueryClient();
  const [editingUserId, setEditingUserId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUserId(null);
      setError(null);
    },
    onError: (error) => {
      console.error("Update error:", error);
      setError("Failed to update user: " + (error.message || "Unknown error"));
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      try {
        return await base44.entities.User.create(data);
      } catch (err) {
        throw new Error("User creation failed. Users may need to be invited through the Dashboard > Data > User section instead.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreateForm(false);
      setError(null);
    },
    onError: (error) => {
      console.error("Create error:", error);
      setError(error.message || "Failed to create user. Please try inviting them through Dashboard > Data > Users instead.");
    },
  });

  const handleSaveUserForm = async (formData) => {
    setError(null);
    if (editingUserId) {
      updateUserMutation.mutate({ id: editingUserId, data: formData });
    } else {
      createUserMutation.mutate(formData);
    }
  };

  const handleCancelUserForm = () => {
    setEditingUserId(null);
    setShowCreateForm(false);
    setError(null);
  };

  const requestFeedbackMutation = useMutation({
    mutationFn: async (userId) => {
      const response = await base44.functions.invoke('requestFeedback', { userId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('Feedback request sent successfully!');
    },
    onError: (error) => {
      console.error('Error requesting feedback:', error);
      alert('Failed to send feedback request: ' + (error.message || 'Unknown error'));
    }
  });

  const handleRequestFeedback = (userId) => {
    if (confirm('Send a feedback prompt to this user? They will see it the next time they log in to their portal.')) {
      requestFeedbackMutation.mutate(userId);
    }
  };

  const canManage = currentUser?.role === 'admin' || currentUser?.can_manage_permissions;

  if (!canManage) {
    return (
      <div className="neomorph p-8 text-center">
        <Shield className="w-12 h-12 mx-auto mb-4 text-red-600" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">Access Denied</h2>
        <p className="text-gray-500">You do not have permission to manage user access.</p>
      </div>
    );
  }

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role?.role_name || null;
  };

  return (
    <div className="space-y-6">
      <div className="neomorph p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-gold" />
            <div>
              <h1 className="text-2xl font-bold text-gray-700">User Management</h1>
              <p className="text-sm text-gray-500 mt-1">Manage user accounts and permissions</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setShowCreateForm(true);
              setError(null);
            }}
            className="glass-button px-4 py-2 text-gold-700"
          >
            <Plus className="w-4 h-4 mr-2" /> Create New User
          </Button>
        </div>

        {error && (
          <div className="neomorph-flat p-4 bg-red-50 border border-red-200 rounded-xl mb-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <p className="text-xs text-red-600 mt-2">
                <strong>Note:</strong> New users typically need to be invited through Dashboard - Data - Users. 
                This form is primarily for updating existing user permissions.
              </p>
            </div>
            <Button
              onClick={() => setError(null)}
              variant="ghost"
              size="icon"
              className="flex-shrink-0 w-6 h-6 p-0 hover:bg-red-100"
            >
              <X className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        )}
      </div>

      {(editingUserId || showCreateForm) ? (
        <UserForm
          user={editingUserId ? users.find(u => u.id === editingUserId) : null}
          onSave={handleSaveUserForm}
          onCancel={handleCancelUserForm}
        />
      ) : (
        <div className="space-y-4">
          {isLoading ? (
            <div className="neomorph p-8 text-center text-gray-500">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="neomorph p-8 text-center text-gray-500">No users found.</div>
          ) : (
            users.map((user) => {
              const roleName = user.job_role_id ? getRoleName(user.job_role_id) : null;
              
              return (
                <div key={user.id} className="neomorph p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-700">{user.full_name || 'Unnamed User'}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {user.role === 'admin' && (
                          <span className="neomorph-flat px-3 py-1 text-xs font-medium text-gold">
                            Admin - Full Access
                          </span>
                        )}
                        {roleName && (
                          <span className="neomorph-flat px-3 py-1 text-xs font-medium text-indigo-600">
                            {roleName}
                          </span>
                        )}
                        {user.can_manage_permissions && (
                          <span className="neomorph-flat px-3 py-1 text-xs font-medium text-blue-600">
                            Can Manage Permissions
                          </span>
                        )}
                        {user.user_type && user.user_type !== 'internal' && (
                          <span className="neomorph-flat px-3 py-1 text-xs font-medium text-purple-600 capitalize">
                            {user.user_type} User
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(user.user_type === 'referrer' || user.user_type === 'bodyshop') && (
                        <Button
                          onClick={() => handleRequestFeedback(user.id)}
                          disabled={requestFeedbackMutation.isPending}
                          className="neomorph-flat px-4 py-2 text-green-600"
                          title="Request feedback from this user"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          setEditingUserId(user.id);
                          setError(null);
                        }}
                        className="neomorph-flat px-4 py-2 text-blue-600"
                      >
                        Edit User
                      </Button>
                    </div>
                  </div>

                  {user.role === 'admin' ? (
                    <p className="text-sm text-gray-500 mt-4">Administrators have full access by default.</p>
                  ) : user.user_type === 'internal' ? (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-600 mb-2">Department Access:</p>
                      <div className="flex flex-wrap gap-2">
                        {(user.departments_access || []).length > 0 ? (
                          (user.departments_access || []).map((dept) => (
                            <span key={dept} className="neomorph-flat px-3 py-1 text-xs font-medium text-gray-700">
                              {dept}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">No department access assigned</span>
                        )}
                      </div>
                    </div>
                  ) : (
                      <div className="mt-4">
                          <p className="text-sm font-medium text-gray-600 mb-2">Linked Entity:</p>
                          <div className="flex flex-wrap gap-2">
                              {user.user_type === 'referrer' && user.linked_referrer_id && (
                                  <span className="neomorph-flat px-3 py-1 text-xs font-medium text-gray-700">
                                      Referrer ID: {user.linked_referrer_id}
                                  </span>
                              )}
                              {user.user_type === 'bodyshop' && user.linked_bodyshop_id && (
                                  <span className="neomorph-flat px-3 py-1 text-xs font-medium text-gray-700">
                                      Bodyshop ID: {user.linked_bodyshop_id}
                                  </span>
                              )}
                              {user.user_type === 'client' && user.linked_client_id && (
                                  <span className="neomorph-flat px-3 py-1 text-xs font-medium text-gray-700">
                                      Client ID: {user.linked_client_id}
                                  </span>
                              )}
                              {user.user_type === 'supplier' && user.linked_supplier_id && (
                                  <span className="neomorph-flat px-3 py-1 text-xs font-medium text-gray-700">
                                      Supplier ID: {user.linked_supplier_id}
                                  </span>
                              )}
                              {!user.linked_referrer_id && !user.linked_bodyshop_id && !user.linked_client_id && !user.linked_supplier_id && (
                                  <span className="text-sm text-gray-500">No linked entity assigned</span>
                              )}
                          </div>
                      </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}