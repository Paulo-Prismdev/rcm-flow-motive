import {
  claimCopyOnFile,
  claimInvoiceContext,
  computeInvoiceSummary,
  isInvoiceDocument,
  isRecommendedItem,
} from './invoiceChecklist';
import { fmtGBP } from './creditRepairRates';

/**
 * What a claim still has outstanding, in the wording a warning lists it in: its
 * unpaid invoices with their amounts, and the copies still missing behind the
 * invoices that have gone out, come in or been paid. Read from the same summary
 * the claim's own Financials works from, so a warning can never disagree with the
 * tracker it is warning about.
 */
export function claimOutstandingItems(claim) {
  if (!claim) return [];

  const ctx = claimInvoiceContext(claim);
  const summary = computeInvoiceSummary(claim, ctx, claimCopyOnFile(claim));
  const lines = [];

  for (const { item, state } of summary.rows) {
    if (state.notApplicable || isRecommendedItem(item)) continue;

    // Close-out paperwork is only worth mentioning once it has actually happened
    // and its copy is still missing behind it.
    if (isInvoiceDocument(item)) {
      if (state.dateRecordedNoCopy) {
        lines.push({ key: item.key, text: `${item.label}, copy not on file` });
      }
      continue;
    }

    if (!state.paid && state.amount > 0) {
      lines.push({ key: item.key, text: `${item.label} ${fmtGBP(state.amount)} unpaid` });
    } else if (state.paid && !state.copyAttached) {
      lines.push({
        key: item.key,
        text: `${item.label}${state.amount > 0 ? ` ${fmtGBP(state.amount)}` : ''} paid, copy not on file`,
      });
    } else if (state.date && !state.copyAttached) {
      lines.push({
        key: item.key,
        text: `${item.label} ${item.direction === 'in' ? 'received' : 'sent'}, copy not on file`,
      });
    }
  }

  return lines;
}