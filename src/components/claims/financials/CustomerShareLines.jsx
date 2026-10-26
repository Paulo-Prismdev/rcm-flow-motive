import React from 'react';
import { customerShareNote, customerShareWorkings, fullCostWorkings } from './invoiceAuthorityCheck';

/**
 * The other half of the repair, under the check on the insurer's invoice: what the
 * customer pays the repairer themselves, the whole repair the two add up to set
 * against the authorised total, and — where we collect the VAT and excess — how the
 * VAT & Excess Invoice on file compares with the customer's share.
 */
export default function CustomerShareLines({ comparison, tone = 'neutral', className = '' }) {
  if (!comparison || comparison.customerShare === null) return null;

  const lines = [
    customerShareWorkings(comparison.expectation),
    fullCostWorkings(comparison),
    customerShareNote(comparison),
  ].filter(Boolean);
  if (lines.length === 0) return null;

  const toneClass = {
    match: 'text-green-700/90 dark:text-green-400/90',
    over: 'text-red-700/90 dark:text-red-400/90',
    under: 'text-amber-800/90 dark:text-amber-300/90',
    neutral: 'text-muted-foreground',
  }[tone] || 'text-muted-foreground';

  return (
    <div className={`space-y-0.5 text-[11px] leading-snug ${toneClass} ${className}`}>
      {lines.map((line) => <p key={line}>{line}</p>)}
    </div>
  );
}