import React from 'react';
import { ChevronRight } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { repairNet, repairVat, salvageStorageCharge } from '@/components/shared/invoiceChecklist';
import { MacGroup, MacRow, MacValueRow } from './MacGroup';
import StepGlyph from './StepGlyph';

/**
 * The whole job at a glance: what it comes to, what is owed either way, and every
 * step with its own state — so the window can be read in one look and any step
 * opened from here.
 */
export default function OverviewPane({ claim, ctx, summary, steps, onSelect, dormant }) {
  const finalCost = ctx.totalLoss ? (salvageStorageCharge(claim) ?? 0) : (Number(claim.final_repair_cost) || 0);
  const net = ctx.totalLoss ? 0 : repairNet(claim);
  const vat = ctx.totalLoss ? 0 : repairVat(claim);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-[17px] font-semibold text-foreground">Overview</h2>
        <p className="text-[11px] text-mac-muted">What the job comes to, and where its invoicing has got to.</p>
      </header>

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
            <StepGlyph state={step.glyph} className="text-mac-muted" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-foreground">{step.title}</span>
              <span className="mt-0.5 block truncate text-[11px] text-mac-muted">{step.line}</span>
            </span>
            {step.count && <span className="text-[11px] tabular-nums text-mac-muted">{step.count}</span>}
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-mac-muted" strokeWidth={1.5} />
          </MacRow>
        ))}
      </MacGroup>

      {dormant}
    </div>
  );
}