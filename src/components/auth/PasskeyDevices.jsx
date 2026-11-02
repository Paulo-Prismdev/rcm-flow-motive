import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Fingerprint, Loader2, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import AuthNotice from '@/components/auth/AuthNotice';
import { biometricWord, passkeysSupported, registerThisDevice } from '@/lib/passkeys';
import { askConfirm } from '@/lib/dialogs';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '');

/**
 * The person's Face ID / fingerprint devices on their profile: what's set up, when each
 * was last used, a way to remove one (a lost or replaced phone), and a way to add this
 * device.
 */
export default function PasskeyDevices({ userId }) {
  const queryClient = useQueryClient();
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const word = biometricWord();

  useEffect(() => { passkeysSupported().then(setSupported); }, []);

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['passkey-devices'],
    queryFn: async () => (await base44.functions.invoke('passkeyManage', { action: 'list' })).data?.devices || [],
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['passkey-devices'] });
  };

  const add = async () => {
    setBusy('add');
    setError('');
    try {
      await registerThisDevice(userId);
      refresh();
    } catch (e) {
      setError(e?.message || `${word} could not be set up.`);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (device) => {
    if (!await askConfirm(`Remove ${device.device_name}? You'll use the emailed code on it until you set it up again.`)) return;
    setBusy(device.id);
    setError('');
    try {
      await base44.functions.invoke('passkeyManage', { action: 'remove', device_id: device.id });
      try { localStorage.removeItem(`passkey_on_device_${userId}`); } catch { /* storage unavailable */ }
      refresh();
    } catch (e) {
      setError(e?.response?.data?.error || 'Could not remove that device.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-4 pt-3 border-t">
      <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2"><Fingerprint className="w-3.5 h-3.5 text-primary" aria-hidden="true" />Face ID and fingerprint</h4>
      <p className="text-xs text-muted-foreground mb-3">
        Devices you can confirm your sign-in with instead of an emailed code. Your face or fingerprint never leaves the device.
      </p>
      {error && <AuthNotice>{error}</AuthNotice>}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : devices.length === 0 ? (
        <p className="text-xs text-muted-foreground mb-3">No devices set up yet.</p>
      ) : (
        <ul className="space-y-1.5 mb-3">
          {devices.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{d.device_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  Added {fmt(d.created_date)}{d.last_used_at ? ` · last used ${fmt(d.last_used_at)}` : ''}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${d.device_name}`} disabled={busy === d.id} onClick={() => remove(d)}>
                {busy === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {supported ? (
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={busy === 'add'}>
          {busy === 'add' ? (<><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Setting up</>) : `Set up ${word} on this device`}
        </Button>
      ) : (
        <p className="text-[11px] text-muted-foreground">To add a device, open this page on it (at app.rcmautomotive.co.uk) and choose “Set up Face ID”.</p>
      )}
    </div>
  );
}
