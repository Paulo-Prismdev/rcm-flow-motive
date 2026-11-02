import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Shield, Loader2, Fingerprint, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthNotice from '@/components/auth/AuthNotice';
import OtpField from '@/components/auth/OtpField';
import {
  biometricWord, dismissPasskeyOffer, passkeysSupported, registerThisDevice,
  shouldOfferPasskey, verifyWithPasskey,
} from '@/lib/passkeys';

const fmtTime = (ms) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/**
 * The second sign-in step. Staff with Face ID / fingerprint set up on this kind of
 * device use that; otherwise (or as a fallback) the 6-digit code we email them. After
 * a code sign-in on a phone, tablet or laptop that supports it, we offer to set up
 * Face ID so next time is quicker.
 */
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
  const [canPasskey, setCanPasskey] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [offerSetup, setOfferSetup] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupError, setSetupError] = useState('');
  const otpRef = useRef(null);
  const word = biometricWord();

  const lockedMs = lockoutUntil ? new Date(lockoutUntil).getTime() : 0;
  const locked = lockedMs > now;
  const usePasskeyFirst = canPasskey && twofaStatus.hasPasskeys;

  useEffect(() => { passkeysSupported().then(setCanPasskey); }, []);

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
        setInfo(`We sent a code to ${user?.email || 'your email'}. It expires in 5 minutes.`);
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

  // Signing in sends the first code (unless Face ID is set up). This screen only sends
  // another when asked, so opening it never cancels a code that's on its way.
  useEffect(() => {
    if (twofaStatus.loading) return;
    if (twofaStatus.codeActive) setInfo(`We sent a code to ${user?.email || 'your email'}. It expires in 5 minutes.`);
    else if (!twofaStatus.hasPasskeys) setInfo(`Choose "Send a new code" to get a code at ${user?.email || 'your email'}.`);
    else setInfo('');
  }, [twofaStatus.loading, twofaStatus.codeActive, twofaStatus.hasPasskeys, user?.email]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const finish = async ({ viaCode }) => {
    // After a code sign-in, offer Face ID on a device that supports it.
    if (viaCode && canPasskey && user?.id && shouldOfferPasskey(user.id)) {
      setOfferSetup(true);
      return;
    }
    await refreshTwofaStatus();
  };

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
      if (res.data?.verified) await finish({ viaCode: true });
      else failed(res.data);
    } catch (err) {
      failed(err?.response?.data || { error: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePasskey = async () => {
    if (passkeyBusy || locked) return;
    setPasskeyBusy(true);
    setError('');
    try {
      const result = await verifyWithPasskey(user?.id);
      if (result.verified) await finish({ viaCode: false });
      else {
        if (result.lockedUntil) { setLockoutUntil(result.lockedUntil); setNow(Date.now()); }
        setError(`${word} isn't set up for this address yet. Use the emailed code this time.`);
      }
    } catch (e) {
      if (e?.lockedUntil) { setLockoutUntil(e.lockedUntil); setNow(Date.now()); }
      setError(e?.message || `${word} didn't work. Use the emailed code instead.`);
    } finally {
      setPasskeyBusy(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || sending || locked) return;
    setCode('');
    await sendCode();
    setTimeout(() => otpRef.current?.focus(), 50);
  };

  // ── Offer to set up Face ID after a code sign-in ──
  if (offerSetup) {
    const setUp = async () => {
      setSetupBusy(true);
      setSetupError('');
      try {
        await registerThisDevice(user.id);
        await refreshTwofaStatus();
      } catch (e) {
        setSetupError(e?.message || `${word} could not be set up.`);
        setSetupBusy(false);
      }
    };
    const notNow = async () => {
      dismissPasskeyOffer(user.id);
      await refreshTwofaStatus();
    };
    return (
      <AuthLayout icon={word === 'Face ID' ? ScanFace : Fingerprint} title={`Use ${word} next time?`} subtitle="Skip the emailed code on this device">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Next time you sign in on this device, you can confirm it's you with {word} instead of waiting for an email.
          Your face or fingerprint stays on the device. We never see it.
        </p>
        {setupError && <AuthNotice>{setupError}</AuthNotice>}
        <Button type="button" onClick={setUp} disabled={setupBusy} className="w-full h-12 font-medium bg-[#151d44] hover:bg-[#1f2a5c] text-white">
          {setupBusy ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />Setting up</>) : `Set up ${word}`}
        </Button>
        <Button type="button" variant="ghost" onClick={notNow} disabled={setupBusy} className="w-full h-11 mt-2">Not now</Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Shield}
      title={usePasskeyFirst ? 'Confirm it\'s you' : 'Check your email'}
      subtitle={usePasskeyFirst ? `Use ${word} to finish signing in` : 'Enter the 6-digit code we sent you to finish signing in'}
      footer={
        <>
          Not you, or can't get in?{' '}
          <button type="button" onClick={() => logout()} className="inline-flex h-11 items-center font-medium text-white hover:underline md:h-auto">
            Sign out
          </button>
        </>
      }
    >
      {error && !locked && <AuthNotice>{error}</AuthNotice>}
      {locked && <AuthNotice tone="warning">Too many failed attempts. You can try again at {fmtTime(lockedMs)}.</AuthNotice>}

      {usePasskeyFirst && (
        <>
          <Button type="button" onClick={handlePasskey} disabled={passkeyBusy || locked} className="w-full h-14 text-base font-medium bg-[#151d44] hover:bg-[#1f2a5c] text-white">
            {passkeyBusy
              ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />Waiting for {word}</>)
              : (<>{word === 'Face ID' ? <ScanFace className="w-5 h-5 mr-2" aria-hidden="true" /> : <Fingerprint className="w-5 h-5 mr-2" aria-hidden="true" />}Use {word}</>)}
          </Button>
          <div className="relative my-6" role="separator" aria-label="or">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-[#1c1c1e] px-3 text-gray-500">or use an emailed code</span>
            </div>
          </div>
        </>
      )}

      {info && <AuthNotice tone="info">{info}</AuthNotice>}

      <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} noValidate className="space-y-6">
        <OtpField ref={otpRef} value={code} onChange={setCode} onComplete={handleVerify} disabled={loading || locked} label="6-digit code" />
        <Button
          type="submit"
          variant={usePasskeyFirst ? 'outline' : 'default'}
          className={usePasskeyFirst ? 'w-full h-12 font-medium' : 'w-full h-12 font-medium bg-[#151d44] hover:bg-[#1f2a5c] text-white'}
          disabled={loading || code.length !== 6 || locked}
        >
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
          {sending ? 'Sending' : cooldown > 0 ? `Send a new code in ${cooldown}s` : (usePasskeyFirst && !twofaStatus.codeActive ? 'Email me a code' : 'Send a new code')}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-gray-500">
        A code expires in 5 minutes and works once. If you didn't try to sign in, ignore the email and let us know.
      </p>
    </AuthLayout>
  );
}
