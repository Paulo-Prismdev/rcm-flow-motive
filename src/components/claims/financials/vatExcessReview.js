import { fmtGBP } from '@/components/shared/creditRepairRates';
import { repairNet } from '@/components/shared/invoiceChecklist';
import { VAT_RATE, round2, toNum } from './invoiceReview';

/**
 * The VAT & Excess invoice, read and checked on its own terms.
 *
 * It is not a normal VAT invoice: the excess carries no VAT at all, and the VAT on
 * it is the VAT content of the whole repair. So the 20%-of-the-amount-ex-VAT rule
 * does not apply here. Instead the excess is checked against the claim's policy
 * excess, the VAT against the VAT content of the final repair cost, and the two of
 * them against the invoice total.
 */

/** A close-out VAT & Excess invoice, in or out: both are worked out the same way. */
export const isVatExcessItem = (item) => item?.amountSource === 'vat_excess';

/** The figures mean something else on this invoice, so they are named for what they are. */
const VAT_EXCESS_LABELS = {
  amount_ex_vat: {
    label: 'Excess',
    prompt: "the customer's excess printed on the invoice, as a number with no currency symbols. No VAT is charged on an excess, so this is not an amount before VAT. Leave it empty where the invoice shows no excess",
  },
  vat_amount: {
    label: 'VAT (on the repair)',
    prompt: 'the VAT amount printed on the invoice, as a number with no currency symbols. On this invoice the VAT is the VAT content of the repair, not 20% of the excess, so read it exactly as it is printed. Leave it empty where no VAT is shown',
  },
  amount_total: {
    label: 'Total',
    prompt: 'the total the invoice asks for — the excess plus the VAT — as a number with no currency symbols',
  },
};

export const vatExcessFigures = (fields = []) => fields.map((f) =>
  VAT_EXCESS_LABELS[f.key] ? { ...f, ...VAT_EXCESS_LABELS[f.key] } : f);

const money = (n) => fmtGBP(round2(n));

const within = (a, b) => Math.abs(round2(a) - round2(b)) <= 0.05;

/**
 * The checks for a VAT & Excess invoice: the excess against the policy excess, the
 * VAT against the VAT content of the repair, and the total against the two of them.
 * Returns the problems to put right, and the workings to show beside them.
 */
export function vatExcessCheck(figures = {}, claim = {}) {
  const issues = [];
  const parts = [];
  const excess = toNum(figures.amount_ex_vat);
  const vat = toNum(figures.vat_amount) ?? 0;
  const total = toNum(figures.amount_total);
  const vatRegistered = claim?.client_vat_status === 'VAT Registered';
  const policyExcess = claim?.excess_tbc === true ? null : toNum(claim?.policy_excess);
  const net = round2(repairNet(claim) || 0);
  const expectedVat = net > 0 ? round2(net * VAT_RATE) : null;

  // The excess: its own figure, with no VAT on it, against the policy excess.
  if (excess !== null) {
    if (policyExcess === null) {
      parts.push(`Excess ${money(excess)}`);
    } else if (within(excess, policyExcess)) {
      parts.push(`Excess ${money(excess)} ✓`);
    } else {
      parts.push(`Excess ${money(excess)} ✗`);
      issues.push(policyExcess === 0
        ? `The excess of ${money(excess)} doesn't match the claim: its policy excess is nil (waived).`
        : `The excess of ${money(excess)} doesn't match the claim's policy excess of ${money(policyExcess)} — a difference of ${money(Math.abs(excess - policyExcess))}.`);
    }
  }

  // The VAT: the VAT content of the repair, never 20% of the excess. A client who
  // isn't VAT registered has no VAT to bill at all — only their excess.
  if (!vatRegistered) {
    if (vat > 0.05) {
      parts.push(`VAT ${money(vat)} ✗`);
      issues.push(claim?.client_vat_status && claim.client_vat_status !== 'Unknown'
        ? `This client isn't VAT registered, so only the excess is payable — the VAT line of ${money(vat)} shouldn't be on this invoice.`
        : `The claim doesn't record this client as VAT registered, so only the excess should be payable — check the VAT line of ${money(vat)}.`);
    } else {
      parts.push('No VAT — non-VAT client ✓');
    }
  } else if (expectedVat === null) {
    parts.push(vat > 0.05 ? `VAT ${money(vat)}` : 'No VAT ✓');
  } else if (within(vat, expectedVat)) {
    parts.push(`VAT on repair ${money(net)} × 20% = ${money(expectedVat)} ✓`);
  } else {
    parts.push(`VAT on repair ${money(net)} × 20% = ${money(expectedVat)} ✗`);
    issues.push(`The VAT of ${money(vat)} isn't the VAT content of the repair: ${money(net)} ex VAT × 20% = ${money(expectedVat)}.`);
  }

  // And the total is the two of them together.
  if (excess !== null && total !== null) {
    const sum = round2(excess + vat);
    if (within(sum, total)) {
      parts.push(`Total ${money(total)} ✓`);
    } else {
      parts.push(`Total ${money(total)} ✗`);
      issues.push(`The figures don't add up: excess ${money(excess)} + VAT ${money(vat)} = ${money(sum)}, but the invoice total reads ${money(total)}.`);
    }
  }

  return { issues, workings: parts.join(' · ') };
}