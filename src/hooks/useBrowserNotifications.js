import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook to manage browser push notifications.
 * - Requests permission on first use
 * - Fires a browser notification for each new unread notification
 * - Tracks which notification IDs have already been shown to avoid duplicates
 */
export function useBrowserNotifications(notifications, currentUser) {
  const shownIdsRef = useRef(new Set());
  const permissionRef = useRef(null);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
      return 'granted';
    }
    if (Notification.permission === 'denied') {
      permissionRef.current = 'denied';
      return 'denied';
    }
    // 'default' — ask the user
    const result = await Notification.requestPermission();
    permissionRef.current = result;
    return result;
  }, []);

  // Request permission as soon as we have a logged-in user
  useEffect(() => {
    if (!currentUser) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      requestPermission();
    } else {
      permissionRef.current = Notification.permission;
    }
  }, [currentUser, requestPermission]);

  // Fire browser notifications for new unread items
  useEffect(() => {
    if (!currentUser) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (!notifications || notifications.length === 0) return;

    notifications.forEach((n) => {
      // Only show unread notifications we haven't shown before
      if (!n.is_read && !shownIdsRef.current.has(n.id)) {
        shownIdsRef.current.add(n.id);

        const notification = new Notification(n.title, {
          body: n.message,
          icon: '/favicon.ico',
          tag: n.id, // prevents duplicates if hook runs twice
          silent: false,
        });

        // Auto-close after 6 seconds
        setTimeout(() => notification.close(), 6000);
      }
    });
  }, [notifications, currentUser]);

  return { requestPermission, permission: permissionRef.current };
}