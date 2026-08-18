import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader, Save, Camera, Mail, User, Bell } from "lucide-react";

const getUserInitials = (user) => {
  if (!user) return '?';
  const name = user.full_name || user.display_name;
  if (name) {
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
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
  { key: 'status_changes', emailKey: 'email_status_changes', label: 'Status Changes', desc: 'When a claim/repair status changes' },
  { key: 'tagged_in_notes', emailKey: 'email_tagged_in_notes', label: 'Tagged in Notes', desc: 'When someone mentions you' },
];

const DEFAULT_PREFS = {
  status_changes: true, tagged_in_notes: true,
  email_status_changes: false, email_tagged_in_notes: true,
};

export default function PortalProfileModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', profile_picture_url: '', notification_preferences: { ...DEFAULT_PREFS } });

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: open,
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        full_name: currentUser.full_name || currentUser.display_name || '',
        profile_picture_url: currentUser.profile_picture_url || '',
        notification_preferences: currentUser.notification_preferences || { ...DEFAULT_PREFS },
      });
    }
  }, [currentUser]);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currentUser'] }),
  });

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, profile_picture_url: result.file_url }));
    } catch (e) {
      console.error("Upload failed:", e);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    await updateProfileMutation.mutateAsync({ full_name: formData.full_name, profile_picture_url: formData.profile_picture_url });
    setIsEditing(false);
  };

  const handleNotificationToggle = (key) => {
    const newPrefs = { ...formData.notification_preferences, [key]: !formData.notification_preferences[key] };
    setFormData(prev => ({ ...prev, notification_preferences: newPrefs }));
    updateProfileMutation.mutate({ notification_preferences: newPrefs });
  };

  const avatarSrc = isEditing ? formData.profile_picture_url : currentUser?.profile_picture_url;
  const displayName = currentUser?.full_name || currentUser?.display_name || 'User';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><User className="w-4 h-4" />My Profile</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-5">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className={`w-16 h-16 rounded-full ${getAvatarColor(currentUser.email)} flex items-center justify-center`}>
                    <span className="text-xl font-bold text-white">{getUserInitials(currentUser)}</span>
                  </div>
                )}
                {isEditing && (
                  <label className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-1.5 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-md">
                    <Camera className="w-3.5 h-3.5" />
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploadingImage} />
                  </label>
                )}
                {isUploadingImage && <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center"><Loader className="w-4 h-4 animate-spin text-white" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <Input value={formData.full_name} onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))} placeholder="Your name" />
                ) : (
                  <p className="font-semibold truncate">{displayName}</p>
                )}
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />{currentUser.email}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {!isEditing ? (
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setFormData(prev => ({ ...prev, full_name: currentUser.full_name || currentUser.display_name || '', profile_picture_url: currentUser.profile_picture_url || '' })); }}>Cancel</Button>
                    <Button size="sm" onClick={handleSave} disabled={updateProfileMutation.isPending}>
                      {updateProfileMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" />Save</>}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Notifications */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-1 flex items-center gap-2 text-sm"><Bell className="w-4 h-4 text-primary" />Notification Preferences</h3>
              <p className="text-xs text-muted-foreground mb-3">Choose what updates you receive. Changes save automatically.</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1 pb-1">
                  <div className="flex-1" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-12 text-center">In-App</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-12 text-center">Email</span>
                </div>
                {NOTIFICATION_PREFS.map(({ key, emailKey, label, desc }) => (
                  <div key={key} className="flex items-center gap-2 p-2.5 bg-muted/50 border rounded-md">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-[11px] text-muted-foreground">{desc}</p>
                    </div>
                    <Switch checked={!!formData.notification_preferences[key]} onCheckedChange={() => handleNotificationToggle(key)} className="flex-shrink-0" />
                    <Switch checked={!!formData.notification_preferences[emailKey]} onCheckedChange={() => handleNotificationToggle(emailKey)} className="flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}