import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { User, Mail, Camera, Loader, ArrowLeft, Save, Shield, Bell, Briefcase, CalendarDays, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

const getUserInitials = (user) => {
  if (!user) return '?';
  if (user.full_name) {
    const parts = user.full_name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return user.full_name.substring(0, 2).toUpperCase();
  }
  if (user.email) return user.email.substring(0, 2).toUpperCase();
  return '?';
};

const getAvatarColor = (email) => {
  if (!email) return 'bg-gray-500';
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'];
  const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const NOTIFICATION_PREFS = [
  { key: 'tagged_in_notes', label: 'Tagged in Notes', desc: 'When someone mentions you in a note or update' },
  { key: 'status_changes', label: 'Status Changes', desc: 'When status changes on items you\'re involved with' },
  { key: 'new_assignments', label: 'New Assignments', desc: 'When new items are assigned to you' },
  { key: 'task_assignments', label: 'Task Assignments', desc: 'When tasks are assigned to you' },
  { key: 'invoice_updates', label: 'Invoice Updates', desc: 'When invoice status changes' },
  { key: 'estimate_requests', label: 'Estimate Requests', desc: 'When new estimate requests are created' },
  { key: 'parts_updates', label: 'Parts Updates', desc: 'When parts orders are updated' },
  { key: 'engineering_updates', label: 'Engineering Updates', desc: 'When engineering reports are updated' },
];

const DEFAULT_PREFS = {
  tagged_in_notes: true, status_changes: true, new_assignments: true, task_assignments: true,
  invoice_updates: true, estimate_requests: true, parts_updates: false, engineering_updates: false,
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
    full_name: '', profile_picture_url: '', phone: '',
    address_line_1: '', address_line_2: '', town: '', county: '', postcode: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    notification_preferences: { ...DEFAULT_PREFS },
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
        notification_preferences: currentUser.notification_preferences || { ...DEFAULT_PREFS },
      });
    }
  }, [currentUser]);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currentUser'] }),
    onError: (error) => console.error("Failed to update profile:", error),
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
      }, { onSuccess: () => setIsEditing(false) });
    } catch (error) {
      console.error("Error saving profile data:", error);
    }
  };

  const handleCancel = () => {
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
  };

  const handleRemovePhoto = () => setFormData(prev => ({ ...prev, profile_picture_url: '' }));

  const handleNotificationToggle = (key) => {
    const newPreferences = { ...formData.notification_preferences, [key]: !formData.notification_preferences[key] };
    setFormData(prev => ({ ...prev, notification_preferences: newPreferences }));
    updateProfileMutation.mutate({ notification_preferences: newPreferences });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isInternalUser = currentUser?.user_type === 'internal' || currentUser?.role === 'admin';

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">

        {/* Header */}
        <div className="app-card !p-4 md:!p-5">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-10 flex-shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-bold truncate">My Profile</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Manage your account settings</p>
            </div>
            {activeTab === 'profile' && !isEditing && (
              <Button onClick={() => setIsEditing(true)} className="flex-shrink-0">
                Edit Profile
              </Button>
            )}
            {activeTab === 'profile' && isEditing && (
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                <Button onClick={handleSave} disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" />Save</>}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="app-card !p-1.5 flex gap-1.5">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-colors h-11 md:h-10 ${
              activeTab === 'profile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-colors h-11 md:h-10 ${
              activeTab === 'notifications' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Notifications
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Profile Picture */}
            <div className="lg:col-span-1">
              <div className="app-card !p-4 md:!p-6">
                <h3 className="font-semibold mb-4 md:mb-6 flex items-center gap-2 text-sm md:text-base">
                  <Camera className="w-4 h-4 text-primary" />
                  Profile Picture
                </h3>
                <div className="flex flex-col items-center">
                  <div className="relative mb-4 md:mb-6">
                    {formData.profile_picture_url ? (
                      <img src={formData.profile_picture_url} alt="Profile" className="w-28 h-28 md:w-40 md:h-40 rounded-full object-cover shadow-lg" />
                    ) : (
                      <div className={`w-28 h-28 md:w-40 md:h-40 rounded-full ${getAvatarColor(currentUser.email)} flex items-center justify-center shadow-lg`}>
                        <span className="text-3xl md:text-5xl font-bold text-white">{getUserInitials(currentUser)}</span>
                      </div>
                    )}
                    {isEditing && (
                      <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 md:p-2.5 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-md">
                        <Camera className="w-4 h-4" />
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploadingImage} />
                      </label>
                    )}
                  </div>
                  {isUploadingImage && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Loader className="w-4 h-4 animate-spin" /> Uploading...
                    </div>
                  )}
                  {isEditing && formData.profile_picture_url && (
                    <Button onClick={handleRemovePhoto} variant="outline" className="text-destructive text-xs md:text-sm">
                      Remove Photo
                    </Button>
                  )}
                  {!isEditing && !currentUser.profile_picture_url && (
                    <p className="text-xs md:text-sm text-center text-muted-foreground">Using default initials avatar</p>
                  )}
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              <div className="app-card !p-4 md:!p-6">
                <h3 className="font-semibold mb-4 md:mb-6 flex items-center gap-2 text-sm md:text-base">
                  <User className="w-4 h-4 text-primary" />
                  Personal Information
                </h3>
                <div className="space-y-4 md:space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name</label>
                    {isEditing ? (
                      <Input value={formData.full_name} onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))} placeholder="Enter your full name" />
                    ) : (
                      <div className="bg-muted border rounded-md p-3"><p className="text-sm md:text-base">{currentUser.full_name || 'Not set'}</p></div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2"><Mail className="w-4 h-4" />Email Address</label>
                    <div className="bg-muted border rounded-md p-3 opacity-75">
                      <p className="text-sm md:text-base">{currentUser.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                    </div>
                  </div>

                  {isInternalUser && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">Phone Number</label>
                        {isEditing ? (
                          <Input value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="Your phone number" />
                        ) : (
                          <div className="bg-muted border rounded-md p-3"><p>{currentUser.phone || 'Not set'}</p></div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Address</label>
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input value={formData.address_line_1} onChange={(e) => setFormData(prev => ({ ...prev, address_line_1: e.target.value }))} placeholder="Address Line 1" />
                            <Input value={formData.address_line_2} onChange={(e) => setFormData(prev => ({ ...prev, address_line_2: e.target.value }))} placeholder="Address Line 2" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Input value={formData.town} onChange={(e) => setFormData(prev => ({ ...prev, town: e.target.value }))} placeholder="Town/City" />
                              <Input value={formData.county} onChange={(e) => setFormData(prev => ({ ...prev, county: e.target.value }))} placeholder="County" />
                            </div>
                            <Input value={formData.postcode} onChange={(e) => setFormData(prev => ({ ...prev, postcode: e.target.value }))} placeholder="Postcode" />
                          </div>
                        ) : (
                          <div className="bg-muted border rounded-md p-3">
                            {currentUser.address_line_1 ? (
                              <div className="text-sm space-y-0.5">
                                <p>{currentUser.address_line_1}</p>
                                {currentUser.address_line_2 && <p>{currentUser.address_line_2}</p>}
                                <p>{[currentUser.town, currentUser.county].filter(Boolean).join(', ')}</p>
                                {currentUser.postcode && <p>{currentUser.postcode}</p>}
                              </div>
                            ) : <p className="text-sm">Not set</p>}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Emergency Contact</label>
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input value={formData.emergency_contact_name} onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))} placeholder="Name" />
                            <Input value={formData.emergency_contact_phone} onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))} placeholder="Phone number" />
                          </div>
                        ) : (
                          <div className="bg-muted border rounded-md p-3">
                            {currentUser.emergency_contact_name ? (
                              <div className="text-sm">
                                <p className="font-medium">{currentUser.emergency_contact_name}</p>
                                <p className="text-muted-foreground">{currentUser.emergency_contact_phone}</p>
                              </div>
                            ) : <p className="text-sm">Not set</p>}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2"><Shield className="w-4 h-4" />Account Role</label>
                    <div className="bg-muted border rounded-md p-3 flex flex-wrap gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs md:text-sm font-medium ${currentUser.role === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-blue-500 text-white'}`}>
                        {currentUser.role === 'admin' ? 'Administrator' : 'User'}
                      </span>
                      {currentUser.can_manage_permissions && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs md:text-sm font-medium bg-purple-500 text-white">Can Manage Permissions</span>
                      )}
                    </div>
                  </div>

                  {isInternalUser && (
                    <>
                      {currentUser.job_title && (
                        <div>
                          <label className="block text-sm font-medium mb-2 flex items-center gap-2"><Briefcase className="w-4 h-4" />Job Title</label>
                          <div className="bg-muted border rounded-md p-3"><p className="text-sm">{currentUser.job_title}</p></div>
                        </div>
                      )}
                      {currentUser.start_date && (
                        <div>
                          <label className="block text-sm font-medium mb-2 flex items-center gap-2"><CalendarDays className="w-4 h-4" />Start Date</label>
                          <div className="bg-muted border rounded-md p-3"><p className="text-sm">{format(new Date(currentUser.start_date), 'dd MMMM yyyy')}</p></div>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-2"><Sun className="w-4 h-4" />Annual Leave</label>
                        <div className="grid grid-cols-3 gap-2 md:gap-3">
                          <div className="bg-muted border rounded-md p-3 text-center">
                            <p className="text-xs text-muted-foreground">Allowance</p>
                            <p className="text-lg md:text-xl font-bold">{currentUser.annual_leave_allowance || 25}</p>
                          </div>
                          <div className="bg-muted border rounded-md p-3 text-center">
                            <p className="text-xs text-muted-foreground">Taken</p>
                            <p className="text-lg md:text-xl font-bold text-blue-600">{currentUser.annual_leave_taken || 0}</p>
                          </div>
                          <div className="bg-muted border rounded-md p-3 text-center">
                            <p className="text-xs text-muted-foreground">Remaining</p>
                            <p className="text-lg md:text-xl font-bold text-green-600">{(currentUser.annual_leave_allowance || 25) - (currentUser.annual_leave_taken || 0)}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {currentUser.role !== 'admin' && isInternalUser && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Department Access</label>
                      <div className="bg-muted border rounded-md p-3">
                        <div className="flex flex-wrap gap-2">
                          {(currentUser.departments_access || []).map(dept => (
                            <span key={dept} className="bg-primary/10 text-primary px-3 py-1 text-xs md:text-sm rounded-full">{dept}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="app-card !p-4 md:!p-6">
                <h3 className="font-semibold mb-3 text-sm md:text-base">Account Information</h3>
                <div className="space-y-1 text-xs md:text-sm text-muted-foreground">
                  <p>Account created: {new Date(currentUser.created_date).toLocaleDateString()}</p>
                  <p>Last updated: {new Date(currentUser.updated_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="app-card !p-4 md:!p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm md:text-base">
              <Bell className="w-5 h-5 text-primary" />
              Notification Preferences
            </h3>
            <p className="text-sm text-muted-foreground mb-4 md:mb-6">
              Choose what notifications you want to receive. Changes are saved automatically.
            </p>
            <div className="space-y-3">
              {NOTIFICATION_PREFS.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between gap-3 p-3 md:p-4 bg-muted border rounded-md">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm md:text-base">{label}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={formData.notification_preferences[key]}
                    onCheckedChange={() => handleNotificationToggle(key)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}