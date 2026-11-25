import { isInvoiceDocument, isRecommendedItem } from '@/components/shared/invoiceChecklist';

/**
 * What the job leaves RCM, worked out from the job's own invoice rows — the same
 * figures every invoice card shows — so it can never disagree with them.
 *
 * Everything is ex VAT: VAT is collected and paid over, never ours to keep. Each
 * invoice we raise counts in at its ex VAT figure (less anything taken off it after
 * VAT, such as the excess contribution we cover on the referral invoice), and each
 * invoice or payment we make counts out at its ex VAT figure. Money that only passes
 * through us — the client's VAT & excess billed on and paid over, or a privately
 * paid repair recovered from the customer — appears on both sides and nets off.
 *
 * Close-out paperwork carries no money and is left out, as are invoices that don't
 * apply. An invoice still waiting on its figures can't be counted yet: it is listed,
 * so the total is read as provisional until it is.
 */
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// The client's VAT & excess is billed on exactly as the repairer billed it to us, so
// both invoices count at their full amount, VAT and all. Split ex VAT they don't
// match (the repairer's shows the repair VAT, ours to the client often shows none),
// which would turn money passing straight through into a false profit or loss.
const PASS_THROUGH = new Set(['vat_excess_invoice_in', 'vat_excess_invoice_out']);

export function jobProfit(summary) {
  const lines = [];
  const pending = [];
  let income = 0;
  let costs = 0;
  // The same with VAT on: each invoice at the total it is raised or paid at.
  let incomeGross = 0;
  let costsGross = 0;

  for (const { item, state } of summary?.rows || []) {
    if (state.notApplicable || isInvoiceDocument(item) || isRecommendedItem(item)) continue;
    if (state.awaiting) { pending.push(item.label); continue; }
    const gross = round2(Number(state.amount) || 0);
    const ex = PASS_THROUGH.has(item.key)
      ? gross
      : round2((Number(state.ex) || 0) - (Number(state.deduction) || 0));
    if (item.direction === 'out') {
      income += ex;
      incomeGross += gross;
      lines.push({ key: item.key, label: item.label, value: ex, gross, paid: !!state.paid });
    } else {
      costs += ex;
      costsGross += gross;
      lines.push({ key: item.key, label: item.label, value: -ex, gross: -gross, paid: !!state.paid });
    }
  }

  income = round2(income);
  costs = round2(costs);
  incomeGross = round2(incomeGross);
  costsGross = round2(costsGross);
  return {
    income, costs, profit: round2(income - costs),
    incomeGross, costsGross, profitGross: round2(incomeGross - costsGross),
    lines, pending, hasAny: lines.length > 0,
  };
}
