import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PasswordExpired from '@/components/auth/PasswordExpired';
import PasswordExpiryBanner from '@/components/auth/PasswordExpiryBanner';

/**
 * Holds the app at "choose a new password" once a password is over 90 days old, and
 * shows a reminder in the last week. Google sign-ins have no password here, so the
 * server reports that this doesn't apply to them. Fails open: a failed check never
 * locks anyone out.
 */
export default function PasswordGate({ children }) {
  const { data, refetch } = useQuery({
    queryKey: ['password-status'],
    queryFn: async () => {
      const res = await base44.functions.invoke('passwordManage', { action: 'status' });
      return res?.data ?? null;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  if (data?.applies && data.expired) {
    return <PasswordExpired onChanged={() => refetch()} />;
  }
  return (
    <>
      {data?.applies && data.warn && <PasswordExpiryBanner daysLeft={data.days_left} onChanged={() => refetch()} />}
      {children}
    </>
  );
}
