import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { base44 } from '@/api/base44Client';

/**
 * Face ID / fingerprint sign-in (passkeys). The device does the face or finger check
 * itself; we only ever see a signed answer to a one-off challenge, checked on the server
 * by passkeyManage. A passkey belongs to one web address, so this works on the app's
 * real addresses only (not the Base44 editor preview).
 */
const ALLOWED_HOSTS = ['app.rcmautomotive.co.uk', 'artech-flow.base44.app'];

/** Whether this browser, on this address, can use Face ID / fingerprint. */
export async function passkeysSupported() {
  try {
    if (!ALLOWED_HOSTS.includes(window.location.hostname)) return false;
    if (!window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) return false;
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** What to call this device in the person's device list. */
export function deviceLabel() {
  const ua = navigator.userAgent || '';
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android phone' : 'Android tablet';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  return 'This device';
}

/** A short word for the device's own check, for button labels. */
export function biometricWord() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'Face ID';
  if (/Macintosh/.test(ua)) return 'Touch ID';
  if (/Windows/.test(ua)) return 'Windows Hello';
  return 'fingerprint';
}

const markerKey = (userId) => `passkey_on_device_${userId}`;
const dismissKey = (userId) => `passkey_offer_dismissed_${userId}`;

export function deviceHasPasskey(userId) {
  try { return !!localStorage.getItem(markerKey(userId)); } catch { return false; }
}

/** Whether to offer setting up Face ID on this device (not set up, not turned down lately). */
export function shouldOfferPasskey(userId) {
  try {
    if (deviceHasPasskey(userId)) return false;
    const dismissed = Number(localStorage.getItem(dismissKey(userId)));
    return !dismissed || Date.now() - dismissed > 30 * 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

export function dismissPasskeyOffer(userId) {
  try { localStorage.setItem(dismissKey(userId), String(Date.now())); } catch { /* storage unavailable */ }
}

const serverError = (e, fallback) => e?.response?.data?.error || fallback;

/** Readable message for the device's own refusals (cancelled, timed out, not allowed). */
function deviceError(e, fallback) {
  if (e?.name === 'NotAllowedError') return 'Cancelled, or it took too long. Try again, or use the emailed code.';
  if (e?.name === 'InvalidStateError') return 'This device is already set up.';
  return fallback;
}

/** Sets up Face ID / fingerprint on this device for the signed-in person. */
export async function registerThisDevice(userId) {
  let options;
  try {
    options = (await base44.functions.invoke('passkeyManage', { action: 'registerOptions' })).data?.options;
  } catch (e) {
    throw new Error(serverError(e, 'Face ID could not be set up just now.'));
  }
  let response;
  try {
    response = await startRegistration({ optionsJSON: options });
  } catch (e) {
    if (e?.name === 'InvalidStateError') {
      try { localStorage.setItem(markerKey(userId), '1'); } catch { /* storage unavailable */ }
      return { alreadyRegistered: true };
    }
    throw new Error(deviceError(e, 'Face ID could not be set up on this device.'));
  }
  try {
    await base44.functions.invoke('passkeyManage', { action: 'registerVerify', response, device_name: deviceLabel() });
  } catch (e) {
    throw new Error(serverError(e, 'Face ID could not be set up on this device.'));
  }
  try { localStorage.setItem(markerKey(userId), '1'); } catch { /* storage unavailable */ }
  return { ok: true };
}

/**
 * Passes the second sign-in step with Face ID / fingerprint. Returns { verified } on
 * success, { available: false } when no device is set up for this address.
 */
export async function verifyWithPasskey(userId) {
  let data;
  try {
    data = (await base44.functions.invoke('passkeyManage', { action: 'authOptions' })).data;
  } catch (e) {
    throw new Error(serverError(e, 'Face ID isn\'t available just now. Use the emailed code.'));
  }
  if (!data?.available) return { available: false, lockedUntil: data?.locked_until };
  let response;
  try {
    response = await startAuthentication({ optionsJSON: data.options });
  } catch (e) {
    throw new Error(deviceError(e, 'Face ID didn\'t work. Try again, or use the emailed code.'));
  }
  try {
    const res = await base44.functions.invoke('passkeyManage', { action: 'authVerify', response });
    if (res.data?.verified) {
      try { localStorage.setItem(markerKey(userId), '1'); } catch { /* storage unavailable */ }
      return { verified: true };
    }
    throw new Error(res.data?.error || 'Face ID didn\'t work.');
  } catch (e) {
    const err = new Error(serverError(e, e?.message || 'Face ID didn\'t work. Try again, or use the emailed code.'));
    err.lockedUntil = e?.response?.data?.locked_until;
    throw err;
  }
}
