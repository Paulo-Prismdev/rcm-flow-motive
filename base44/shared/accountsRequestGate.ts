/**
 * Whether an accounts request may go out on a claim — the one rule, asked of the
 * same evidence the Financials screen reads.
 *
 * The job's invoicing is only "already under way" once one of OUR OWN invoices has
 * been requested from accounts, sent, or paid. The close-out paperwork we upload and
 * the invoices we receive are never evidence of that: their dates are recorded when
 * a copy is filed, which says nothing about an invoice of ours having gone out.
 *
 * The keys below are the Out items on a claim — kept in step with INVOICE_ITEMS in
 * src/components/shared/invoiceItems.js, which is where the screen's own rule reads
 * them from (direction 'out', section 'out', never a document).
 */
export const OUR_INVOICE_OUT_KEYS = [
  'client_invoice_out',
  'referral_invoice_out',
  'storage_fee_invoice_out',
  'vat_excess_invoice_out',
  'cr_hire_fee',
  'cr_repair_commission',
];

/** True where an invoice of ours has already been requested, sent or paid. */
export function invoiceAlreadyUnderWay(claim: any): boolean {
  const items = claim?.invoice_tracker?.items || {};
  return OUR_INVOICE_OUT_KEYS.some((key) => {
    const entry = items[key] || {};
    return entry.requested === true || !!entry.date || entry.paid === true;
  });
}

/** Why the request is refused, or an empty string where it may go out. */
export function accountsRequestBlocked(claim: any): string {
  if (claim?.invoice_tracker?.figures_checked) return '';
  if (invoiceAlreadyUnderWay(claim)) return '';
  return 'Check the job figures first — every amount on this invoice is worked out from them';
}