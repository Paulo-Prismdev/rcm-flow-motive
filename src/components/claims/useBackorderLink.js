import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/** The app's own address, outside the Base44 editor's preview wrapper. */
const appOrigin = () => (window.location.hostname.includes('base44.app')
  ? `https://${window.location.hostname.replace(/^preview-sandbox--/, '')}`
  : window.location.origin);

/**
 * The backordered-parts link for one claim. The server signs it for this claim only
 * and it runs out after 14 days, so it is fetched when the panel opens rather than
 * built from the claim ID on screen.
 */
export function useBackorderLink(claimId) {
  const query = useQuery({
    queryKey: ['backorderLink', claimId],
    queryFn: async () => {
      const res = await base44.functions.invoke('issueBackorderLink', { claim_id: claimId });
      return res.data;
    },
    enabled: !!claimId,
    // A fresh link each day is plenty: each one lasts 14 days.
    staleTime: 12 * 60 * 60 * 1000,
  });
  const token = query.data?.token;
  return {
    url: token ? `${appOrigin()}/backorder-form?token=${encodeURIComponent(token)}` : '',
    expiresAt: query.data?.expires_at || null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
