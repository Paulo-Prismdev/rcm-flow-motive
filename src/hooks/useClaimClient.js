import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Loads the Client record linked to a claim (by id, falling back to name for
 * older claims). Used to pick up client-level settings such as whether we
 * handle their VAT and excess.
 */
export default function useClaimClient(claim) {
  const clientId = claim?.client_id || '';
  const clientName = claim?.client_name || '';

  return useQuery({
    queryKey: ['claim-client', clientId || clientName],
    queryFn: async () => {
      if (clientId) {
        try {
          const fresh = await base44.entities.Client.get(clientId);
          if (fresh) return fresh;
        } catch {
          // fall through to the name lookup
        }
      }
      if (clientName) {
        const page = await base44.entities.Client.filter({ name: clientName }, { limit: 1 });
        return (page?.items || [])[0] || null;
      }
      return null;
    },
    enabled: !!(clientId || clientName),
    staleTime: 5 * 60 * 1000,
  });
}