import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import useInvoicingData from '@/components/invoicing/useInvoicingData';
import QueueSection from '@/components/invoicing/QueueSection';
import AgedInvoices from '@/components/invoicing/AgedInvoices';
import { buildAgedInvoices, buildInvoicingQueues } from '@/components/shared/invoicingQueue';

/**
 * Invoicing — everything outstanding across every claim in one place: the day's
 * actions at the top, and the aged invoices we are owed and owe below. Every line
 * is read from the claim's own Financials, so it always matches the claim it opens.
 */
export default function Invoicing() {
  const navigate = useNavigate();
  const { claims, thresholds, isLoading } = useInvoicingData();

  const queues = useMemo(() => buildInvoicingQueues(claims, thresholds), [claims, thresholds]);
  const aged = useMemo(() => buildAgedInvoices(claims), [claims]);
  const needsAttention = queues.reduce((sum, section) => sum + section.count, 0);

  const openClaim = (claimId) =>
    navigate(`${createPageUrl('Claims')}?id=${claimId}&section=financials`);

  return (
    <div className="p-3 lg:p-6 space-y-5">
      <div>
        <h1 className="text-lg lg:text-2xl font-bold">Invoicing</h1>
        <p className="text-xs lg:text-sm text-muted-foreground mt-1">
          {isLoading
            ? 'Reading the claims...'
            : needsAttention === 0
              ? 'Nothing needs attention — every invoice is on its way.'
              : `${needsAttention} invoice${needsAttention === 1 ? '' : 's'} need attention across the claims.`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          Reading the invoices...
        </div>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's actions</h2>
            {queues.map((section) => (
              <QueueSection key={section.key} section={section} onOpen={openClaim} />
            ))}
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aged invoices</h2>
            <AgedInvoices owedToUs={aged.owedToUs} weOwe={aged.weOwe} onOpen={openClaim} />
          </section>
        </>
      )}
    </div>
  );
}