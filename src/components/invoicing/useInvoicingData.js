import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { readQueueDays } from '@/components/shared/invoicingQueue';

/**
 * The claims and the day thresholds the Invoicing page works from: every live
 * (non-archived) claim, each carrying the state its own Financials reads, plus
 * the two thresholds held in Settings.
 */
export default function useInvoicingData() {
  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['invoicing-claims'],
    queryFn: () => base44.entities.Claim.list('-updated_date', 2000),
  });

  const { data: configs = [], isLoading: configLoading } = useQuery({
    queryKey: ['AppConfig'],
    queryFn: () => base44.entities.AppConfig.list(),
  });

  const thresholds = useMemo(() => readQueueDays(configs), [configs]);

  return { claims, thresholds, isLoading: claimsLoading || configLoading };
}