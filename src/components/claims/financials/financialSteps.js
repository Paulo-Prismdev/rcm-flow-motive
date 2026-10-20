import { isRecommendedItem } from '@/components/shared/invoiceChecklist';
import { emptySectionMessage } from './invoiceSectionMeta';
import { isStepMovedPast } from './financialStepSkip';

/**
 * The Financials section as the five steps the work happens in, worked out from
 * the claim's own invoice rows: the only thing read from the claim besides is
 * which steps the job has been taken past with invoices still to attach. Each
 * step reports whether it is done, the one-line summary it collapses to, and the
 * single next thing to do inside it, so the prompt at the top of the step and the
 * step headers can never disagree with the rows underneath them.
 */
export const FINANCIAL_STEPS = [
  {
    key: 'closeout',
    n: 1,
    title: 'Collect close-out documents',
    hint: 'Final Invoice and Final Authority, plus the Collection Note where there is one. The final repair cost comes from the Final Invoice.',
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

/**
 * The copy itself, on file. The raise and collect steps finish on this and
 * nothing else: an invoice's own date is not a copy, and where the copy is not to
 * hand yet the job is taken past the step by hand instead.
 */
const attached = (row) => !!row.state.copyAttached;

const upload = (row, label) => ({ kind: 'upload', item: row.item, state: row.state, label });

export function buildFinancialFlow(summary, ctx, claim) {
  /* Step 1 — the close-out paperwork: a copy of each, on file. */
  const closeRows = rowsFor(summary, 'closeout');
  const closeApplies = applying(closeRows);
  // The Collection Note is recommended, never required: the step is done on the
  // Final Invoice and Final Authority alone, the note is never the step's own
  // next action, and while it is missing it is offered as a suggestion instead.
  const closeRequired = closeApplies.filter((r) => !isRecommendedItem(r.item));
  // A copy that is waiting to be replaced by a corrected one doesn't finish the
  // step: the item stays amber until the corrected copy is uploaded.
  const closeSettled = (r) => r.state.received && !r.state.awaitingCorrected;
  const closeIn = closeRequired.filter(closeSettled).length;
  const closeEmpty = closeApplies.length === 0 ? emptySectionMessage('closeout', ctx) : null;
  const closePending = closeRequired.find((r) => !closeSettled(r));
  const closeSuggested = closeApplies.find((r) => isRecommendedItem(r.item) && !r.state.received);

  const closeout = {
    ...STEP.closeout,
    rows: closeRows,
    empty: closeEmpty,
    done: closeRequired.length === 0 || closeIn === closeRequired.length,
    // Whether anything in the step can be done yet: a step still to come is
    // dimmed only while it holds nothing doable at all.
    workable: !!closePending || !!closeSuggested,
    line: closeEmpty ? closeEmpty.title
      : closeRequired.length === 0 ? 'nothing required'
        : closeIn === closeRequired.length ? `all ${closeRequired.length} received`
          : `${closeIn} of ${closeRequired.length} received`,
    action: closeEmpty || !closePending ? null
      : upload(closePending, closePending.state.awaitingCorrected
        ? `upload the corrected ${closePending.item.label}`
        : `upload the ${closePending.item.label}`),
    suggestion: closeSuggested ? upload(closeSuggested, `upload the ${closeSuggested.item.label}`) : null,
  };

  /* Step 2 — the figures the invoices are worked out from. */
  const { missing } = summary;
  const figures = {
    ...STEP.figures,
    empty: null,
    done: missing.length === 0,
    workable: missing.length > 0,
    line: missing.length === 0 ? 'all set' : `${missing.length} still to set`,
    action: missing.length === 0
      ? null
      : { kind: 'figures', key: missing[0].key, label: `set the ${missing[0].label.toLowerCase()}` },
  };

  /* Step 3 — our invoices, raised and their copies filed. */
  const outRows = rowsFor(summary, 'out');
  const outApplies = applying(outRows);
  const outPendingRows = outApplies.filter((r) => !attached(r));
  const outDone = outApplies.length - outPendingRows.length;
  const outEmpty = outApplies.length === 0 ? emptySectionMessage('out', ctx) : null;
  const outPending = outPendingRows[0];

  const raise = {
    ...STEP.raise,
    rows: outRows,
    empty: outEmpty,
    done: outApplies.length === 0 || outPendingRows.length === 0,
    // Nothing can be raised while every invoice still waiting is waiting on its
    // figures, which is the figures step's work rather than this one's.
    workable: outPendingRows.some((r) => !r.state.awaiting),
    pendingLabels: outPendingRows.map((r) => r.item.label),
    line: outEmpty ? outEmpty.title
      : outPendingRows.length === 0 ? `${outApplies.length} raised`
        : `${outDone} of ${outApplies.length} raised`,
    action: !outPending ? null
      : outPending.state.requested ? upload(outPending, `upload the copy of the ${outPending.item.label}`)
        : outPending.state.awaiting ? null
          : { kind: 'request', item: outPending.item, state: outPending.state, label: `request the ${outPending.item.label} from accounts` },
  };

  /* Step 4 — invoices in, as they arrive. */
  const inRows = rowsFor(summary, 'in');
  const inApplies = applying(inRows);
  const inPendingRows = inApplies.filter((r) => !attached(r));
  const inDone = inApplies.length - inPendingRows.length;
  const inEmpty = inApplies.length === 0 ? emptySectionMessage('in', ctx) : null;
  const inPending = inPendingRows[0];

  const collect = {
    ...STEP.collect,
    rows: inRows,
    empty: inEmpty,
    done: inApplies.length === 0 || inPendingRows.length === 0,
    workable: inPendingRows.length > 0,
    pendingLabels: inPendingRows.map((r) => r.item.label),
    line: inEmpty ? inEmpty.title
      : inPendingRows.length === 0 ? `${inApplies.length} received`
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
  // A payment can be recorded on an invoice that has gone out or come in, or one
  // that has only been asked for from accounts so far, even where its copy is not
  // attached yet — a payment is never held up by a missing piece of paper.
  const payPending = payApplies.find((r) => !r.state.paid && (!!r.state.date || r.state.requested));

  const payments = {
    ...STEP.payments,
    rows: payRows,
    empty: payEmpty,
    done: payApplies.length === 0 || paidCount === payApplies.length,
    // A payment can be recorded as soon as an invoice has gone out or come in, or
    // has at least been asked for from accounts — so the step is live from the
    // moment there is anything to pay, wherever the job has got to.
    workable: !!payPending,
    line: payEmpty ? payEmpty.title
      : paidCount === payApplies.length ? 'everything paid'
        : `${paidCount} of ${payApplies.length} paid`,
    action: payPending
      ? { kind: 'pay', item: payPending.item, state: payPending.state, label: `mark the ${payPending.item.label} as paid` }
      : null,
  };

  const steps = [closeout, figures, raise, collect, payments].map((s) => {
    const labels = s.pendingLabels || [];
    // A step the job has been taken past stays amber and says what it is still
    // waiting on, rather than folding away as if it were finished.
    const movedPast = !s.done && isStepMovedPast(claim, s.key);
    return {
      ...s,
      movedPast,
      // Only the two invoice steps can be moved past, and only while they still
      // have something to attach.
      canContinue: (s.key === 'raise' || s.key === 'collect') && !s.done && labels.length > 0,
      line: movedPast
        ? `Pending — ${labels.length} invoice${labels.length === 1 ? '' : 's'} still to attach: ${labels.join(', ')}`
        : s.line,
    };
  });

  // The step the job is on is the first one that is neither finished nor held
  // over; anything held over is carried as a reminder instead.
  const current = steps.find((s) => !s.done && !s.movedPast) || null;
  // Anything merely recommended is offered with its own item inside its step,
  // never as the work itself, so it is handed over separately from the steps'
  // own next actions.
  const recommended = steps.find((s) => s.suggestion)?.suggestion || null;

  return {
    steps,
    current: current?.key || null,
    // The job's invoicing is finished once every step is — the raise and collect
    // steps included, which only finish on the copies themselves.
    allDone: steps.every((s) => s.done),
    suggestion: recommended,
    // What the steps held over are still waiting on, and what is still to be paid:
    // the reminder line and the status line's "what's missing".
    stillWaitingOn: [...new Set(steps.filter((s) => s.movedPast).flatMap((s) => s.pendingLabels || []))],
    toPay: payApplies.filter((r) => !r.state.paid).map((r) => r.item.label),
  };
}