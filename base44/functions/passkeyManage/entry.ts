import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from 'npm:@simplewebauthn/server@13.2.3';
import { auditUser } from '../../shared/userAudit.ts';
import { lockoutState, markVerified, nowIso, recordFailure } from '../../shared/signInSession.ts';

/**
 * Face ID / fingerprint as the second sign-in step (passkeys, the WebAuthn standard).
 * The private key never leaves the person's phone, tablet or laptop; we keep only its
 * public key, and every sign-in is a fresh signed challenge from the device.
 *
 *   registerOptions / registerVerify   add this device (only after a verified sign-in)
 *   authOptions / authVerify           pass the second step with Face ID / fingerprint
 *   list                               this person's devices
 *   remove                             remove one of their own devices
 *   adminRemoveAll                     RCM admins: remove all of someone's devices (lost phone)
 *
 * A passkey belongs to one web address. Only the app's real addresses are accepted.
 */
const ALLOWED_HOSTS = ['app.rcmautomotive.co.uk', 'artech-flow.base44.app'];
const CHALLENGE_MINUTES = 5;

function relyingParty(req: Request) {
  const origin = req.headers.get('origin') || '';
  try {
    const url = new URL(origin);
    if (url.protocol === 'https:' && ALLOWED_HOSTS.includes(url.hostname)) {
      return { rpID: url.hostname, origin: url.origin };
    }
  } catch { /* fall through */ }
  return null;
}

const b64urlToBytes = (s: string) => {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
};
const bytesToB64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function loadUser(base44: any) {
  const me = await base44.auth.me().catch(() => null);
  if (!me) return null;
  return (await base44.asServiceRole.entities.User.get(me.id).catch(() => null)) || me;
}

async function credentialsOf(base44: any, userId: string) {
  const raw = await base44.asServiceRole.entities.PasskeyCredential.filter({ user_id: userId }).catch(() => []);
  return Array.isArray(raw) ? raw : (raw?.items || []);
}

async function saveChallenge(base44: any, userId: string, challenge: string, type: string) {
  await base44.asServiceRole.entities.User.update(userId, {
    webauthn_challenge: challenge, webauthn_challenge_at: nowIso(), webauthn_challenge_type: type,
  });
}

/** The pending challenge of the given type, used once: it is cleared as it is read. */
async function takeChallenge(base44: any, user: any, type: string) {
  const ok = user.webauthn_challenge && user.webauthn_challenge_type === type && user.webauthn_challenge_at
    && Date.parse(user.webauthn_challenge_at) + CHALLENGE_MINUTES * 60000 > Date.now();
  const challenge = ok ? user.webauthn_challenge : null;
  await base44.asServiceRole.entities.User.update(user.id, {
    webauthn_challenge: null, webauthn_challenge_at: null, webauthn_challenge_type: null,
  });
  return challenge;
}

const publicDevice = (c: any) => ({
  id: c.id, device_name: c.device_name || 'Device', rp_id: c.rp_id,
  created_date: c.created_date, last_used_at: c.last_used_at || null,
});

const cleanName = (s: unknown) => String(s || '').replace(/[^\w\s'().,-]/g, '').trim().slice(0, 60) || 'This device';

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action } = body || {};
    const user = await loadUser(base44);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (action === 'list') {
      return Response.json({ devices: (await credentialsOf(base44, user.id)).map(publicDevice) });
    }

    if (action === 'remove') {
      const creds = await credentialsOf(base44, user.id);
      const target = creds.find((c: any) => c.id === body.device_id);
      if (!target) return Response.json({ error: 'Device not found' }, { status: 404 });
      await base44.asServiceRole.entities.PasskeyCredential.delete(target.id);
      await auditUser(base44, user, 'Face ID Device Removed', `Removed Face ID / fingerprint device "${target.device_name || 'Device'}"`);
      return Response.json({ ok: true });
    }

    if (action === 'adminRemoveAll') {
      const isStaffAdmin = user.user_type === 'internal' && ['super_admin', 'admin'].includes(user.role);
      if (!isStaffAdmin) return Response.json({ error: 'Only RCM admins can do this.' }, { status: 403 });
      const target = typeof body.target_user_id === 'string'
        ? await base44.asServiceRole.entities.User.get(body.target_user_id).catch(() => null) : null;
      if (!target) return Response.json({ error: 'User not found' }, { status: 404 });
      const creds = await credentialsOf(base44, target.id);
      for (const c of creds) await base44.asServiceRole.entities.PasskeyCredential.delete(c.id).catch(() => {});
      await auditUser(base44, target, 'Face ID Devices Removed', `All Face ID / fingerprint devices removed by an admin (${creds.length})`, user);
      return Response.json({ ok: true, removed: creds.length });
    }

    const rp = relyingParty(req);
    if (!rp) {
      return Response.json({ error: 'Face ID and fingerprint sign-in only work on app.rcmautomotive.co.uk.', unsupported_origin: true }, { status: 400 });
    }

    if (action === 'registerOptions' || action === 'registerVerify') {
      // A device can only be added by someone who has just passed the second step,
      // so a stolen password can never be used to add an attacker's phone.
      if (!user.twofa_verified) return Response.json({ error: 'Sign in fully before adding a device.' }, { status: 403 });

      if (action === 'registerOptions') {
        const existing = (await credentialsOf(base44, user.id)).filter((c: any) => c.rp_id === rp.rpID);
        const options = await generateRegistrationOptions({
          rpName: 'RCM Flowmotive',
          rpID: rp.rpID,
          userName: user.email,
          userDisplayName: user.display_name || user.full_name || user.email,
          userID: new TextEncoder().encode(user.id),
          attestationType: 'none',
          excludeCredentials: existing.map((c: any) => ({ id: c.credential_id, transports: c.transports || undefined })),
          authenticatorSelection: { residentKey: 'preferred', userVerification: 'required', authenticatorAttachment: 'platform' },
          timeout: CHALLENGE_MINUTES * 60000,
        });
        await saveChallenge(base44, user.id, options.challenge, 'registration');
        return Response.json({ options });
      }

      const expectedChallenge = await takeChallenge(base44, user, 'registration');
      if (!expectedChallenge) return Response.json({ error: 'That took too long. Please try again.' }, { status: 400 });
      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response: body.response,
          expectedChallenge,
          expectedOrigin: rp.origin,
          expectedRPID: rp.rpID,
          requireUserVerification: true,
        });
      } catch (e: any) {
        return Response.json({ error: 'This device could not be set up. Please try again.', detail: String(e?.message || '').slice(0, 200) }, { status: 400 });
      }
      if (!verification.verified || !verification.registrationInfo) {
        return Response.json({ error: 'This device could not be set up. Please try again.' }, { status: 400 });
      }
      const { credential, credentialBackedUp } = verification.registrationInfo;
      await base44.asServiceRole.entities.PasskeyCredential.create({
        user_id: user.id,
        credential_id: credential.id,
        public_key: bytesToB64url(credential.publicKey),
        counter: credential.counter || 0,
        transports: credential.transports || [],
        rp_id: rp.rpID,
        device_name: cleanName(body.device_name),
        backed_up: !!credentialBackedUp,
      });
      await auditUser(base44, user, 'Face ID Device Added', `Added Face ID / fingerprint device "${cleanName(body.device_name)}"`);
      return Response.json({ ok: true });
    }

    if (action === 'authOptions') {
      const creds = (await credentialsOf(base44, user.id)).filter((c: any) => c.rp_id === rp.rpID);
      if (!creds.length) return Response.json({ available: false });
      const lockout = await lockoutState(base44, user);
      if (lockout.locked) return Response.json({ available: false, locked_until: lockout.lockedUntil });
      const options = await generateAuthenticationOptions({
        rpID: rp.rpID,
        allowCredentials: creds.map((c: any) => ({ id: c.credential_id, transports: c.transports || undefined })),
        userVerification: 'required',
        timeout: CHALLENGE_MINUTES * 60000,
      });
      await saveChallenge(base44, user.id, options.challenge, 'authentication');
      return Response.json({ available: true, options });
    }

    if (action === 'authVerify') {
      const lockout = await lockoutState(base44, user);
      if (lockout.locked) {
        return Response.json({ error: 'Too many failed attempts. Please wait and try again.', locked_until: lockout.lockedUntil, locked: true }, { status: 423 });
      }
      const expectedChallenge = await takeChallenge(base44, user, 'authentication');
      if (!expectedChallenge) return Response.json({ error: 'That took too long. Please try again.' }, { status: 400 });

      const responseId = body?.response?.id;
      const cred = (await credentialsOf(base44, user.id)).find((c: any) => c.credential_id === responseId && c.rp_id === rp.rpID);
      if (!cred) return Response.json({ error: 'This device isn\'t set up for your account. Use the emailed code instead.' }, { status: 400 });

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: body.response,
          expectedChallenge,
          expectedOrigin: rp.origin,
          expectedRPID: rp.rpID,
          credential: {
            id: cred.credential_id,
            publicKey: b64urlToBytes(cred.public_key),
            counter: cred.counter || 0,
            transports: cred.transports || undefined,
          },
          requireUserVerification: true,
        });
      } catch {
        verification = { verified: false } as any;
      }

      if (!verification.verified) {
        const f = await recordFailure(base44, user, lockout.justExpired);
        await auditUser(base44, user, 'Face ID Failed', `Face ID / fingerprint check failed (${f.attempts})`);
        return Response.json({ error: 'Face ID / fingerprint didn\'t work. Try again or use the emailed code.', ...(f.lockUntil ? { locked_until: f.lockUntil, locked: true } : {}) }, { status: f.lockUntil ? 423 : 400 });
      }

      await base44.asServiceRole.entities.PasskeyCredential.update(cred.id, {
        counter: verification.authenticationInfo?.newCounter ?? cred.counter,
        last_used_at: nowIso(),
      });
      const verifiedAt = await markVerified(base44, user.id);
      await auditUser(base44, user, 'Sign-in Verified', `Completed the sign-in step with Face ID / fingerprint ("${cred.device_name || 'Device'}")`);
      return Response.json({ verified: true, verified_at: verifiedAt });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('passkeyManage error:', error?.message);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
