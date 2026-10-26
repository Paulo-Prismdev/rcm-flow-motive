import React from 'react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { lightText } from '@/components/shared/trafficLight';

const Figure = ({ label, value, tone = '' }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
    <p className={`text-base lg:text-xl font-bold tabular-nums leading-tight mt-0.5 ${tone}`}>{value}</p>
  </div>
);

/** The four figures the page opens on: what is owed each way, and what needs doing. */
export default function HeadlineStrip({ owedToUs = 0, weOwe = 0, overdue = 0, actions = 0 }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 bg-card border border-border rounded-[10px] px-3 py-2.5 sm:grid-cols-4">
      <Figure label="Owed to us" value={fmtGBP(owedToUs)} />
      <Figure label="We owe" value={fmtGBP(weOwe)} />
      <Figure
        label="Overdue (60+ days)"
        value={fmtGBP(overdue)}
        tone={overdue > 0 ? lightText('red') : ''}
      />
      <Figure
        label="Actions waiting"
        value={String(actions)}
        tone={actions > 0 ? lightText('amber') : ''}
      />
    </div>
  );
}