import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Loader, Check, X } from 'lucide-react';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';

export default function Notifications() {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      const allNotifications = await base44.entities.Notification.list('-created_date', 50);
      return allNotifications.filter(n => n.user_email === currentUser.email);
    },
    enabled: !!currentUser,
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => 
      base44.entities.Notification.update(notificationId, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId) => 
      base44.entities.Notification.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Browser push notifications — requests permission & fires for new unread items
  useBrowserNotifications(notifications, currentUser);

  const handleMarkAsRead = (e, notificationId) => {
    e.preventDefault();
    e.stopPropagation();
    markAsReadMutation.mutate(notificationId);
  };

  const handleDelete = (e, notificationId) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNotificationMutation.mutate(notificationId);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="glass-button w-8 h-8 flex items-center justify-center relative">
          <Bell className="w-3.5 h-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold" style={{fontSize:'9px'}}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="glass-elevated w-96 p-0 border-glass-border-strong max-h-[500px] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-glass-border">
          <h4 className="font-bold text-lg">Notifications</h4>
          {unreadCount > 0 && (
            <p className="text-xs text-foreground-muted mt-1">{unreadCount} unread</p>
          )}
        </div>
        
        <div className="overflow-y-auto flex-1">
          {isLoading && (
            <div className="flex justify-center p-8">
              <Loader className="animate-spin text-accent w-6 h-6" />
            </div>
          )}
          
          {!isLoading && notifications.length === 0 && (
            <p className="text-center text-sm text-foreground-muted py-8">
              No notifications yet.
            </p>
          )}
          
          {!isLoading && notifications.length > 0 && (
            <div className="space-y-1 p-2">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg transition-all ${
                    notification.is_read 
                      ? 'glass-inset opacity-60' 
                      : 'glass-elevated'
                  }`}
                >
                  {notification.link ? (
                    <Link 
                      to={notification.link} 
                      className="block"
                      onClick={() => !notification.is_read && markAsReadMutation.mutate(notification.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{notification.title}</p>
                          <p className="text-xs text-foreground-muted mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-foreground-subtle mt-1">
                            {new Date(notification.created_date).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {!notification.is_read && (
                            <button
                              className="surface-button w-6 h-6 flex items-center justify-center"
                              onClick={(e) => handleMarkAsRead(e, notification.id)}
                              title="Mark as read"
                              >
                              <Check className="w-3 h-3" />
                              </button>
                              )}
                              <button
                              className="surface-button w-6 h-6 flex items-center justify-center text-red-500"
                              onClick={(e) => handleDelete(e, notification.id)}
                              title="Delete"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{notification.title}</p>
                        <p className="text-xs text-foreground-muted mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-foreground-subtle mt-1">
                          {new Date(notification.created_date).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {!notification.is_read && (
                          <button
                            className="surface-button w-6 h-6 flex items-center justify-center"
                            onClick={(e) => handleMarkAsRead(e, notification.id)}
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          className="surface-button w-6 h-6 flex items-center justify-center text-red-500"
                          onClick={(e) => handleDelete(e, notification.id)}
                          title="Delete"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}