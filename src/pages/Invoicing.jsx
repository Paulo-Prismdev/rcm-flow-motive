import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import { createPageUrl } from '@/utils';
import useInvoicingData from '@/components/invoicing/useInvoicingData';
import QueueTiles from '@/components/invoicing/QueueTiles';
import AgedInvoices from '@/components/invoicing/AgedInvoices';
import HeadlineStrip from '@/components/invoicing/HeadlineStrip';
import {
  agedTotals,
  buildAgedInvoices,
  buildInvoicingQueues,
  isBeforeTracking,
} from '@/components/shared/invoicingQueue';

/**
 * Invoicing — everything outstanding across every claim in one place: the headline
 * figures, the day's actions as tiles, and the aged invoices we are owed and owe
 * below. Every line is read from the claim's own Financials, so it always matches
 * the claim it opens. Claims invoiced before the tracking start date set in
 * Settings are left out (unless pulled back in on the claim itself).
 */
export default function Invoicing() {
  const navigate = useNavigate();
  const { claims, thresholds, trackingStart, isLoading } = useInvoicingData();

  const tracked = useMemo(
    () => claims.filter((claim) => !isBeforeTracking(claim, trackingStart)),
    [claims, trackingStart],
  );
  const queues = useMemo(() => buildInvoicingQueues(tracked, thresholds), [tracked, thresholds]);
  const aged = useMemo(() => buildAgedInvoices(tracked), [tracked]);
  const owedToUs = useMemo(() => agedTotals(aged.owedToUs), [aged]);
  const weOwe = useMemo(() => agedTotals(aged.weOwe), [aged]);
  const actions = queues.reduce((sum, section) => sum + section.count, 0);

  const openClaim = (claimId) =>
    navigate(`${createPageUrl('Claims')}?id=${claimId}&section=financials`);

  return (
    <div className="p-3 lg:p-0 space-y-4">
      <PageHeader
        title="Invoicing"
        subtitle={isLoading ? 'Reading the invoices…' : `${actions} action${actions === 1 ? '' : 's'} waiting across every claim`}
      />

      {isLoading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Reading the invoices">
          <div className="h-[72px] rounded-xl bg-muted animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
          </div>
          <div className="h-64 rounded-xl bg-muted animate-pulse" />
        </div>
      ) : (
        <>
          <HeadlineStrip
            owedToUs={owedToUs.total}
            weOwe={weOwe.total}
            overdue={owedToUs.overdue}
            actions={actions}
          />

          <section className="space-y-2">
            <h2 className="text-[15px] font-semibold text-foreground">Today's actions</h2>
            <QueueTiles sections={queues} onOpen={openClaim} />
          </section>

          <section className="space-y-2">
            <h2 className="text-[15px] font-semibold text-foreground">Aged invoices</h2>
            <AgedInvoices owedToUs={aged.owedToUs} weOwe={aged.weOwe} onOpen={openClaim} />
          </section>
        </>
      )}
    </div>
  );
}