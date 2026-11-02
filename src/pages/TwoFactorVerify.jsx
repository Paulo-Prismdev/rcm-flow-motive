import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthNotice from '@/components/auth/AuthNotice';
import OtpField from '@/components/auth/OtpField';

const fmtTime = (ms) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** The second sign-in step: the 6-digit code we email to staff after their password. */
export default function TwoFactorVerify() {
  const { user, refreshTwofaStatus, twofaStatus, logout } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [lockoutUntil, setLockoutUntil] = useState(twofaStatus.lockedUntil || null);
  const [now, setNow] = useState(() => Date.now());
  const [attemptsRemaining, setAttemptsRemaining] = useState(twofaStatus.attemptsRemaining ?? 5);
  const [cooldown, setCooldown] = useState(0);
  const otpRef = useRef(null);

  const lockedMs = lockoutUntil ? new Date(lockoutUntil).getTime() : 0;
  const locked = lockedMs > now;

  // When a lockout runs out, let the person try again.
  useEffect(() => {
    if (!lockedMs) return undefined;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= lockedMs) {
        setLockoutUntil(null);
        setError('');
        setAttemptsRemaining(5);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [lockedMs]);

  const sendCode = useCallback(async () => {
    setSending(true);
    setError('');
    try {
      const res = await base44.functions.invoke('twofaManage', { action: 'initiate' });
      if (res.data?.sent) {
        setInfo(`We sent a new code to ${user?.email || 'your email'}. It expires in 5 minutes.`);
        setCooldown(30);
        refreshTwofaStatus();
      } else if (res.data?.already_verified || res.data?.not_required) {
        refreshTwofaStatus();
      }
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.error || 'We could not send a code. Please try again.');
      if (data?.cooldown_remaining) setCooldown(data.cooldown_remaining);
      if (data?.locked_until) { setLockoutUntil(data.locked_until); setNow(Date.now()); }
    } finally {
      setSending(false);
    }
  }, [user, refreshTwofaStatus]);

  // Signing in sends the first code. This screen only sends another when asked, so
  // opening it (or a second tab) never cancels a code that's on its way.
  useEffect(() => {
    if (twofaStatus.loading) return;
    setInfo(twofaStatus.codeActive
      ? `We sent a code to ${user?.email || 'your email'}. It expires in 5 minutes.`
      : `Choose "Send a new code" to get a code at ${user?.email || 'your email'}.`);
  }, [twofaStatus.loading, twofaStatus.codeActive, user?.email]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const failed = (data) => {
    setError(data?.error || "That code didn't work. Check it and try again.");
    if (data?.locked_until) { setLockoutUntil(data.locked_until); setNow(Date.now()); }
    if (data?.attempts_remaining != null) setAttemptsRemaining(data.attempts_remaining);
    setCode('');
    setTimeout(() => otpRef.current?.focus(), 50);
  };

  const handleVerify = async (value = code) => {
    if (loading || locked) return;
    if (value.length !== 6) {
      setError('Enter all 6 digits of the code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('twofaManage', { action: 'verify', code: value });
      if (res.data?.verified) {
        await refreshTwofaStatus();
      } else {
        failed(res.data);
      }
    } catch (err) {
      failed(err?.response?.data || { error: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || sending || locked) return;
    setCode('');
    await sendCode();
    setTimeout(() => otpRef.current?.focus(), 50);
  };

  return (
    <AuthLayout
      icon={Shield}
      title="Check your email"
      subtitle="Enter the 6-digit code we sent you to finish signing in"
      footer={
        <>
          Not you, or can't get the code?{' '}
          <button type="button" onClick={() => logout()} className="inline-flex h-11 items-center font-medium text-white hover:underline md:h-auto">
            Sign out
          </button>
        </>
      }
    >
      {info && <AuthNotice tone="info">{info}</AuthNotice>}
      {error && !locked && <AuthNotice>{error}</AuthNotice>}
      {locked && <AuthNotice tone="warning">Too many wrong codes. You can try again at {fmtTime(lockedMs)}.</AuthNotice>}

      <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} noValidate className="space-y-6">
        <OtpField ref={otpRef} value={code} onChange={setCode} onComplete={handleVerify} disabled={loading || locked} label="6-digit code" />
        <Button type="submit" className="w-full h-12 font-medium bg-[#151d44] hover:bg-[#1f2a5c] text-white" disabled={loading || code.length !== 6 || locked}>
          {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />Checking</>) : 'Verify code'}
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-gray-500" aria-live="polite">
          {!locked && attemptsRemaining < 5 && `${attemptsRemaining} ${attemptsRemaining === 1 ? 'try' : 'tries'} left`}
        </span>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || sending || locked}
          className="h-11 text-sm text-blue-700 dark:text-blue-300 font-medium hover:underline disabled:opacity-50 disabled:no-underline md:h-9"
        >
          {sending ? 'Sending' : cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-gray-500">
        The code expires in 5 minutes and works once. If you didn't try to sign in, ignore the email and let us know.
      </p>
    </AuthLayout>
  );
}
