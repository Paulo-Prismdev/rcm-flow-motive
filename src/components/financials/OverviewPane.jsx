import React from 'react';
import { ChevronRight } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { repairNet, repairVat, salvageStorageCharge } from '@/components/shared/invoiceChecklist';
import LightDot from '@/components/shared/LightDot';
import { MacGroup, MacRow, MacValueRow } from './MacGroup';
import { jobProfit } from './jobProfit';

const signed = (n) => (n < 0 ? `−${fmtGBP(Math.abs(n))}` : fmtGBP(n));

/**
 * The whole job at a glance: its status counted out in one line, what it comes to,
 * what is owed either way, and every step with its own traffic light — so the window
 * can be read in one look and any step opened from here.
 */
export default function OverviewPane({ claim, ctx, summary, steps, light, onSelect, dormant }) {
  const finalCost = ctx.totalLoss ? (salvageStorageCharge(claim) ?? 0) : (Number(claim.final_repair_cost) || 0);
  const net = ctx.totalLoss ? 0 : repairNet(claim);
  const vat = ctx.totalLoss ? 0 : repairVat(claim);
  const profit = jobProfit(summary);
  const [showBreakdown, setShowBreakdown] = React.useState(false);
  const margin = !ctx.totalLoss && net > 0 && profit.hasAny ? Math.round((profit.profit / net) * 1000) / 10 : null;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-[17px] font-semibold text-foreground">Overview</h2>
        <p className="text-xs text-mac-muted">What the job comes to, and where its invoicing has got to.</p>
      </header>

      {light?.entries?.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-medium text-foreground">
          {light.entries.map((entry, index) => (
            <React.Fragment key={entry.label}>
              {index > 0 && <span className="text-mac-muted">·</span>}
              <span className="inline-flex items-center gap-1.5">
                <LightDot lightKey={entry.key} />
                {entry.count} {entry.label.toLowerCase()}
              </span>
            </React.Fragment>
          ))}
        </p>
      )}

      <MacGroup title="What the job comes to">
        <MacValueRow
          label={ctx.totalLoss ? 'Storage charge' : 'Final repair cost'}
          value={finalCost > 0 ? fmtGBP(finalCost) : '—'}
          caption={ctx.totalLoss
            ? 'Read off the Salvage Agent Invoice'
            : finalCost > 0 ? 'The whole repair, inc VAT' : 'Not set yet'}
          sub={finalCost > 0 && !ctx.totalLoss ? `ex VAT ${fmtGBP(net)} · VAT ${fmtGBP(vat)}` : undefined}
        />
        <MacValueRow label="Owed to us" value={fmtGBP(summary.owedToUs)} sub={`${summary.toCollect} to collect`} />
        <MacValueRow label="We owe" value={fmtGBP(summary.weOwe)} sub={`${summary.toPay} to pay`} />
        <MacValueRow
          label="Invoices complete"
          value={`${summary.complete} of ${summary.total}`}
          caption={summary.allComplete ? 'Everything applicable is attached and paid' : undefined}
        />
      </MacGroup>

      <MacGroup title="Invoicing steps">
        {steps.map((step) => (
          <MacRow key={step.key} onClick={() => onSelect(step.key)}>
            <LightDot lightKey={step.light} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-foreground">{step.title}</span>
              <span className="mt-0.5 block truncate text-xs text-mac-muted">{step.line}</span>
            </span>
            {step.count && <span className="text-xs tabular-nums text-mac-muted">{step.count}</span>}
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-mac-muted" strokeWidth={1.5} />
          </MacRow>
        ))}
      </MacGroup>

      <MacGroup
        title="Profit for RCM"
        footer={(
          <p className="px-1 text-xs text-mac-muted">
            Ex VAT: what we invoice, less what we pay out. Money that only passes through us — the client's VAT &amp; excess, or a repair the customer pays for privately — nets off.
          </p>
        )}
      >
        <MacValueRow label="Income" caption="Invoices we raise, ex VAT" value={fmtGBP(profit.income)} />
        <MacValueRow label="Costs" caption="Invoices and payments we make, ex VAT" value={profit.costs > 0 ? `−${fmtGBP(profit.costs)}` : fmtGBP(0)} />
        {showBreakdown && profit.lines.map((line) => (
          <MacValueRow
            key={line.key}
            label={<span className="pl-3 font-normal text-mac-muted">{line.label}</span>}
            value={<span className="font-normal">{signed(line.value)}</span>}
            sub={line.paid ? 'paid' : undefined}
          />
        ))}
        {profit.pending.length > 0 && (
          <MacValueRow
            label="Not counted yet"
            caption={`Still waiting on figures: ${profit.pending.join(', ')}`}
            value="—"
          />
        )}
        <MacValueRow
          label={<span className="text-[15px] font-semibold">Profit left in the job</span>}
          caption={profit.pending.length > 0 ? 'Provisional until every invoice can be worked out' : undefined}
          value={(
            <span className={`text-[15px] font-bold ${profit.profit < 0 ? 'text-danger-fg' : 'text-success-fg'}`}>
              {profit.hasAny ? signed(profit.profit) : '—'}
            </span>
          )}
          sub={margin !== null ? `${margin}% of the repair ex VAT` : undefined}
          right={profit.lines.length > 0 && (
            <button type="button" onClick={() => setShowBreakdown((v) => !v)} className="mt-1 block w-full text-right text-xs text-info-fg hover:underline">
              {showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
            </button>
          )}
        />
      </MacGroup>

      {dormant}
    </div>
  );
}