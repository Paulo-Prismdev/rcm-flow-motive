import React from 'react';
import { AGE_BANDS, agedTotals } from '@/components/shared/invoicingQueue';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { lightDot, lightText } from '@/components/shared/trafficLight';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// One bar, four bands, calm through to the same amber and red a status is read in as
// the money ages.
const BAND_BAR = {
  '0-30': 'bg-muted-foreground/25',
  '31-60': 'bg-[#FF9F0A]/40',
  '61-90': lightDot('amber'),
  '90+': lightDot('red'),
};

const BAND_TEXT = {
  '61-90': lightText('amber'),
  '90+': lightText('red'),
};

/**
 * What one tab is owed and how old it is: the total, then a single bar split into
 * the four age bands with each band's amount labelled underneath it. Every figure
 * appears once.
 */
export default function AgedSummary({ rows = [] }) {
  const totals = agedTotals(rows);

  return (
    <div className="bg-card border border-border rounded-[10px] px-3 py-2.5 space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Outstanding</p>
          <p className="text-lg lg:text-xl font-bold tabular-nums leading-tight">{fmtGBP(totals.total)}</p>
        </div>
        <p className="text-[11px] text-muted-foreground text-right shrink-0">
          {plural(totals.count, 'invoice')} · {plural(totals.parties, 'party')}
        </p>
      </div>

      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {totals.total > 0 && AGE_BANDS.map((band) => {
          const value = totals.bands[band.key] || 0;
          if (value <= 0) return null;
          return (
            <div
              key={band.key}
              className={BAND_BAR[band.key]}
              style={{ width: `${(value / totals.total) * 100}%` }}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1">
        {AGE_BANDS.map((band) => (
          <div key={band.key} className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">{band.label}</p>
            <p className={`text-xs font-semibold tabular-nums ${BAND_TEXT[band.key] || ''}`}>
              {fmtGBP(totals.bands[band.key] || 0)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}