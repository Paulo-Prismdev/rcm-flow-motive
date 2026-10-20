import { fmtGBP } from '@/components/shared/creditRepairRates';
import { isInvoiceDocument } from '@/components/shared/invoiceChecklist';

/**
 * The header line and the empty state for one invoicing panel, read off the
 * claim's own rows. Presentation only: every figure here already exists on the
 * invoice rows, and nothing new is stored.
 */

/** "1 invoice" / "3 invoices", or "1 of 3 done" for the close-out step. */
export function invoiceCountLabel(section, rows) {
  if (section === 'closeout') {
    if (rows.length === 0) return '0 items';
    const done = rows.filter((r) => r.state.received).length;
    return `${done} of ${rows.length} done`;
  }
  return `${rows.length} invoice${rows.length === 1 ? '' : 's'}`;
}

/** What the invoices in a panel add up to: "£1,738.97 to collect". */
export function invoiceSectionSummary(section, rows) {
  if (section === 'closeout') return null;

  const collect = section === 'out';
  const invoices = rows.filter((r) => !r.state.notApplicable && !isInvoiceDocument(r.item));
  const sum = (list) => list.reduce((total, r) => total + (r.state.amount || 0), 0);

  const outstanding = sum(invoices.filter((r) => !r.state.paid));
  if (outstanding > 0) return `${fmtGBP(outstanding)} ${collect ? 'to collect' : 'to pay'}`;

  if (invoices.some((r) => r.state.awaiting)) return 'awaiting figures';

  const total = sum(invoices);
  if (total > 0) return `${fmtGBP(total)} ${collect ? 'collected' : 'paid'}`;
  return collect ? 'nothing raised yet' : 'nothing received yet';
}

const capitalise = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

/**
 * Why a panel holds nothing, in the claim's own terms — so an empty section
 * reads as checked and complete rather than missing.
 */
export function emptySectionMessage(section, ctx) {
  if (section === 'closeout') {
    return {
      title: 'Nothing to close out on this job',
      reasons: [capitalise(ctx.creditRepair
        ? 'credit repair jobs finish on the partner invoices'
        : 'no close-out paperwork applies')],
    };
  }

  const collect = section === 'out';
  const reasons = [];

  if (collect) {
    const referralApplies = !ctx.creditRepair
      && (ctx.hasReferralFee || (!ctx.privatePaying && ctx.hasRepairer));
    if (!referralApplies) {
      reasons.push(ctx.privatePaying ? 'the customer is paying privately' : 'no repairer referral fee');
    }
  } else {
    if (!ctx.hasReferrer) reasons.push('no referrer');
    if (!ctx.secondReferrerEnabled) reasons.push('no second referrer');
  }

  if (!ctx.vatExcess) reasons.push("client isn't set up for VAT & excess");

  return {
    title: collect ? 'Nothing to collect on this job' : 'Nothing to pay on this job',
    reasons: [capitalise(reasons[0] || 'nothing applies to this job'), ...reasons.slice(1)],
  };
}