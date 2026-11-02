import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Lock, Loader2, AlertTriangle } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthNotice from '@/components/auth/AuthNotice';
import PasswordField from '@/components/auth/PasswordField';
import { authErrorMessage } from '@/components/auth/authErrors';
import { PASSWORD_HINT, passwordProblem, markPasswordReset } from '@/lib/passwordPolicy';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    const problem = newPassword ? passwordProblem(newPassword) : 'Choose a new password.';
    if (problem) {
      setPasswordError(problem);
      document.getElementById('password')?.focus();
      return;
    }
    if (newPassword !== confirmPassword) {
      setConfirmError('The two passwords do not match.');
      document.getElementById('confirm')?.focus();
      return;
    }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword });
      markPasswordReset();
      window.location.href = '/login';
    } catch (err) {
      setError(authErrorMessage(err, "We couldn't reset your password. The link may have expired."));
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="This link doesn't work"
        subtitle="The password reset link is missing or incomplete"
        footer={<Link to="/forgot-password" className="inline-flex h-11 items-center font-medium text-white hover:underline md:h-auto">Request a new link</Link>}
      >
        <p className="text-sm text-center">Open the link from your email again, or ask for a new reset email.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Lock}
      title="Choose a new password"
      subtitle="Then sign in with it"
      footer={<Link to="/forgot-password" className="inline-flex h-11 items-center font-medium text-white hover:underline md:h-auto">Link expired? Request a new one</Link>}
    >
      {error && <AuthNotice>{error}</AuthNotice>}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <PasswordField
          id="password"
          label="New password"
          value={newPassword}
          onChange={(v) => { setNewPassword(v); setPasswordError(''); setConfirmError(''); }}
          autoComplete="new-password"
          hint={PASSWORD_HINT}
          error={passwordError}
          autoFocus
        />
        <PasswordField
          id="confirm"
          label="Confirm new password"
          value={confirmPassword}
          onChange={(v) => { setConfirmPassword(v); setConfirmError(''); }}
          autoComplete="new-password"
          error={confirmError}
        />
        <Button type="submit" className="w-full h-12 font-medium bg-[#151d44] hover:bg-[#1f2a5c] text-white" disabled={loading}>
          {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />Saving</>) : 'Save new password'}
        </Button>
      </form>
    </AuthLayout>
  );
}
