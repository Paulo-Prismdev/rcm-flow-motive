import React from 'react';
import { fmtGBP } from '@/components/shared/creditRepairRates';

function Stat({ label, value, sub }) {
  return (
    <div className="min-w-[92px]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-bold tabular-nums leading-tight text-foreground">{value}</p>
      {sub && <p className="text-[10px] tabular-nums text-muted-foreground leading-tight">{sub}</p>}
    </div>
  );
}

/**
 * The job's money, at the foot of Financials: the final repair cost with its VAT
 * split, what we are still owed, what we still owe, and how far the invoices have
 * got. The "to collect" and "to pay" counts are counted by the summary itself,
 * off exactly the rows its two totals are made of — only invoices not yet paid,
 * so a settled job reads 0, and close-out paperwork (never money) counts as
 * neither.
 */
export default function FinancialTotalsPanel({ summary, finalCost, finalCostEx, finalCostVat }) {
  const pct = summary.total ? Math.round((summary.complete / summary.total) * 100) : 0;

  return (
    <div className="rounded-[10px] border border-border bg-card px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Stat
          label="Final repair cost"
          value={finalCost > 0 ? fmtGBP(finalCost) : '—'}
          sub={finalCost > 0 ? `ex VAT ${fmtGBP(finalCostEx)} · VAT ${fmtGBP(finalCostVat)}` : 'inc VAT'}
        />
        <Stat label="Owed to us" value={fmtGBP(summary.owedToUs)} sub={`${summary.toCollect} to collect`} />
        <Stat label="We owe" value={fmtGBP(summary.weOwe)} sub={`${summary.toPay} to pay`} />

        <div className="flex-1 min-w-[140px]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Progress</p>
            <p className="text-[11px] font-semibold tabular-nums text-foreground">{summary.complete} of {summary.total} complete</p>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-border overflow-hidden">
            <div className={`h-full transition-all ${summary.allComplete ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}