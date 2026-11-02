import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { PASSWORD_HINT, passwordProblem } from '@/lib/passwordPolicy';
import AuthNotice from '@/components/auth/AuthNotice';
import PasswordField from '@/components/auth/PasswordField';

// Current password, new password, confirm. Used on the "password expired" screen, the
// reminder dialog and the profile page. Errors show beside the field, and what was
// typed stays where it is.
export default function ChangePasswordForm({ onDone, submitLabel = 'Save new password', idPrefix = 'cp' }) {
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setNotice('');
    const found = {};
    if (!current) found.current = 'Enter your current password.';
    const problem = passwordProblem(next, current, user?.email);
    if (problem) found.next = problem;
    if (!found.next && next !== confirm) found.confirm = 'The two passwords do not match.';
    setErrors(found);
    if (Object.keys(found).length) {
      const first = found.current ? 'current' : found.next ? 'next' : 'confirm';
      document.getElementById(`${idPrefix}-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await base44.functions.invoke('passwordManage', { action: 'change', currentPassword: current, newPassword: next });
      onDone?.();
    } catch (err) {
      const data = err?.response?.data;
      const message = data?.error || 'We could not change your password. Please try again.';
      if (data?.field === 'currentPassword') setErrors({ current: message });
      else if (data?.field === 'newPassword') setErrors({ next: message });
      else setNotice(message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {notice && <AuthNotice>{notice}</AuthNotice>}
      <PasswordField
        id={`${idPrefix}-current`}
        label="Current password"
        value={current}
        onChange={(v) => { setCurrent(v); setErrors((p) => ({ ...p, current: '' })); }}
        autoComplete="current-password"
        error={errors.current}
        autoFocus
      />
      <PasswordField
        id={`${idPrefix}-next`}
        label="New password"
        value={next}
        onChange={(v) => { setNext(v); setErrors((p) => ({ ...p, next: '', confirm: '' })); }}
        autoComplete="new-password"
        error={errors.next}
        hint={PASSWORD_HINT}
      />
      <PasswordField
        id={`${idPrefix}-confirm`}
        label="Confirm new password"
        value={confirm}
        onChange={(v) => { setConfirm(v); setErrors((p) => ({ ...p, confirm: '' })); }}
        autoComplete="new-password"
        error={errors.confirm}
      />
      <Button type="submit" className="h-12 w-full font-medium" disabled={busy}>
        {busy ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Saving</>) : submitLabel}
      </Button>
    </form>
  );
}
