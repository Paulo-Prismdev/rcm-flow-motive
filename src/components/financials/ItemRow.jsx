import React from 'react';
import { ChevronRight, FileText } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { formatInvoiceDay, invoicePartyName, isInvoiceDocument } from '@/components/shared/invoiceChecklist';
import { invoiceStatusLabel, invoiceToneKey } from '@/components/claims/InvoiceItemCard';
import { MacRow } from './MacGroup';
import StatusBadge from './StatusBadge';

/** The invoice rules' own status colours, as the dots this design uses. */
export const toneFor = (toneKey) =>
  ({ positive: 'done', warning: 'waiting', negative: 'action' }[toneKey] || 'idle');

/** The grey line under a row's name: who it is with, and where it has got to. */
export function itemSubline(item, state, claim) {
  const party = invoicePartyName(claim, item);
  const when = state.paid && state.paidDate ? `Paid ${formatInvoiceDay(state.paidDate)}`
    : state.date ? `${item.direction === 'in' ? 'Received' : 'Sent'} ${formatInvoiceDay(state.date)}`
      : state.requested && state.requestedAt ? `Requested ${formatInvoiceDay(state.requestedAt)}`
        : '';
  const parts = [party, when].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : (isInvoiceDocument(item) ? 'Not received' : 'Not raised');
}

/** One document or invoice as one row: icon, name, the line under it, amount, status. */
export default function ItemRow({ item, state, claim, focus, onClick, amountText }) {
  const amount = amountText || (!state.awaiting && state.amount > 0 ? fmtGBP(state.amount) : '');

  return (
    <MacRow onClick={onClick}>
      <FileText className="h-4 w-4 flex-shrink-0 text-mac-muted" strokeWidth={1.5} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-foreground">{item.label}</span>
        <span className="block truncate text-[11px] text-mac-muted">{itemSubline(item, state, claim)}</span>
      </span>
      {amount && <span className="text-[13px] tabular-nums text-foreground">{amount}</span>}
      <StatusBadge tone={toneFor(invoiceToneKey(item, state, focus))}>{invoiceStatusLabel(item, state)}</StatusBadge>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-mac-muted" strokeWidth={1.5} />
    </MacRow>
  );
}