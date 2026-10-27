/**
 * The one traffic light, read the same way everywhere a financial status is shown —
 * the Financials rows, the sidebar steps, the Overview, the Payments table and the
 * Invoicing page's lists — so a colour never means two things:
 *
 *   red   — the copy is not on file yet: "Not uploaded", or "Requested" where it has
 *           been asked for from accounts and nothing has come back
 *   amber — the copy is on file but the money has not moved: "Awaiting payment"
 *   green — done: "Paid", or "Received" for a close-out document, which carries no
 *           payment of its own and is a copy that comes in to us (the Final Authority,
 *           the Final Insurer Invoice, the Collection Note, an invoice we only keep a
 *           copy of)
 *   grey  — nothing to do: not applicable, or a recommended item left unprovided
 *
 * Nothing here decides what an item's state IS — that is the invoice rules' own
 * work. This reads that state into the one light the whole app draws it with.
 */
import { isInvoiceDocument, isRecommendedItem, itemDateWord } from './invoiceChecklist';

export const LIGHTS = {
  red: {
    dot: 'bg-[#FF3B30]',
    pill: 'bg-[#FF3B30] text-white',
    text: 'text-[#D70015] dark:text-[#FF6961]',
  },
  amber: {
    dot: 'bg-[#FF9F0A]',
    // Amber is light, so its pill carries dark text rather than white.
    pill: 'bg-[#FF9F0A] text-[#3C2600]',
    text: 'text-[#B25000] dark:text-[#FFB340]',
  },
  green: {
    dot: 'bg-[#34C759]',
    pill: 'bg-[#34C759] text-white',
    text: 'text-[#1F8B3D] dark:text-[#4CD964]',
  },
  grey: {
    dot: 'bg-[#C7C7CC] dark:bg-[#5A5A5E]',
    pill: 'bg-[#E5E5EA] text-[#3C3C43] dark:bg-[#3A3A3C] dark:text-[#EBEBF5]',
    text: 'text-[#8E8E93] dark:text-[#98989D]',
  },
};

const light = (key) => LIGHTS[key] || LIGHTS.grey;

export const lightDot = (key) => light(key).dot;
export const lightPill = (key) => light(key).pill;
export const lightText = (key) => light(key).text;

/** The words a count is tallied in, in the order the line reads them. */
const WORDS = ['Not uploaded', 'Requested', 'Awaiting payment', 'Paid', 'Received'];

/**
 * One document or invoice: the colour of its light, and the word its pill carries.
 * A document has no payment of its own, so its copy is the whole of it; an invoice
 * is not done until it is paid, however long its copy has been filed.
 */
export function itemLight(item, state) {
  const s = state || {};

  if (s.notApplicable) {
    return { key: 'grey', label: isRecommendedItem(item) ? 'Not available' : 'Not applicable' };
  }

  if (isInvoiceDocument(item)) {
    // A copy waiting to be replaced is not a copy settled: the corrected one is
    // still to come, so the item reads red until it lands.
    if (s.received && !s.awaitingCorrected) {
      return { key: 'green', label: itemDateWord(item) };
    }
    // Recommended, never required: nothing is late while one is missing.
    if (isRecommendedItem(item) && !s.awaitingCorrected) {
      return { key: 'grey', label: 'Recommended' };
    }
    return { key: 'red', label: 'Not uploaded' };
  }

  if (s.paid) return { key: 'green', label: 'Paid' };
  if (s.copyAttached) return { key: 'amber', label: 'Awaiting payment' };
  return { key: 'red', label: s.requested ? 'Requested' : 'Not uploaded' };
}

/**
 * One step: red while anything in it is still to be uploaded, green once the step is
 * complete, and amber where everything in it is on file but something is still to be
 * paid. The figures step has no documents of its own, so it reads red while a figure
 * is still to be set and amber once they are all there and the check is the only
 * thing left.
 */
export function stepLight(step) {
  if (!step || step.empty) return 'grey';
  if (step.done) return 'green';
  if (step.key === 'figures') return (step.pendingLabels || []).length > 0 ? 'red' : 'amber';

  const lights = (step.rows || [])
    .filter((row) => !row.state.notApplicable)
    .map((row) => itemLight(row.item, row.state));

  if (lights.some((l) => l.key === 'red')) return 'red';
  return 'amber';
}

/**
 * The whole job: its own light, and the count line the Overview opens on — every
 * applicable document and invoice tallied by the word on its pill, red first.
 */
export function lightSummary(rows = []) {
  const lights = rows
    .filter((row) => row && !row.state?.notApplicable)
    .map((row) => itemLight(row.item, row.state));

  const key = ['red', 'amber', 'green'].find((colour) => lights.some((l) => l.key === colour)) || 'grey';

  const entries = [];
  for (const word of WORDS) {
    const found = lights.filter((l) => l.label === word);
    if (found.length > 0) entries.push({ key: found[0].key, label: word, count: found.length });
  }

  return { key, entries };
}