import React from 'react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { repairNet } from '@/components/shared/invoiceChecklist';
import { MacGroup, MacValueRow } from './MacGroup';
import { jobProfit } from './jobProfit';

const signed = (n) => (n < 0 ? `\u2212${fmtGBP(Math.abs(n))}` : fmtGBP(n));
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * What the job leaves RCM, ex VAT and inc VAT, with a breakdown by invoice. Shown on
 * the Overview and under Payments, from the same rows, so the two always agree.
 */
export default function JobProfitGroup({ claim, ctx, summary }) {
  const profit = jobProfit(summary);
  const [showBreakdown, setShowBreakdown] = React.useState(false);
  const net = ctx?.totalLoss ? 0 : repairNet(claim);
  const margin = !ctx?.totalLoss && net > 0 && profit.hasAny ? Math.round((profit.profit / net) * 1000) / 10 : null;

  return (
    <MacGroup
      title="Profit for RCM"
      footer={(
        <p className="px-1 text-xs text-mac-muted">
          What we invoice, less what we pay out, shown ex VAT and inc VAT. The ex VAT figure is the job's real profit — the VAT is collected and paid over, never ours to keep. Money that only passes through us — the client's VAT &amp; excess, or a repair the customer pays for privately — nets off.
        </p>
      )}
    >
      <MacValueRow
        label="Income" caption="Invoices we raise"
        value={`${fmtGBP(profit.income)} ex VAT`}
        sub={`${fmtGBP(profit.incomeGross)} inc VAT`}
      />
      <MacValueRow
        label="Costs" caption="Invoices and payments we make"
        value={`${signed(-profit.costs)} ex VAT`}
        sub={`${signed(-profit.costsGross)} inc VAT`}
      />
      {showBreakdown && profit.lines.map((line) => (
        <MacValueRow
          key={line.key}
          label={<span className="pl-3 font-normal text-mac-muted">{line.label}</span>}
          value={<span className="font-normal">{`${signed(line.value)} ex VAT`}</span>}
          sub={`${signed(line.gross)} inc VAT${line.paid ? ' · paid' : ''}`}
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
        label={<span className="text-[15px] font-semibold">Profit left in the job — ex VAT</span>}
        caption={profit.pending.length > 0 ? 'Provisional until every invoice can be worked out' : 'What RCM keeps'}
        value={(
          <span className={`text-[15px] font-bold ${profit.profit < 0 ? 'text-danger-fg' : 'text-success-fg'}`}>
            {profit.hasAny ? signed(profit.profit) : '—'}
          </span>
        )}
        sub={margin !== null ? `${margin}% of the repair ex VAT` : undefined}
      />
      <MacValueRow
        label={<span className="text-[15px] font-semibold">Profit left in the job — inc VAT</span>}
        caption={!profit.hasAny ? undefined : (() => {
          const netVat = round2(profit.profitGross - profit.profit);
          return netVat >= 0
            ? `Includes ${fmtGBP(netVat)} VAT to be paid over to HMRC`
            : `${fmtGBP(Math.abs(netVat))} less than ex VAT — VAT we can reclaim`;
        })()}
        value={(
          <span className={`text-[15px] font-bold ${profit.profitGross < 0 ? 'text-danger-fg' : 'text-foreground'}`}>
            {profit.hasAny ? signed(profit.profitGross) : '—'}
          </span>
        )}
        right={profit.lines.length > 0 && (
          <button type="button" onClick={() => setShowBreakdown((v) => !v)} className="mt-1 block w-full text-right text-xs text-info-fg hover:underline">
            {showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
          </button>
        )}
      />
    </MacGroup>
  );
}
