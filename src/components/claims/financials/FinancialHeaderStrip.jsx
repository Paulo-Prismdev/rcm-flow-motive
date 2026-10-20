import React from 'react';
import { AlertTriangle, Ban, Check, Clock, Hourglass } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { INVOICE_STATUS_META } from '@/components/shared/invoiceChecklist';
import { TRACKER_TONES } from '../trackerTones';

const GLYPHS = {
  positive: <Check className="w-3 h-3" strokeWidth={3} />,
  warning: <AlertTriangle className="w-3 h-3" />,
  negative: <AlertTriangle className="w-3 h-3" />,
  neutral: <Clock className="w-3 h-3" />,
  faded: <Ban className="w-3 h-3" />,
};

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
 * The one place the claim's invoicing totals appear: overall status, the final
 * repair cost with its VAT split, what we are owed, what we owe, and progress.
 */
export default function FinancialHeaderStrip({ status, summary, finalCost, finalCostEx, finalCostVat }) {
  const meta = INVOICE_STATUS_META[status] || INVOICE_STATUS_META['Ready to Invoice'];
  const tone = TRACKER_TONES[meta.tone] || TRACKER_TONES.neutral;
  const pct = summary.total ? Math.round((summary.complete / summary.total) * 100) : 0;

  return (
    <div className="rounded-[10px] border border-border bg-card px-3 py-2.5 space-y-2">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className={`inline-flex items-center gap-1.5 rounded-lg border border-l-4 px-2.5 py-1.5 ${tone.card}`}>
          <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${tone.iconWrap}`}>
            {GLYPHS[meta.tone] || GLYPHS.neutral}
          </span>
          <span className="text-xs font-semibold text-foreground whitespace-nowrap">{meta.label}</span>
        </div>

        <Stat label="Final repair cost" value={finalCost > 0 ? fmtGBP(finalCost) : '—'} sub={finalCost > 0 ? `ex VAT ${fmtGBP(finalCostEx)} · VAT ${fmtGBP(finalCostVat)}` : 'inc VAT'} />
        <Stat label="Owed to us" value={fmtGBP(summary.owedToUs)} sub={`${summary.rows.filter((r) => r.item.direction === 'out' && !r.state.paid && !r.state.notApplicable).length} to collect`} />
        <Stat label="We owe" value={fmtGBP(summary.weOwe)} sub={`${summary.rows.filter((r) => r.item.direction === 'in' && !r.state.paid && !r.state.notApplicable).length} to pay`} />

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

      {summary.missing.length > 0 && (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
          <Hourglass className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          <span>Needs {summary.missing.map((m) => m.label).join(', ')} before every invoice can be raised.</span>
        </p>
      )}
    </div>
  );
}