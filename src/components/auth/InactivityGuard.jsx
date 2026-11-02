import React, { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Signs everyone out after 30 minutes with no activity, with a warning first (at 28).
// Activity in any open tab counts for all of them. The server drops the second sign-in
// step at 30 minutes too (twofaManage), so closing the tab doesn't leave a session open.
const LOGOUT_AFTER_MS = 30 * 60 * 1000;
const WARN_AFTER_MS = 28 * 60 * 1000;
const TICK_MS = 1000;
const WRITE_THROTTLE_MS = 5 * 1000;
const KEY = 'last_activity_at';

function readLast() {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}

function writeLast(ts) {
  try { localStorage.setItem(KEY, String(ts)); } catch { /* storage unavailable: this tab still tracks its own time */ }
}

export default function InactivityGuard() {
  const { logout } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(null); // null = no warning showing
  const lastLocal = useRef(Date.now());
  const lastWrite = useRef(0);
  const loggedOut = useRef(false);

  const lastActivity = useCallback(() => Math.max(lastLocal.current, readLast()), []);

  const touch = useCallback((force = false) => {
    const now = Date.now();
    lastLocal.current = now;
    if (force || now - lastWrite.current >= WRITE_THROTTLE_MS) {
      lastWrite.current = now;
      writeLast(now);
    }
  }, []);

  const signOut = useCallback(() => {
    if (loggedOut.current) return;
    loggedOut.current = true;
    logout(true, 'inactivity');
  }, [logout]);

  useEffect(() => {
    touch(true);
    const onActivity = () => {
      // While the warning is up, only its buttons count: a stray mouse move must not hide it.
      if (document.body.dataset.inactivityWarning === '1') return;
      touch();
    };
    const events = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    window.addEventListener('scroll', onActivity, { passive: true, capture: true });
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.removeEventListener('scroll', onActivity, { capture: true });
    };
  }, [touch]);

  useEffect(() => {
    const tick = () => {
      const idle = Date.now() - lastActivity();
      if (idle >= LOGOUT_AFTER_MS) {
        document.body.dataset.inactivityWarning = '0';
        setSecondsLeft(0);
        signOut();
      } else if (idle >= WARN_AFTER_MS) {
        document.body.dataset.inactivityWarning = '1';
        setSecondsLeft(Math.max(0, Math.ceil((LOGOUT_AFTER_MS - idle) / 1000)));
      } else {
        document.body.dataset.inactivityWarning = '0';
        setSecondsLeft((s) => (s === null ? s : null));
      }
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => {
      clearInterval(id);
      delete document.body.dataset.inactivityWarning;
    };
  }, [lastActivity, signOut]);

  const stay = () => {
    touch(true);
    document.body.dataset.inactivityWarning = '0';
    setSecondsLeft(null);
    // Keep the second sign-in step alive too (the server ignores this if it has lapsed).
    base44.functions.invoke('twofaManage', { action: 'ping' }).catch(() => {});
  };

  const open = secondsLeft !== null;
  const mins = Math.floor((secondsLeft || 0) / 60);
  const secs = String((secondsLeft || 0) % 60).padStart(2, '0');

  return (
    <AlertDialog open={open} onOpenChange={() => { /* closes only through the two buttons */ }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you still there?</AlertDialogTitle>
          <AlertDialogDescription>
            You haven't done anything for a while. For your security you'll be signed out in{' '}
            <span className="font-semibold tabular-nums text-foreground" role="timer">{mins}:{secs}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={signOut}>Sign out now</AlertDialogCancel>
          <AlertDialogAction onClick={stay}>Stay signed in</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
