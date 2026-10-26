import React from 'react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { formatInvoiceDay, invoicePartyName } from '@/components/shared/invoiceChecklist';
import { invoiceStatusLabel, invoiceToneKey } from '@/components/claims/InvoiceItemCard';
import { MacGroup, MacRow } from './MacGroup';
import StatusBadge from './StatusBadge';
import { toneFor } from './ItemRow';

const HEADERS = ['Invoice', 'Party', 'Direction', 'Amount', 'Status', 'Paid'];

/**
 * Step 5 as a clean table, under its own heading: every invoice, in and out, with
 * what it is, which way the money goes and where it stands. Any row opens the same
 * sheet, with Mark paid on it.
 */
export default function PaymentsPane({ step, claim, onOpenItem }) {
  const rows = step.rows || [];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-[17px] font-semibold text-foreground">Step 5 · Payments</h2>
        <p className="text-[11px] text-mac-muted">{step.hint}</p>
      </header>

      <MacGroup title="Invoices in and out">
        {step.empty ? (
          <MacRow className="flex-col items-start gap-0.5">
            <span className="text-[13px] text-foreground">{step.empty.title}</span>
            <span className="text-[11px] text-mac-muted">{step.empty.reasons.join(' · ')}</span>
          </MacRow>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-mac-line">
                {HEADERS.map((heading) => (
                  <th key={heading} className="px-3 py-2 text-left text-[11px] font-normal text-mac-muted">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, state }) => (
                <tr
                  key={item.key}
                  onClick={() => onOpenItem(item, state)}
                  className="h-11 cursor-pointer border-b border-mac-line transition-colors duration-150 last:border-b-0 hover:bg-mac-window"
                >
                  <td className="px-3 text-foreground">{item.label}</td>
                  <td className="px-3 text-mac-muted">{invoicePartyName(claim, item) || '—'}</td>
                  <td className="px-3 text-mac-muted">{item.direction === 'in' ? 'In' : 'Out'}</td>
                  <td className="px-3 text-right tabular-nums text-foreground">
                    {!state.awaiting && state.amount > 0 ? fmtGBP(state.amount) : '—'}
                  </td>
                  <td className="px-3">
                    <StatusBadge tone={toneFor(invoiceToneKey(item, state, 'pay'))}>
                      {invoiceStatusLabel(item, state)}
                    </StatusBadge>
                  </td>
                  <td className="px-3 tabular-nums text-mac-muted">
                    {state.paid ? (state.paidDate ? formatInvoiceDay(state.paidDate) : 'Yes') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </MacGroup>
    </div>
  );
}