import React from 'react';
import { AGE_BANDS, OVERDUE_DAYS, agedTotals } from '@/components/shared/invoicingQueue';
import { fmtGBP } from '@/components/shared/creditRepairRates';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

const Tile = ({ label, value, sub, negative }) => (
  <div className="bg-card border border-border rounded-[10px] p-3">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={`text-lg lg:text-xl font-bold tabular-nums mt-1 ${negative && value !== 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
      {fmtGBP(value)}
    </p>
    {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

/** What one tab is owed, and how old it is. Overdue is the 60+ day money. */
export default function AgedTotals({ rows }) {
  const totals = agedTotals(rows);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Tile
          label="Outstanding"
          value={totals.total}
          sub={`${plural(totals.count, 'invoice')} · ${plural(totals.parties, 'party')}`}
        />
        <Tile
          label={`Overdue · ${OVERDUE_DAYS}+ days`}
          value={totals.overdue}
          sub={totals.overdue > 0 ? 'Chase these first' : 'Nothing past the overdue point'}
          negative
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {AGE_BANDS.map((band) => (
          <Tile
            key={band.key}
            label={band.label}
            value={totals.bands[band.key] || 0}
            negative={band.min > OVERDUE_DAYS}
          />
        ))}
      </div>
    </div>
  );
}