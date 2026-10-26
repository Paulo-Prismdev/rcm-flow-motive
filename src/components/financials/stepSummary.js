import { INVOICE_STATUS_META, isInvoiceDocument, isRecommendedItem } from '@/components/shared/invoiceChecklist';

/**
 * What the window shows of a step without opening it: how far it has got, the two
 * figures beside its name, and the state its own glyph draws. All of it read off the
 * step the flow already worked out — nothing is counted twice.
 */

const settled = (step, row) => {
  if (step.key === 'payments') return !!row.state.paid;
  if (step.key === 'closeout') return !!row.state.copyAttached && !row.state.awaitingCorrected;
  return !!row.state.copyAttached;
};

export function stepCounts(step) {
  if (step.key === 'figures') {
    const rows = step.check?.rows || [];
    const set = rows.filter((row) => row.value !== null && row.value !== '').length;
    return { done: set, total: rows.length, text: rows.length > 0 ? `${set}/${rows.length}` : '' };
  }

  const rows = (step.rows || []).filter((row) => !row.state.notApplicable
    && !(isRecommendedItem(row.item) && (step.key === 'closeout' || step.key === 'payments'))
    && !(step.key === 'payments' && isInvoiceDocument(row.item)));

  const done = rows.filter((row) => settled(step, row)).length;
  return { done, total: rows.length, text: rows.length > 0 ? `${done}/${rows.length}` : '' };
}

/** Not started, part way, done, or holding nothing at all on this job. */
export function stepGlyphState(step, currentKey) {
  if (step.empty) return 'na';
  if (step.done) return 'done';
  if (step.movedPast || step.key === currentKey) return 'partial';
  return stepCounts(step).done > 0 ? 'partial' : 'idle';
}

/** The toolbar carries one action, named for what it does rather than for the item. */
const SHORT = {
  upload: 'Upload the copy',
  request: 'Request from accounts',
  pay: 'Mark as paid',
  figures: 'Set the job figure',
  check_figures: 'Confirm figures',
};

export function toolbarNext(flow) {
  const steps = flow?.steps || [];
  const step = steps.find((s) => s.key === flow.current && s.action) || steps.find((s) => s.action);
  if (!step?.action) return null;
  return { action: step.action, label: `Next: ${SHORT[step.action.kind] || step.action.label}` };
}

const TONES = { positive: 'done', warning: 'waiting', negative: 'action', neutral: 'waiting', faded: 'idle' };

export const statusText = (status) => (INVOICE_STATUS_META[status] || { label: status }).label;

export const statusTone = (status) => TONES[(INVOICE_STATUS_META[status] || {}).tone] || 'idle';