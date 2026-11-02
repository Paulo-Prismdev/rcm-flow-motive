import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ChangePasswordForm from '@/components/auth/ChangePasswordForm';
import AuthNotice from '@/components/auth/AuthNotice';
import { useAuth } from '@/lib/AuthContext';

/** Sign-in and password, on the person's own profile. */
export default function AccountSecurityCard() {
  const { twofaStatus } = useAuth();
  const [changing, setChanging] = useState(false);
  const [done, setDone] = useState(false);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['password-status'],
    queryFn: async () => (await base44.functions.invoke('passwordManage', { action: 'status' }))?.data ?? null,
    staleTime: 60 * 1000,
  });

  return (
    <div className="app-card !p-3 md:!p-4 mt-3">
      <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm"><KeyRound className="w-4 h-4 text-primary" />Sign-in and password</h3>

      {twofaStatus?.required && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground mb-3">
          <ShieldCheck className="w-4 h-4 mt-px shrink-0 text-green-600" aria-hidden="true" />
          Each time you sign in we email you a 6-digit code. You're signed out after 30 minutes without activity.
        </p>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : !data?.applies ? (
        <>
          <p className="text-xs text-muted-foreground mb-3">
            The 90-day password rule starts the next time you sign in with your email and password. You can change your password now if you like.
          </p>
          {done && <AuthNotice tone="success">Your password has been changed.</AuthNotice>}
          {changing ? (
            <div className="max-w-md">
              <ChangePasswordForm idPrefix="profile" onDone={() => { setChanging(false); setDone(true); refetch(); }} />
              <Button type="button" variant="ghost" className="mt-2 w-full" onClick={() => setChanging(false)}>Cancel</Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => { setDone(false); setChanging(true); }}>Change password</Button>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-3">
            Passwords are changed every {data.max_age_days} days.{' '}
            {data.expires_at && <>Yours is due by {new Date(data.expires_at).toLocaleDateString('en-GB')}.</>}
          </p>
          {done && <AuthNotice tone="success">Your password has been changed.</AuthNotice>}
          {changing ? (
            <div className="max-w-md">
              <ChangePasswordForm idPrefix="profile" onDone={() => { setChanging(false); setDone(true); refetch(); }} />
              <Button type="button" variant="ghost" className="mt-2 w-full" onClick={() => setChanging(false)}>Cancel</Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => { setDone(false); setChanging(true); }}>Change password</Button>
          )}
        </>
      )}
    </div>
  );
}
