import { isInvoiceDocument, isRecommendedItem } from '@/components/shared/invoiceChecklist';
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
    hint: 'Final Insurer Invoice and Final Authority, plus the Collection Note where there is one — and the repairer\'s VAT & excess invoice where we handle the client\'s VAT and excess. The repairer\'s invoices together account for the final repair cost.',
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

/**
 * Steps 1 and 2 in a total loss job's own terms: its close-out papers are the
 * salvage invoice and the confirmation, and the figure its invoicing is worked out
 * from is the storage charge read off that invoice, not a repair cost.
 */
const TOTAL_LOSS_CLOSE_OUT_HINT = "Salvage Agent Invoice and Total Loss Confirmation — the storage charge and the salvage agent's admin charges are read off the salvage invoice, and the confirmation stands where the Final Authority would.";
const TOTAL_LOSS_FIGURES_HINT = 'The storage charge read off the Salvage Agent Invoice — storage only, never the admin charges — is what the storage fee invoice we raise is worked out from.';

/**
 * A credit repair job's close-out paperwork in its own terms: the repairer's final
 * invoice goes to the credit repair company rather than to an insurer, and its total
 * is the final repair cost the commission is worked out from.
 */
const CREDIT_REPAIR_CLOSE_OUT_HINT = 'The repairer\'s Final Repair Invoice, addressed to the credit repair company, and the Final Authority — plus the Collection Note where there is one. The Final Repair Invoice\'s total is the final repair cost our commission is worked out from, and there are no VAT & excess invoices on a credit repair job.';

/** Rows of one section, and those of them that apply to this claim. */
const rowsFor = (summary, section) => summary.rows.filter((r) => r.item.section === section);
const applying = (rows) => rows.filter((r) => !r.state.notApplicable);

/**
 * The close-out documents this claim has to hold a copy of: everything in the
 * close-out step that applies to it and is required rather than merely recommended.
 */
const closeoutRequired = (summary) =>
  applying(rowsFor(summary, 'closeout')).filter((r) => !isRecommendedItem(r.item));

/**
 * Whether the close-out step is settled: a copy of every required close-out document
 * is on file — one waiting to be replaced by a corrected copy doesn't count — or the
 * job has been taken past the step with them still to attach. What the repair
 * commission waits for before it can be invoiced: its amount is worked out from the
 * final repair cost, which comes off the repairer's final invoice.
 */
export function closeoutSettled(summary, claim) {
  const settled = (r) => r.state.received && !r.state.awaitingCorrected;
  return closeoutRequired(summary).every(settled) || isStepMovedPast(claim, 'closeout');
}

/**
 * The copy itself, on file. The raise and collect steps finish on this and
 * nothing else: an invoice's own date is not a copy, and where the copy is not to
 * hand yet the job is taken past the step by hand instead.
 */
const attached = (row) => !!row.state.copyAttached;

const upload = (row, label) => ({ kind: 'upload', item: row.item, state: row.state, label });

/**
 * What a folded step is still waiting on, named after its own line — so a step
 * the job has not opened yet says which invoices are still to be raised or
 * received rather than only how many. Capped at three names so a step always
 * reads as a header.
 */
const waitingOn = (labels = []) => labels.length === 0 ? ''
  : ` — waiting on ${labels.slice(0, 3).join(', ')}${labels.length > 3 ? ` +${labels.length - 3} more` : ''}`;

export function buildFinancialFlow(summary, ctx, claim) {
  /* Step 1 — the close-out paperwork: a copy of each, on file. */
  const closeRows = rowsFor(summary, 'closeout');
  const closeApplies = applying(closeRows);
  // The Collection Note is recommended, never required: the step is done on the
  // other close-out items alone — the Final Insurer Invoice, the Final Authority
  // and,
  // where we handle the client's VAT and excess, the repairer's VAT & excess
  // invoice — the note is never the step's own next action, and while it is
  // missing it is offered as a suggestion instead.
  const closeRequired = closeoutRequired(summary);
  // A copy that is waiting to be replaced by a corrected one doesn't finish the
  // step: the item stays amber until the corrected copy is uploaded.
  const closeSettled = (r) => r.state.received && !r.state.awaitingCorrected;
  const closeIn = closeRequired.filter(closeSettled).length;
  const closeEmpty = closeApplies.length === 0 ? emptySectionMessage('closeout', ctx) : null;
  const closePending = closeRequired.find((r) => !closeSettled(r));
  const closeSuggested = closeApplies.find((r) => isRecommendedItem(r.item) && !r.state.received);

  const closeout = {
    ...STEP.closeout,
    hint: ctx.totalLoss ? TOTAL_LOSS_CLOSE_OUT_HINT
      : ctx.creditRepair ? CREDIT_REPAIR_CLOSE_OUT_HINT
        : STEP.closeout.hint,
    rows: closeRows,
    empty: closeEmpty,
    done: closeRequired.length === 0 || closeIn === closeRequired.length,
    pendingLabels: closeRequired.filter((r) => !closeSettled(r)).map((r) => r.item.label),
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
    hint: ctx.totalLoss ? TOTAL_LOSS_FIGURES_HINT : STEP.figures.hint,
    empty: null,
    done: missing.length === 0,
    workable: missing.length > 0,
    pendingLabels: missing.map((m) => m.label),
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
  // The close-out step's own invoice — the repairer's VAT & excess — is still one
  // of the invoices we pay, so it is paid here with the rest. The documents filed
  // beside it carry no money and are left to the close-out step alone.
  const payRows = summary.rows.filter((r) => r.item.section !== 'closeout' || !isInvoiceDocument(r.item));
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
    pendingLabels: payApplies.filter((r) => !r.state.paid).map((r) => r.item.label),
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
      // A step that still has something to attach can be moved past by hand, so the
      // job can carry on while the missing piece of paper is chased: the close-out
      // step as much as the two invoice steps.
      canContinue: ['closeout', 'raise', 'collect'].includes(s.key) && !s.done && labels.length > 0,
      line: movedPast
        ? `Pending — ${labels.length} invoice${labels.length === 1 ? '' : 's'} still to attach: ${labels.join(', ')}`
        : `${s.line}${waitingOn(labels)}`,
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