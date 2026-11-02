import React from 'react';
import { KeyRound } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthNotice from '@/components/auth/AuthNotice';
import ChangePasswordForm from '@/components/auth/ChangePasswordForm';
import { useAuth } from '@/lib/AuthContext';
import { PASSWORD_MAX_AGE_DAYS } from '@/lib/passwordPolicy';

// Full-screen stop when the password is older than 90 days. The only ways on are a new
// password or signing out.
export default function PasswordExpired({ onChanged }) {
  const { logout } = useAuth();
  return (
    <AuthLayout
      icon={KeyRound}
      title="Choose a new password"
      subtitle={`Passwords are changed every ${PASSWORD_MAX_AGE_DAYS} days`}
      footer={
        <button type="button" onClick={() => logout()} className="inline-flex h-11 items-center font-medium text-white hover:underline md:h-auto">
          Sign out instead
        </button>
      }
    >
      <AuthNotice tone="warning">Your password has expired. Set a new one to carry on.</AuthNotice>
      <ChangePasswordForm onDone={onChanged} idPrefix="expired" />
    </AuthLayout>
  );
}
