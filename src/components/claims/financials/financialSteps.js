import { emptySectionMessage } from './invoiceSectionMeta';

/**
 * The Financials section as the five steps the work happens in, worked out from
 * the claim's own invoice rows — nothing here is stored. Each step reports
 * whether it is done, the one-line summary it collapses to, and the single next
 * thing to do inside it, so the "Next step" card and the step headers can never
 * disagree with the rows underneath them.
 */
export const FINANCIAL_STEPS = [
  {
    key: 'closeout',
    n: 1,
    title: 'Collect close-out documents',
    hint: 'Final Invoice, Final Authority and Collection Note. The final repair cost comes from the Final Invoice.',
  },
  {
    key: 'figures',
    n: 2,
    title: 'Check job figures',
    hint: 'The figures every invoice is worked out from. Anything still missing is flagged here.',
  },
  {
    key: 'raise',
    n: 3,
    title: 'Raise our invoices',
    hint: 'Request each Invoice Out from accounts, then upload the copy once it has been raised.',
  },
  {
    key: 'collect',
    n: 4,
    title: 'Collect invoices in',
    hint: 'Upload each Invoice In as it arrives.',
  },
  {
    key: 'payments',
    n: 5,
    title: 'Payments',
    hint: 'Mark each invoice paid in or out. The job is complete once everything applicable is paid.',
  },
];

const STEP = Object.fromEntries(FINANCIAL_STEPS.map((s) => [s.key, s]));

/** Rows of one section, and those of them that apply to this claim. */
const rowsFor = (summary, section) => summary.rows.filter((r) => r.item.section === section);
const applying = (rows) => rows.filter((r) => !r.state.notApplicable);

/** An invoice has gone out or come in once it carries a date, or has been paid. */
const handled = (row) => !!row.state.date || row.state.paid;

const upload = (row, label) => ({ kind: 'upload', item: row.item, state: row.state, label });

export function buildFinancialFlow(summary, ctx) {
  /* Step 1 — the close-out paperwork: a copy of each, on file. */
  const closeRows = rowsFor(summary, 'closeout');
  const closeApplies = applying(closeRows);
  const closeIn = closeApplies.filter((r) => r.state.received).length;
  const closeEmpty = closeApplies.length === 0 ? emptySectionMessage('closeout', ctx) : null;
  const closePending = closeApplies.find((r) => !r.state.received);

  const closeout = {
    ...STEP.closeout,
    rows: closeRows,
    empty: closeEmpty,
    done: closeApplies.length === 0 || closeIn === closeApplies.length,
    line: closeEmpty ? closeEmpty.title
      : closeIn === closeApplies.length ? `all ${closeApplies.length} received`
        : `${closeIn} of ${closeApplies.length} received`,
    action: closeEmpty || !closePending ? null : upload(closePending, `upload the ${closePending.item.label}`),
  };

  /* Step 2 — the figures the invoices are worked out from. */
  const { missing } = summary;
  const figures = {
    ...STEP.figures,
    empty: null,
    done: missing.length === 0,
    line: missing.length === 0 ? 'all set' : `${missing.length} still to set`,
    action: missing.length === 0
      ? null
      : { kind: 'figures', label: `set the ${missing[0].label.toLowerCase()}` },
  };

  /* Step 3 — our invoices, raised and their copies filed. */
  const outRows = rowsFor(summary, 'out');
  const outApplies = applying(outRows);
  const outDone = outApplies.filter(handled).length;
  const outEmpty = outApplies.length === 0 ? emptySectionMessage('out', ctx) : null;
  const outPending = outApplies.find((r) => !handled(r));

  const raise = {
    ...STEP.raise,
    rows: outRows,
    empty: outEmpty,
    done: outApplies.length === 0 || outDone === outApplies.length,
    line: outEmpty ? outEmpty.title
      : outDone === outApplies.length ? `${outApplies.length} raised`
        : `${outDone} of ${outApplies.length} raised`,
    action: !outPending ? null
      : outPending.state.requested ? upload(outPending, `upload the copy of the ${outPending.item.label}`)
        : outPending.state.awaiting ? null
          : { kind: 'request', item: outPending.item, state: outPending.state, label: `request the ${outPending.item.label} from accounts` },
  };

  /* Step 4 — invoices in, as they arrive. */
  const inRows = rowsFor(summary, 'in');
  const inApplies = applying(inRows);
  const inDone = inApplies.filter(handled).length;
  const inEmpty = inApplies.length === 0 ? emptySectionMessage('in', ctx) : null;
  const inPending = inApplies.find((r) => !handled(r));

  const collect = {
    ...STEP.collect,
    rows: inRows,
    empty: inEmpty,
    done: inApplies.length === 0 || inDone === inApplies.length,
    line: inEmpty ? inEmpty.title
      : inDone === inApplies.length ? `${inApplies.length} received`
        : `${inDone} of ${inApplies.length} received`,
    action: !inPending ? null : upload(inPending, `upload the ${inPending.item.label}`),
  };

  /* Step 5 — everything paid, in and out. */
  const payRows = summary.rows.filter((r) => r.item.section !== 'closeout');
  const payApplies = applying(payRows);
  const paidCount = payApplies.filter((r) => r.state.paid).length;
  const payEmpty = payApplies.length === 0
    ? {
      title: 'Nothing to pay or collect on this job',
      reasons: [...new Set([
        ...emptySectionMessage('in', ctx).reasons,
        ...emptySectionMessage('out', ctx).reasons,
      ])],
    }
    : null;
  const payPending = payApplies.find((r) => !!r.state.date && !r.state.paid);

  const payments = {
    ...STEP.payments,
    rows: payRows,
    empty: payEmpty,
    done: payApplies.length === 0 || paidCount === payApplies.length,
    line: payEmpty ? payEmpty.title
      : paidCount === payApplies.length ? 'everything paid'
        : `${paidCount} of ${payApplies.length} paid`,
    action: payPending
      ? { kind: 'pay', item: payPending.item, state: payPending.state, label: `mark the ${payPending.item.label} as paid` }
      : null,
  };

  const steps = [closeout, figures, raise, collect, payments];
  const current = steps.find((s) => !s.done) || null;
  // Where the current step holds nothing to do yet, the next step's action is
  // still the most useful thing to offer.
  const pending = steps.find((s) => !s.done && s.action) || null;

  return {
    steps,
    current: current?.key || null,
    allDone: !current,
    nextAction: pending ? { ...pending.action, n: pending.n, title: pending.title } : null,
  };
}