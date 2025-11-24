import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Mail, Camera, Loader, ArrowLeft, Save, Shield, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from 'date-fns'; // Import format from date-fns

// Helper functions for avatar
const getUserInitials = (user) => {
  if (!user) return '?';
  if (user.full_name) {
    const parts = user.full_name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return user.full_name.substring(0, 2).toUpperCase();
  }
  if (user.email) {
    return user.email.substring(0, 2).toUpperCase();
  }
  return '?';
};

const getAvatarColor = (email) => {
  if (!email) return 'bg-gray-500';
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-teal-500',
  ];
  const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export default function UserProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const [formData, setFormData] = useState({
    full_name: '',
    profile_picture_url: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    town: '',
    county: '',
    postcode: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notification_preferences: {
      tagged_in_notes: true,
      status_changes: true,
      new_assignments: true,
      task_assignments: true,
      invoice_updates: true,
      estimate_requests: true,
      parts_updates: false,
      engineering_updates: false,
    },
  });

  React.useEffect(() => {
    if (currentUser) {
      setFormData({
        full_name: currentUser.full_name || '',
        profile_picture_url: currentUser.profile_picture_url || '',
        phone: currentUser.phone || '',
        address_line_1: currentUser.address_line_1 || '',
        address_line_2: currentUser.address_line_2 || '',
        town: currentUser.town || '',
        county: currentUser.county || '',
        postcode: currentUser.postcode || '',
        emergency_contact_name: currentUser.emergency_contact_name || '',
        emergency_contact_phone: currentUser.emergency_contact_phone || '',
        notification_preferences: currentUser.notification_preferences || {
          tagged_in_notes: true,
          status_changes: true,
          new_assignments: true,
          task_assignments: true,
          invoice_updates: true,
          estimate_requests: true,
          parts_updates: false,
          engineering_updates: false,
        },
      });
    }
  }, [currentUser]);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: (error) => {
      console.error("Failed to update profile:", error);
    },
  });

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, profile_picture_url: result.file_url }));
    } catch (error) {
      console.error("Failed to upload image:", error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        full_name: formData.full_name,
        profile_picture_url: formData.profile_picture_url,
        phone: formData.phone,
        address_line_1: formData.address_line_1,
        address_line_2: formData.address_line_2,
        town: formData.town,
        county: formData.county,
        postcode: formData.postcode,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
      }, {
        onSuccess: () => {
          setIsEditing(false);
        }
      });
    } catch (error) {
      console.error("Error saving profile data:", error);
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, profile_picture_url: '' }));
  };

  const handleNotificationToggle = (key) => {
    const newPreferences = {
      ...formData.notification_preferences,
      [key]: !formData.notification_preferences[key]
    };
    
    setFormData(prev => ({
      ...prev,
      notification_preferences: newPreferences
    }));

    updateProfileMutation.mutate({
      notification_preferences: newPreferences
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const isInternalUser = currentUser?.user_type === 'internal' || currentUser?.role === 'admin';

  return (
    <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto">
      <style>{`
        .toggle-switch {
          position: relative;
          display: inline-flex;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }
        
        .toggle-switch input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .toggle-slider {
          position: relative;
          width: 52px;
          height: 28px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 34px;
          transition: all 0.3s ease;
          border: 2px solid var(--glass-border);
        }
        
        .toggle-slider:after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          left: 3px;
          top: 2px;
          background: white;
          border-radius: 50%;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .toggle-switch input:checked + .toggle-slider {
          background: var(--accent);
          border-color: var(--accent);
        }
        
        .toggle-switch input:checked + .toggle-slider:after {
          transform: translateX(24px);
        }
        
        .toggle-switch input:focus + .toggle-slider {
          box-shadow: 0 0 0 3px var(--accent-glass);
        }
        
        .toggle-label {
          margin-left: 12px;
          font-size: 14px;
          font-weight: 600;
          min-width: 40px;
        }
      `}</style>

      {/* Header */}
      <div className="glass p-4 md:p-6">
        <div className="flex items-center gap-3 md:gap-4">
          <Link to={createPageUrl("Dashboard")}>
            <Button className="glass-button p-2 md:p-3">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold">My Profile</h1>
            <p className="text-xs md:text-sm text-foreground-muted mt-1">Manage your account settings</p>
          </div>
          {activeTab === 'profile' && !isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              className="glass-button px-3 md:px-6 py-2"
            >
              Edit Profile
            </Button>
          )}
          {activeTab === 'profile' && isEditing && (
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setFormData(prev => ({
                    ...prev,
                    full_name: currentUser.full_name || '',
                    profile_picture_url: currentUser.profile_picture_url || '',
                    phone: currentUser.phone || '',
                    address_line_1: currentUser.address_line_1 || '',
                    address_line_2: currentUser.address_line_2 || '',
                    town: currentUser.town || '',
                    county: currentUser.county || '',
                    postcode: currentUser.postcode || '',
                    emergency_contact_name: currentUser.emergency_contact_name || '',
                    emergency_contact_phone: currentUser.emergency_contact_phone || '',
                  }));
                }}
                className="glass-button px-3 md:px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
                className="glass-button px-3 md:px-4 py-2 text-accent"
              >
                {updateProfileMutation.isPending ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="glass p-1 flex gap-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'profile' ? 'glass-elevated' : 'hover:bg-glass-hover'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'notifications' ? 'glass-elevated' : 'hover:bg-glass-hover'
          }`}
        >
          Notifications
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Profile Picture Section */}
          <div className="lg:col-span-1">
            <div className="glass p-4 md:p-6">
              <h3 className="font-bold mb-4 md:mb-6 flex items-center gap-2">
                <Camera className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                Profile Picture
              </h3>
              
              <div className="flex flex-col items-center">
                <div className="relative mb-4 md:mb-6">
                  {formData.profile_picture_url ? (
                    <img
                      src={formData.profile_picture_url}
                      alt="Profile"
                      className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover shadow-lg"
                    />
                  ) : (
                    <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full ${getAvatarColor(currentUser.email)} flex items-center justify-center shadow-lg`}>
                      <span className="text-4xl md:text-5xl font-bold text-white">
                        {getUserInitials(currentUser)}
                      </span>
                    </div>
                  )}
                  
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 glass-button p-2 md:p-3 rounded-full cursor-pointer hover:scale-110 transition-all">
                      <Camera className="w-4 h-4 md:w-5 md:h-5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={isUploadingImage}
                      />
                    </label>
                  )}
                </div>

                {isUploadingImage && (
                  <div className="flex items-center gap-2 text-sm text-foreground-muted mb-4">
                    <Loader className="w-4 h-4 animate-spin" />
                    Uploading...
                  </div>
                )}

                {isEditing && formData.profile_picture_url && (
                  <Button
                    onClick={handleRemovePhoto}
                    variant="outline"
                    className="glass-button text-red-500 text-xs md:text-sm px-3 md:px-4 py-2"
                  >
                    Remove Photo
                  </Button>
                )}

                {!isEditing && !currentUser.profile_picture_url && (
                  <p className="text-xs md:text-sm text-center text-foreground-muted">
                    Using default initials avatar
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Profile Information Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass p-4 md:p-6">
              <h3 className="font-bold mb-4 md:mb-6 flex items-center gap-2">
                <User className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                Personal Information
              </h3>

              <div className="space-y-4 md:space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  {isEditing ? (
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="glass-inset w-full text-sm md:text-base"
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <div className="glass-inset p-3 rounded-lg">
                      <p className="text-sm md:text-base">{currentUser.full_name || 'Not set'}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </label>
                  <div className="glass-inset p-3 rounded-lg opacity-75">
                    <p className="text-sm md:text-base">{currentUser.email}</p>
                    <p className="text-xs text-foreground-muted mt-1">Email cannot be changed</p>
                  </div>
                </div>

                {isInternalUser && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Phone Number</label>
                      {isEditing ? (
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          className="glass-inset w-full"
                          placeholder="Your phone number"
                        />
                      ) : (
                        <div className="glass-inset p-3 rounded-lg">
                          <p>{currentUser.phone || 'Not set'}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Address</label>
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            value={formData.address_line_1}
                            onChange={(e) => setFormData(prev => ({ ...prev, address_line_1: e.target.value }))}
                            className="glass-inset w-full"
                            placeholder="Address Line 1"
                          />
                          <Input
                            value={formData.address_line_2}
                            onChange={(e) => setFormData(prev => ({ ...prev, address_line_2: e.target.value }))}
                            className="glass-inset w-full"
                            placeholder="Address Line 2"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={formData.town}
                              onChange={(e) => setFormData(prev => ({ ...prev, town: e.target.value }))}
                              className="glass-inset w-full"
                              placeholder="Town/City"
                            />
                            <Input
                              value={formData.county}
                              onChange={(e) => setFormData(prev => ({ ...prev, county: e.target.value }))}
                              className="glass-inset w-full"
                              placeholder="County"
                            />
                          </div>
                          <Input
                            value={formData.postcode}
                            onChange={(e) => setFormData(prev => ({ ...prev, postcode: e.target.value }))}
                            className="glass-inset w-full"
                            placeholder="Postcode"
                          />
                        </div>
                      ) : (
                        <div className="glass-inset p-3 rounded-lg">
                          {currentUser.address_line_1 ? (
                            <div className="text-sm">
                              <p>{currentUser.address_line_1}</p>
                              {currentUser.address_line_2 && <p>{currentUser.address_line_2}</p>}
                              <p>{[currentUser.town, currentUser.county].filter(Boolean).join(', ')}</p>
                              {currentUser.postcode && <p>{currentUser.postcode}</p>}
                            </div>
                          ) : (
                            <p className="text-sm">Not set</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Emergency Contact</label>
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            value={formData.emergency_contact_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                            className="glass-inset w-full"
                            placeholder="Name"
                          />
                          <Input
                            value={formData.emergency_contact_phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                            className="glass-inset w-full"
                            placeholder="Phone number"
                          />
                        </div>
                      ) : (
                        <div className="glass-inset p-3 rounded-lg">
                          {currentUser.emergency_contact_name ? (
                            <div className="text-sm">
                              <p className="font-medium">{currentUser.emergency_contact_name}</p>
                              <p className="text-foreground-muted">{currentUser.emergency_contact_phone}</p>
                            </div>
                          ) : (
                            <p className="text-sm">Not set</p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Account Role
                  </label>
                  <div className="glass-inset p-3 rounded-lg">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs md:text-sm font-medium ${
                      currentUser.role === 'admin' ? 'bg-accent text-black' : 'bg-blue-500 text-white'
                    }`}>
                      {currentUser.role === 'admin' ? 'Administrator' : 'User'}
                    </span>
                    {currentUser.can_manage_permissions && (
                      <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-xs md:text-sm font-medium bg-purple-500 text-white">
                        Can Manage Permissions
                      </span>
                    )}
                  </div>
                </div>

                {isInternalUser && (
                  <>
                    {currentUser.job_title && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Job Title</label>
                        <div className="glass-inset p-3 rounded-lg">
                          <p className="text-sm">{currentUser.job_title}</p>
                        </div>
                      </div>
                    )}

                    {currentUser.start_date && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Start Date</label>
                        <div className="glass-inset p-3 rounded-lg">
                          <p className="text-sm">{format(new Date(currentUser.start_date), 'dd MMMM yyyy')}</p>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">Annual Leave</label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="glass-inset p-3 rounded-lg">
                          <p className="text-xs text-foreground-muted">Allowance</p>
                          <p className="text-lg font-bold">{currentUser.annual_leave_allowance || 25}</p>
                        </div>
                        <div className="glass-inset p-3 rounded-lg">
                          <p className="text-xs text-foreground-muted">Taken</p>
                          <p className="text-lg font-bold text-blue-600">{currentUser.annual_leave_taken || 0}</p>
                        </div>
                        <div className="glass-inset p-3 rounded-lg">
                          <p className="text-xs text-foreground-muted">Remaining</p>
                          <p className="text-lg font-bold text-green-600">
                            {(currentUser.annual_leave_allowance || 25) - (currentUser.annual_leave_taken || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {currentUser.role !== 'admin' && isInternalUser && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Department Access</label>
                    <div className="glass-inset p-3 rounded-lg">
                      <div className="flex flex-wrap gap-2">
                        {(currentUser.departments_access || []).map(dept => (
                          <span key={dept} className="glass-elevated px-3 py-1 text-xs md:text-sm rounded-full">
                            {dept}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="glass p-4 md:p-6">
              <h3 className="font-bold mb-3 md:mb-4 text-sm md:text-base">Account Information</h3>
              <div className="space-y-2 text-xs md:text-sm text-foreground-muted">
                <p>Account created: {new Date(currentUser.created_date).toLocaleDateString()}</p>
                <p>Last updated: {new Date(currentUser.updated_date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="glass p-4 md:p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent" />
            Notification Preferences
          </h3>
          <p className="text-sm text-foreground-muted mb-6">
            Choose what notifications you want to receive. Changes are saved automatically.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass-inset rounded-lg">
              <div className="flex-1">
                <p className="font-medium">Tagged in Notes</p>
                <p className="text-sm text-foreground-muted">When someone mentions you in a note or update</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={formData.notification_preferences.tagged_in_notes}
                  onChange={() => handleNotificationToggle('tagged_in_notes')}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label" style={{ color: formData.notification_preferences.tagged_in_notes ? 'var(--accent)' : 'var(--foreground-muted)' }}>
                  {formData.notification_preferences.tagged_in_notes ? 'On' : 'Off'}
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 glass-inset rounded-lg">
              <div className="flex-1">
                <p className="font-medium">Status Changes</p>
                <p className="text-sm text-foreground-muted">When status changes on items you're involved with</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={formData.notification_preferences.status_changes}
                  onChange={() => handleNotificationToggle('status_changes')}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label" style={{ color: formData.notification_preferences.status_changes ? 'var(--accent)' : 'var(--foreground-muted)' }}>
                  {formData.notification_preferences.status_changes ? 'On' : 'Off'}
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 glass-inset rounded-lg">
              <div className="flex-1">
                <p className="font-medium">New Assignments</p>
                <p className="text-sm text-foreground-muted">When new items are assigned to you</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={formData.notification_preferences.new_assignments}
                  onChange={() => handleNotificationToggle('new_assignments')}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label" style={{ color: formData.notification_preferences.new_assignments ? 'var(--accent)' : 'var(--foreground-muted)' }}>
                  {formData.notification_preferences.new_assignments ? 'On' : 'Off'}
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 glass-inset rounded-lg">
              <div className="flex-1">
                <p className="font-medium">Task Assignments</p>
                <p className="text-sm text-foreground-muted">When tasks are assigned to you</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={formData.notification_preferences.task_assignments}
                  onChange={() => handleNotificationToggle('task_assignments')}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label" style={{ color: formData.notification_preferences.task_assignments ? 'var(--accent)' : 'var(--foreground-muted)' }}>
                  {formData.notification_preferences.task_assignments ? 'On' : 'Off'}
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 glass-inset rounded-lg">
              <div className="flex-1">
                <p className="font-medium">Invoice Updates</p>
                <p className="text-sm text-foreground-muted">When invoice status changes</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={formData.notification_preferences.invoice_updates}
                  onChange={() => handleNotificationToggle('invoice_updates')}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label" style={{ color: formData.notification_preferences.invoice_updates ? 'var(--accent)' : 'var(--foreground-muted)' }}>
                  {formData.notification_preferences.invoice_updates ? 'On' : 'Off'}
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 glass-inset rounded-lg">
              <div className="flex-1">
                <p className="font-medium">Estimate Requests</p>
                <p className="text-sm text-foreground-muted">When new estimate requests are created</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={formData.notification_preferences.estimate_requests}
                  onChange={() => handleNotificationToggle('estimate_requests')}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label" style={{ color: formData.notification_preferences.estimate_requests ? 'var(--accent)' : 'var(--foreground-muted)' }}>
                  {formData.notification_preferences.estimate_requests ? 'On' : 'Off'}
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 glass-inset rounded-lg">
              <div className="flex-1">
                <p className="font-medium">Parts Updates</p>
                <p className="text-sm text-foreground-muted">When parts orders are updated</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={formData.notification_preferences.parts_updates}
                  onChange={() => handleNotificationToggle('parts_updates')}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label" style={{ color: formData.notification_preferences.parts_updates ? 'var(--accent)' : 'var(--foreground-muted)' }}>
                  {formData.notification_preferences.parts_updates ? 'On' : 'Off'}
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 glass-inset rounded-lg">
              <div className="flex-1">
                <p className="font-medium">Engineering Updates</p>
                <p className="text-sm text-foreground-muted">When engineering reports are updated</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={formData.notification_preferences.engineering_updates}
                  onChange={() => handleNotificationToggle('engineering_updates')}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label" style={{ color: formData.notification_preferences.engineering_updates ? 'var(--accent)' : 'var(--foreground-muted)' }}>
                  {formData.notification_preferences.engineering_updates ? 'On' : 'Off'}
                </span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}