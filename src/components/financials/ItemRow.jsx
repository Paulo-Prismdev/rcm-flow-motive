import React from 'react';
import { ChevronRight } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import {
  formatInvoiceDay, invoicePartyName, isInvoiceDocument, itemDateWord,
} from '@/components/shared/invoiceChecklist';
import { itemLight } from '@/components/shared/trafficLight';
import LightDot from '@/components/shared/LightDot';
import LightPill from '@/components/shared/LightPill';
import { MacRow } from './MacGroup';

/** The grey line under a row's name: who it is with, and where it has got to. */
export function itemSubline(item, state, claim) {
  const party = invoicePartyName(claim, item);
  const when = state.paid && state.paidDate ? `Paid ${formatInvoiceDay(state.paidDate)}`
    : state.date ? `${itemDateWord(item)} ${formatInvoiceDay(state.date)}`
      : state.requested && state.requestedAt ? `Requested ${formatInvoiceDay(state.requestedAt)}`
        : '';
  const parts = [party, when].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : (isInvoiceDocument(item) ? 'Not received' : 'Not raised');
}

/**
 * One document or invoice as one row: its traffic light beside its name, the line
 * under it, its amount, and the status word on the right.
 */
export default function ItemRow({ item, state, claim, onClick, amountText }) {
  const amount = amountText || (!state.awaiting && state.amount > 0 ? fmtGBP(state.amount) : '');
  const light = itemLight(item, state);

  return (
    <MacRow onClick={onClick}>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <LightDot lightKey={light.key} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{item.label}</span>
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-mac-muted">{itemSubline(item, state, claim)}</span>
      </span>
      {amount && <span className="text-[13px] tabular-nums text-foreground">{amount}</span>}
      <LightPill lightKey={light.key}>{light.label}</LightPill>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-mac-muted" strokeWidth={1.5} />
    </MacRow>
  );
}