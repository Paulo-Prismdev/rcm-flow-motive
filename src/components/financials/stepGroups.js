import { isInvoiceDocument } from '@/components/shared/invoiceChecklist';

/**
 * The lists a step holds, each with the heading it is shown under — the app's own
 * word for what is in it, so a step reads as its parts rather than one run of rows.
 * Presentation only: the rows themselves are the step's own.
 */

const LIST_TITLE = {
  closeout: 'Documents to collect',
  raise: 'Our invoices',
  collect: 'Invoices we pay',
  payments: 'Invoices in and out',
};

/** The heading a step's single list carries — the one an empty step is shown under. */
export const stepListTitle = (step) => LIST_TITLE[step?.key] || step?.title || '';

export function stepRowGroups(step) {
  const rows = step?.rows || [];

  if (step?.key === 'closeout') {
    // The paperwork we keep a copy of, and the invoice that comes with it and is
    // ours to settle. Both lists are drawn only where the job has something in them.
    return [
      { title: LIST_TITLE.closeout, rows: rows.filter((row) => isInvoiceDocument(row.item)) },
      { title: LIST_TITLE.collect, rows: rows.filter((row) => !isInvoiceDocument(row.item)) },
    ].filter((group) => group.rows.length > 0);
  }

  return [{ title: stepListTitle(step), rows }];
}