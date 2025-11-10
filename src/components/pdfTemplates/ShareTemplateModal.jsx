import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Lock, Users, Globe, Search, UserPlus, CheckSquare, Square } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function ShareTemplateModal({ template, isOpen, onClose, onSave }) {
  const [visibility, setVisibility] = useState(template?.visibility || 'private');
  const [sharedWithUsers, setSharedWithUsers] = useState(template?.shared_with_users || []);
  const [canEditUsers, setCanEditUsers] = useState(template?.can_edit_users || []);
  const [sharedWithDepartments, setSharedWithDepartments] = useState(template?.shared_with_departments || []);
  const [allowDuplicate, setAllowDuplicate] = useState(template?.allow_others_to_duplicate !== false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.asServiceRole.entities.User.list(),
    enabled: isOpen,
  });

  if (!isOpen || !template) return null;

  const departments = ['Dashboard', 'Claims', 'Estimating', 'Engineering', 'Parts', 'Invoicing', 'Map'];

  const filteredUsers = allUsers.filter(user => 
    user.user_type === 'internal' &&
    (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleUserShare = (userEmail) => {
    setSharedWithUsers(prev => 
      prev.includes(userEmail) 
        ? prev.filter(e => e !== userEmail)
        : [...prev, userEmail]
    );
  };

  const toggleUserEdit = (userEmail) => {
    setCanEditUsers(prev => 
      prev.includes(userEmail) 
        ? prev.filter(e => e !== userEmail)
        : [...prev, userEmail]
    );
  };

  const toggleDepartment = (dept) => {
    setSharedWithDepartments(prev =>
      prev.includes(dept)
        ? prev.filter(d => d !== dept)
        : [...prev, dept]
    );
  };

  const handleSave = () => {
    onSave({
      visibility,
      shared_with_users: visibility === 'team' ? sharedWithUsers : [],
      can_edit_users: canEditUsers,
      shared_with_departments: sharedWithDepartments,
      allow_others_to_duplicate: allowDuplicate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="glass-elevated w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-glass-border flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold">Share Template</h2>
            <p className="text-sm text-foreground-muted mt-1">{template.template_name}</p>
          </div>
          <button onClick={onClose} className="neomorph-flat p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Visibility Options */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Visibility</h3>
            <div className="space-y-2">
              <button
                onClick={() => setVisibility('private')}
                className={`w-full neomorph-flat p-4 rounded-xl flex items-start gap-3 transition-all ${
                  visibility === 'private' ? 'ring-2 ring-accent' : ''
                }`}
              >
                <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-left flex-1">
                  <div className="font-medium">Private</div>
                  <div className="text-xs text-foreground-muted">Only you can view and use this template</div>
                </div>
                {visibility === 'private' && (
                  <CheckSquare className="w-5 h-5 text-accent flex-shrink-0" />
                )}
              </button>

              <button
                onClick={() => setVisibility('team')}
                className={`w-full neomorph-flat p-4 rounded-xl flex items-start gap-3 transition-all ${
                  visibility === 'team' ? 'ring-2 ring-accent' : ''
                }`}
              >
                <Users className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-left flex-1">
                  <div className="font-medium">Shared with Team</div>
                  <div className="text-xs text-foreground-muted">Share with specific users or departments</div>
                </div>
                {visibility === 'team' && (
                  <CheckSquare className="w-5 h-5 text-accent flex-shrink-0" />
                )}
              </button>

              <button
                onClick={() => setVisibility('organization')}
                className={`w-full neomorph-flat p-4 rounded-xl flex items-start gap-3 transition-all ${
                  visibility === 'organization' ? 'ring-2 ring-accent' : ''
                }`}
              >
                <Globe className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-left flex-1">
                  <div className="font-medium">Organization Wide</div>
                  <div className="text-xs text-foreground-muted">Available to all internal users</div>
                </div>
                {visibility === 'organization' && (
                  <CheckSquare className="w-5 h-5 text-accent flex-shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* Share with Specific Users */}
          {visibility === 'team' && (
            <>
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Share with Departments</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {departments.map(dept => (
                    <button
                      key={dept}
                      onClick={() => toggleDepartment(dept)}
                      className={`neomorph-flat p-3 rounded-lg text-sm flex items-center gap-2 ${
                        sharedWithDepartments.includes(dept) ? 'ring-2 ring-accent' : ''
                      }`}
                    >
                      {sharedWithDepartments.includes(dept) ? (
                        <CheckSquare className="w-4 h-4 text-accent" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3">Share with Specific Users</h3>
                <div className="neomorph-inset p-2 mb-3 flex items-center gap-2">
                  <Search className="w-4 h-4 text-foreground-muted" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search users by name or email..."
                    className="border-0 bg-transparent"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredUsers.map(user => (
                    <div key={user.email} className="neomorph-flat p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{user.full_name}</div>
                          <div className="text-xs text-foreground-muted">{user.email}</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleUserShare(user.email)}
                            className={`neomorph-flat px-3 py-1 text-xs rounded ${
                              sharedWithUsers.includes(user.email) ? 'bg-accent/20 text-accent' : ''
                            }`}
                          >
                            {sharedWithUsers.includes(user.email) ? 'Can View' : 'Add'}
                          </button>
                          {sharedWithUsers.includes(user.email) && (
                            <button
                              onClick={() => toggleUserEdit(user.email)}
                              className={`neomorph-flat px-3 py-1 text-xs rounded ${
                                canEditUsers.includes(user.email) ? 'bg-blue-100 text-blue-600' : ''
                              }`}
                            >
                              {canEditUsers.includes(user.email) ? 'Can Edit' : 'Edit?'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-foreground-muted">
                      <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No users found</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Additional Settings */}
          <div className="mb-4">
            <h3 className="font-semibold mb-3">Additional Settings</h3>
            <button
              onClick={() => setAllowDuplicate(!allowDuplicate)}
              className="neomorph-flat p-4 rounded-xl w-full flex items-center gap-3"
            >
              {allowDuplicate ? (
                <CheckSquare className="w-5 h-5 text-accent" />
              ) : (
                <Square className="w-5 h-5" />
              )}
              <div className="text-left flex-1">
                <div className="font-medium">Allow others to duplicate</div>
                <div className="text-xs text-foreground-muted">Users can create their own copies of this template</div>
              </div>
            </button>
          </div>

          {/* Summary */}
          {(sharedWithUsers.length > 0 || sharedWithDepartments.length > 0 || visibility === 'organization') && (
            <div className="neomorph-flat p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <h4 className="font-semibold text-sm mb-2">Sharing Summary</h4>
              {visibility === 'organization' ? (
                <p className="text-xs text-foreground-muted">This template will be available to all internal users</p>
              ) : (
                <>
                  {sharedWithDepartments.length > 0 && (
                    <p className="text-xs text-foreground-muted mb-1">
                      • Shared with {sharedWithDepartments.length} department(s)
                    </p>
                  )}
                  {sharedWithUsers.length > 0 && (
                    <p className="text-xs text-foreground-muted mb-1">
                      • Shared with {sharedWithUsers.length} user(s)
                    </p>
                  )}
                  {canEditUsers.length > 0 && (
                    <p className="text-xs text-foreground-muted">
                      • {canEditUsers.length} user(s) can edit
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end p-6 border-t border-glass-border flex-shrink-0">
          <Button onClick={onClose} className="neomorph-flat">
            Cancel
          </Button>
          <Button onClick={handleSave} className="neomorph-flat bg-accent/10 text-accent font-medium">
            Save Sharing Settings
          </Button>
        </div>
      </div>
    </div>
  );
}