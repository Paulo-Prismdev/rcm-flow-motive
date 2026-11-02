import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

/**
 * A portal user's own claims, from the protected portal lookup (claims are
 * internal-only, so portals never read them directly). Repairers pass `view`
 * 'accepted' or 'pending'. Every portal list shares the 'portalClaims' key, so a
 * change anywhere refreshes them all.
 */
export function usePortalClaims({ view = 'accepted', enabled = true, refetchInterval } = {}) {
  return useQuery({
    queryKey: ['portalClaims', view],
    queryFn: async () => {
      const res = await base44.functions.invoke('getPortalClaims', { view });
      return res.data?.claims || [];
    },
    enabled,
    staleTime: 0,
    refetchInterval,
  });
}

/**
 * Opens the claim named in the address (`?claim=<id>`, as the portal search links to)
 * once the portal's claims have loaded, then tidies the address.
 */
export function useOpenClaimFromUrl(claims, openClaim) {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('claim');
    if (!id || !claims?.length) return;
    const found = claims.find((c) => c.id === id);
    if (found) openClaim(found);
    navigate(location.pathname, { replace: true });
  }, [location.search, claims]);
}
