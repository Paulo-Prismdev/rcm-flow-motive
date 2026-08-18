import { useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'base44_shown_notification_ids';
const MAX_STORED_IDS = 500;

function loadShownIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveShownId(id) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return;
    if (arr.includes(id)) return;
    arr.push(id);
    // Trim to prevent unbounded growth
    if (arr.length > MAX_STORED_IDS) {
      arr.splice(0, arr.length - MAX_STORED_IDS);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch { /* ignore quota errors */ }
}

/**
 * Hook to manage browser push notifications.
 * - Requests permission on first use
 * - Fires a browser notification for each new unread notification
 * - Tracks which notification IDs have already been shown (persisted in
 *   localStorage) to avoid re-firing the same notification after a component
 *   remount (common on tablets / mobile browsers)
 */
export function useBrowserNotifications(notifications, currentUser) {
  const shownIdsRef = useRef(loadShownIds());
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
        saveShownId(n.id);

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