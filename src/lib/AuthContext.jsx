import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { takePasswordLoginFlags } from '@/lib/passwordPolicy';
import { signOut } from '@/lib/signOut';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }
  // The second sign-in step (emailed code): needed by staff, decided on the server.
  const [twofaStatus, setTwofaStatus] = useState({ required: false, verified: false, loading: true });

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `${appParams.serverUrl}/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        
        // Ensure loading screen shows for at least 3 seconds for animation
        await new Promise(resolve => setTimeout(resolve, 3000));
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const refreshTwofaStatus = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('twofaManage', { action: 'status' });
      const data = res.data || {};
      setTwofaStatus({
        required: !!data.required,
        verified: !!data.verified,
        loading: false,
        lockedUntil: data.locked_until,
        attemptsRemaining: data.attempts_remaining,
        codeActive: !!data.code_active,
      });
      return data;
    } catch {
      // Fails closed for staff: if we can't tell, the code screen is shown, and the
      // server's access rules decide what can be read either way.
      setTwofaStatus({ required: true, verified: false, loading: false, failed: true });
      return null;
    }
  }, []);

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();

      // A fresh sign-in is recognised by its token: a token we haven't seen before means
      // a new sign-in (even without signing out first), so the emailed code is needed
      // again. The same token in another tab is the same sign-in: no new code.
      const currentToken = appParams.token;
      const lastLoginToken = (() => { try { return localStorage.getItem('twofa_login_token'); } catch { return null; } })();
      if (currentToken && currentToken !== lastLoginToken) {
        await base44.functions.invoke('twofaManage', { action: 'login' }).catch(() => {});
        try { localStorage.setItem('twofa_login_token', currentToken); } catch { /* storage unavailable */ }
        // An email-and-password sign-in (or one straight after a reset) starts the
        // 90-day password clock. Google sign-ins leave no flag, so they're never held to it.
        const flags = takePasswordLoginFlags();
        if (flags) {
          await base44.functions.invoke('passwordManage', { action: 'noteLogin', reset: flags.reset }).catch(() => {});
        }
      }
      await refreshTwofaStatus();

      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true, reason) => {
    setUser(null);
    setIsAuthenticated(false);
    setTwofaStatus({ required: false, verified: false, loading: false });
    if (shouldRedirect) {
      signOut(reason);
    } else {
      base44.functions.invoke('twofaManage', { action: 'clear', reason }).catch(() => {});
      try { localStorage.removeItem('twofa_login_token'); localStorage.removeItem('last_activity_at'); } catch { /* storage unavailable */ }
      base44.auth.logout();
    }
  };

  // RCM's own sign-in page, which comes back here afterwards.
  const navigateToLogin = () => {
    if (window.location.pathname.startsWith('/login')) return;
    window.location.href = `/login?from=${encodeURIComponent(window.location.href)}`;
  };

  // Activity heartbeat for the second sign-in step: sent on real activity (clicks,
  // typing), at most once a minute. A late ping never revives a lapsed session.
  useEffect(() => {
    if (!isAuthenticated || !twofaStatus.verified) return undefined;
    let lastPing = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastPing < 60 * 1000) return;
      lastPing = now;
      base44.functions.invoke('twofaManage', { action: 'ping' })
        .then((res) => { if (res.data?.not_verified) setTwofaStatus((prev) => ({ ...prev, verified: false })); })
        .catch(() => {});
    };
    const events = ['click', 'keydown', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, onActivity));
  }, [isAuthenticated, twofaStatus.verified]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      twofaStatus,
      refreshTwofaStatus,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};