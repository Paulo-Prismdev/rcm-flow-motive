import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Mail, Camera, Loader, ArrowLeft, Save, Shield, Bell, Briefcase, CalendarDays, Sun, MapPin, Phone, User } from "lucide-react";
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
  { key: 'tagged_in_notes', label: 'Tagged in Notes', desc: 'Mentions in notes or updates' },
  { key: 'status_changes', label: 'Status Changes', desc: 'Status changes on your items' },
  { key: 'new_assignments', label: 'New Assignments', desc: 'New items assigned to you' },
  { key: 'task_assignments', label: 'Task Assignments', desc: 'Tasks assigned to you' },
  { key: 'invoice_updates', label: 'Invoice Updates', desc: 'Invoice status changes' },
  { key: 'estimate_requests', label: 'Estimate Requests', desc: 'New estimate requests' },
  { key: 'parts_updates', label: 'Parts Updates', desc: 'Parts order updates' },
  { key: 'engineering_updates', label: 'Engineering Updates', desc: 'Engineering report updates' },
];

const EMAIL_PREFS = [
  { key: 'email_tagged_in_notes', label: 'Tagged in Notes', desc: 'Email me when mentioned' },
  { key: 'email_status_changes', label: 'Status Changes', desc: 'Email me on status changes' },
];

const DEFAULT_PREFS = {
  tagged_in_notes: true, status_changes: true, new_assignments: true, task_assignments: true,
  invoice_updates: true, estimate_requests: true, parts_updates: false, engineering_updates: false,
  email_tagged_in_notes: true, email_status_changes: false,
};

const Field = ({ label, icon: Icon, children, full }) => (
  <div className={full ? "sm:col-span-2" : ""}>
    <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5">
      {Icon && <Icon className="w-3 h-3" />}{label}
    </label>
    {children}
  </div>
);

const ValueBox = ({ children, muted }) => (
  <div className={`bg-muted/60 border rounded-md px-2.5 py-1.5 text-sm min-h-[36px] flex items-center ${muted ? 'text-muted-foreground italic' : ''}`}>
    {children}
  </div>
);

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
        full_name: formData.full_name, profile_picture_url: formData.profile_picture_url,
        phone: formData.phone, address_line_1: formData.address_line_1, address_line_2: formData.address_line_2,
        town: formData.town, county: formData.county, postcode: formData.postcode,
        emergency_contact_name: formData.emergency_contact_name, emergency_contact_phone: formData.emergency_contact_phone,
      }, { onSuccess: () => setIsEditing(false) });
    } catch (error) {
      console.error("Error saving profile data:", error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(prev => ({
      ...prev,
      full_name: currentUser.full_name || '', profile_picture_url: currentUser.profile_picture_url || '',
      phone: currentUser.phone || '', address_line_1: currentUser.address_line_1 || '',
      address_line_2: currentUser.address_line_2 || '', town: currentUser.town || '',
      county: currentUser.county || '', postcode: currentUser.postcode || '',
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
    return <div className="flex items-center justify-center h-full"><Loader className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const isInternalUser = currentUser?.user_type === 'internal' || currentUser?.role === 'admin';
  const avatarSrc = isEditing ? formData.profile_picture_url : currentUser.profile_picture_url;

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-6">
      <div className="max-w-4xl mx-auto space-y-3 md:space-y-4">

        {/* Compact header with avatar */}
        <div className="app-card !p-3 md:!p-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("Dashboard")} className="flex-shrink-0">
              <Button variant="outline" size="icon" className="h-9 w-9"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Profile" className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover" />
              ) : (
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full ${getAvatarColor(currentUser.email)} flex items-center justify-center`}>
                  <span className="text-base md:text-lg font-bold text-white">{getUserInitials(currentUser)}</span>
                </div>
              )}
              {isEditing && (
                <label className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-1 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-md">
                  <Camera className="w-3 h-3" />
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploadingImage} />
                </label>
              )}
              {isUploadingImage && <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center"><Loader className="w-4 h-4 animate-spin text-white" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base md:text-lg font-bold truncate">{currentUser.full_name || 'My Profile'}</h1>
              <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
            </div>
            {isEditing && formData.profile_picture_url && (
              <Button onClick={handleRemovePhoto} variant="ghost" size="sm" className="text-destructive text-xs flex-shrink-0 hidden md:inline-flex">Remove</Button>
            )}
            <div className="flex gap-2 flex-shrink-0">
              {activeTab === 'profile' && !isEditing && <Button onClick={() => setIsEditing(true)} size="sm">Edit</Button>}
              {activeTab === 'profile' && isEditing && (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
                  <Button size="sm" onClick={handleSave} disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" />Save</>}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="app-card !p-1 flex gap-1">
          <button onClick={() => setActiveTab('profile')} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>Profile</button>
          <button onClick={() => setActiveTab('notifications')} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>Notifications</button>
        </div>

        {/* Profile Tab — single compact card */}
        {activeTab === 'profile' && (
          <div className="app-card !p-3 md:!p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 md:gap-y-4">

              <Field label="Full Name" icon={User}>
                {isEditing ? <Input value={formData.full_name} onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))} placeholder="Full name" /> : <ValueBox>{currentUser.full_name || 'Not set'}</ValueBox>}
              </Field>

              <Field label="Email" icon={Mail}>
                <ValueBox muted>{currentUser.email}</ValueBox>
              </Field>

              {isInternalUser && (
                <Field label="Phone" icon={Phone}>
                  {isEditing ? <Input value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="Phone" /> : <ValueBox muted={!currentUser.phone}>{currentUser.phone || 'Not set'}</ValueBox>}
                </Field>
              )}

              <Field label="Role" icon={Shield}>
                <div className="flex flex-wrap gap-1.5 items-center min-h-[36px]">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentUser.role === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-blue-500 text-white'}`}>{currentUser.role === 'admin' ? 'Administrator' : 'User'}</span>
                  {currentUser.can_manage_permissions && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500 text-white">Permissions</span>}
                </div>
              </Field>

              {isInternalUser && currentUser.job_title && (
                <Field label="Job Title" icon={Briefcase}><ValueBox>{currentUser.job_title}</ValueBox></Field>
              )}
              {isInternalUser && currentUser.start_date && (
                <Field label="Start Date" icon={CalendarDays}><ValueBox>{format(new Date(currentUser.start_date), 'dd MMM yyyy')}</ValueBox></Field>
              )}

              {isInternalUser && (
                <Field label="Address" icon={MapPin} full>
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <Input value={formData.address_line_1} onChange={(e) => setFormData(prev => ({ ...prev, address_line_1: e.target.value }))} placeholder="Address Line 1" />
                      <Input value={formData.address_line_2} onChange={(e) => setFormData(prev => ({ ...prev, address_line_2: e.target.value }))} placeholder="Address Line 2" />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                        <Input value={formData.town} onChange={(e) => setFormData(prev => ({ ...prev, town: e.target.value }))} placeholder="Town" />
                        <Input value={formData.county} onChange={(e) => setFormData(prev => ({ ...prev, county: e.target.value }))} placeholder="County" />
                        <Input value={formData.postcode} onChange={(e) => setFormData(prev => ({ ...prev, postcode: e.target.value }))} placeholder="Postcode" />
                      </div>
                    </div>
                  ) : (
                    <ValueBox muted={!currentUser.address_line_1}>
                      {currentUser.address_line_1 ? (
                        <span>{[currentUser.address_line_1, currentUser.address_line_2, [currentUser.town, currentUser.county].filter(Boolean).join(', '), currentUser.postcode].filter(Boolean).join(', ')}</span>
                      ) : 'Not set'}
                    </ValueBox>
                  )}
                </Field>
              )}

              {isInternalUser && (
                <>
                  <Field label="Emergency Contact Name">
                    {isEditing ? <Input value={formData.emergency_contact_name} onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))} placeholder="Name" /> : <ValueBox muted={!currentUser.emergency_contact_name}>{currentUser.emergency_contact_name || 'Not set'}</ValueBox>}
                  </Field>
                  <Field label="Emergency Contact Phone">
                    {isEditing ? <Input value={formData.emergency_contact_phone} onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))} placeholder="Phone" /> : <ValueBox muted={!currentUser.emergency_contact_phone}>{currentUser.emergency_contact_phone || 'Not set'}</ValueBox>}
                  </Field>
                </>
              )}
            </div>

            {/* Annual leave + departments — compact rows */}
            {isInternalUser && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Annual Leave:</span>
                    <span className="text-sm font-medium">{currentUser.annual_leave_taken || 0} taken</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-sm font-bold text-green-600">{(currentUser.annual_leave_allowance || 25) - (currentUser.annual_leave_taken || 0)} left</span>
                    <span className="text-xs text-muted-foreground">of {currentUser.annual_leave_allowance || 25}</span>
                  </div>
                </div>
                {currentUser.role !== 'admin' && currentUser.departments_access?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-1">Departments:</span>
                    {currentUser.departments_access.map(dept => <span key={dept} className="bg-primary/10 text-primary px-2 py-0.5 text-xs rounded-full">{dept}</span>)}
                  </div>
                )}
              </div>
            )}

            <p className="mt-3 pt-3 border-t text-[11px] text-muted-foreground">
              Account created {new Date(currentUser.created_date).toLocaleDateString()} · Updated {new Date(currentUser.updated_date).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="app-card !p-3 md:!p-4">
            <h3 className="font-semibold mb-1 flex items-center gap-2 text-sm"><Bell className="w-4 h-4 text-primary" />Notification Preferences</h3>
            <p className="text-xs text-muted-foreground mb-3">Changes save automatically.</p>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">In-App</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {NOTIFICATION_PREFS.map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-2 p-2.5 bg-muted/50 border rounded-md">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{desc}</p>
                      </div>
                      <Switch checked={formData.notification_preferences[key]} onCheckedChange={() => handleNotificationToggle(key)} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Email</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EMAIL_PREFS.map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-2 p-2.5 bg-muted/50 border rounded-md">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{desc}</p>
                      </div>
                      <Switch checked={formData.notification_preferences[key]} onCheckedChange={() => handleNotificationToggle(key)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}