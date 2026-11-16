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
    match: 'text-success-fg',
    over: 'text-danger-fg',
    under: 'text-warning-fg',
    neutral: 'text-muted-foreground',
  }[tone] || 'text-muted-foreground';

  return (
    <div className={`space-y-0.5 text-xs leading-snug ${toneClass} ${className}`}>
      {lines.map((line) => <p key={line}>{line}</p>)}
    </div>
  );
}