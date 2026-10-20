import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { logActivity } from '@/components/shared/useActivityLogger';
import FileViewer from '@/components/shared/FileViewer';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import useClaimClient from '@/hooks/useClaimClient';
import {
  ACCOUNTS_EMAIL_CONFIG_KEY,
  DEFAULT_ACCOUNTS_EMAIL,
  buildInvoiceDetailsClearPatch,
  buildInvoiceItemPatch,
  buildInvoiceRequestPatch,
  buildInvoiceReviewPatch,
  buildTrackerMetaPatch,
  claimHandlesVatExcess,
  computeInvoiceSummary,
  deriveInvoiceStatus,
  formatInvoiceDay,
  invoiceContext,
  invoicePartyName,
  repairNet,
  repairVat,
  resolveInvoiceAmount,
} from '@/components/shared/invoiceChecklist';
import FinancialStatusLine from './FinancialStatusLine';
import FinancialTotalsPanel from './FinancialTotalsPanel';
import FinancialStep from './FinancialStep';
import NextStepPrompt from './NextStepPrompt';
import RecommendedNudge from './RecommendedNudge';
import AllDoneLine from './AllDoneLine';
import JobFiguresCard from './JobFiguresCard';
import InvoiceRow from './InvoiceRow';
import CloseOutItem from './CloseOutItem';
import InvoiceSectionEmpty from './InvoiceSectionEmpty';
import MarkPaidDialog from './MarkPaidDialog';
import RepairCostCheckNote from './RepairCostCheckNote';
import RemoveFileDialog from '@/components/shared/RemoveFileDialog';
import { removeFileFromUpdates } from '@/components/shared/removeFileFromUpdates';
import RequestInvoiceModal from './RequestInvoiceModal';
import InvoiceReviewModal from './InvoiceReviewModal';
import { buildFinancialFlow } from './financialSteps';
import { resolveInvoiceParty } from './invoiceParty';
import useClaimInvoiceDocs from './useClaimInvoiceDocs';
import { buildReviewLog } from './invoiceReview';
import { fmtGBP } from '@/components/shared/creditRepairRates';

/** Readable names for the financial fields in the claim's activity history. */
const FIELD_LABELS = {
  final_repair_cost: 'Final repair cost',
  client_vat_status: 'Customer VAT status',
  policy_excess: 'Policy excess',
  percent_to_referrer: 'Referrer fee %',
  referral_fee_repairer: 'Repairer referral fee %',
  referral_fee_repairer_gbp: 'Repairer referral fee (£)',
  hire_category: 'Hire category',
  external_invoice_ref: 'External invoice ref',
  invoice_notes: 'Invoice notes',
};

/**
 * The claim's Financials, as the five steps the work happens in: where the job
 * stands in one line at the top, then the steps in order — close-out documents,
 * job figures, our invoices, invoices in and payments — each one carrying the
 * thing to do next inside it, with the job's money at the foot. Internal only.
 */
export default function ClaimFinancials({ claim, currentUser, onUpdate, showInvoicing = true }) {
  const { toast } = useToast();
  const { data: client } = useClaimClient(claim);
  const docs = useClaimInvoiceDocs(claim, currentUser);

  const [request, setRequest] = useState(null);
  const [preparingRequest, setPreparingRequest] = useState(false);
  const [pendingFigureChange, setPendingFigureChange] = useState(null);
  const [review, setReview] = useState(null);
  const [quickItem, setQuickItem] = useState(null);
  const [paidPrompt, setPaidPrompt] = useState(null);
  const quickUploadRef = useRef(null);

  const { data: appConfigs = [] } = useQuery({
    queryKey: ['AppConfig'],
    queryFn: () => base44.entities.AppConfig.list(),
    staleTime: 5 * 60 * 1000,
  });
  const accountsEmail = appConfigs.find((c) => c.config_key === ACCOUNTS_EMAIL_CONFIG_KEY)?.config_value
    || DEFAULT_ACCOUNTS_EMAIL;

  const ctx = useMemo(
    () => invoiceContext(claim, claimHandlesVatExcess(claim, client)),
    [claim, client]
  );
  const hasFile = (itemKey) => docs.filesFor(itemKey).length > 0;
  const summary = useMemo(() => computeInvoiceSummary(claim, ctx, hasFile), [claim, ctx, docs.files]);
  const status = useMemo(() => deriveInvoiceStatus(claim, hasFile), [claim, docs.files]);
  const flow = useMemo(() => buildFinancialFlow(summary, ctx), [summary, ctx]);

  // What clearing a removed file's details would take with it, worked out for the
  // confirmation before anything is removed — together with the payment notice,
  // which only ever reports what is already recorded against the item.
  const pendingInvoiceRemoval = useMemo(() => {
    const pending = docs.pendingDelete;
    if (!pending?.fromThisFile) return null;
    const { clearPoints } = buildInvoiceDetailsClearPatch(pending.item, claim, { fileUrl: pending.fileUrl });
    const state = pending.state || {};
    const paidText = state.paid
      ? `This item is already marked as paid${state.paidDate ? ` on ${formatInvoiceDay(state.paidDate)}` : ''}${state.paidBy ? ` by ${state.paidBy}` : ''}. Clearing the details keeps the payment record — mark it unpaid separately if that payment is being undone.`
      : '';
    return { clearPoints, paidText };
  }, [docs.pendingDelete, claim]);

  // Only the step the job is on is open: when the work moves on, the step that
  // finished folds down to its one-line summary above it, and once nothing is
  // left every step is folded away behind the closing line. Any step can still be
  // opened by hand from its own header.
  const [openSteps, setOpenSteps] = useState(() => new Set(flow.current ? [flow.current] : []));
  const lastCurrent = useRef(flow.current);
  useEffect(() => {
    if (lastCurrent.current === flow.current) return;
    lastCurrent.current = flow.current;
    setOpenSteps(new Set(flow.current ? [flow.current] : []));
  }, [flow.current]);

  const openStep = (key) => setOpenSteps((prev) => new Set(prev).add(key));
  const toggleStep = (key) => setOpenSteps((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  // Every change is recorded in the claim's activity history with the field, the
  // old value and the new value, alongside who made it and when. Changes that
  // land inside a stored object (the invoicing tracker, the locked credit repair
  // rates) describe themselves in words instead.
  const logFigureChanges = (patch, description) => {
    const entries = Object.entries(patch).filter(([key, value]) =>
      !['id', 'created_date', 'updated_date', 'created_by_id'].includes(key)
      && (value === null || typeof value !== 'object')
    );

    if (entries.length === 0) {
      if (description) {
        logActivity({
          parentId: claim.id,
          parentType: 'Claim',
          action: 'Financials Updated',
          description,
          user: currentUser,
        });
      }
      return;
    }

    for (const [key, value] of entries) {
      const label = FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      logActivity({
        parentId: claim.id,
        parentType: 'Claim',
        action: 'Financials Updated',
        fieldName: label,
        oldValue: claim[key] ?? '',
        newValue: value ?? '',
        description: description || `${label} updated`,
        user: currentUser,
      });
    }
  };

  const applyCommit = (patch, description) => {
    // Financials records the change itself — field, old value, new value, who and
    // when — so the claim page is told not to log the same fields again.
    onUpdate({ ...claim, ...patch }, { skipFieldLog: true });
    logFigureChanges(patch, description);
  };

  // Invoices that have already gone out, been requested from accounts or been
  // paid, whose calculated amount this change would move.
  const invoicesAffectedByChange = (patch) => {
    const next = { ...claim, ...patch };
    const affected = [];

    for (const { item, state } of summary.rows) {
      if (state.notApplicable) continue;
      if (!state.paid && !state.date && !state.requested) continue;
      const before = resolveInvoiceAmount(item, claim);
      const after = resolveInvoiceAmount(item, next);
      if (!before || !after || before.awaiting || after.awaiting) continue;
      if (Math.abs((before.amount || 0) - (after.amount || 0)) < 0.01) continue;
      const word = state.paid ? 'paid' : state.date ? (item.direction === 'out' ? 'sent' : 'received') : 'requested from accounts';
      affected.push({ label: item.label, word, amount: state.amount || before.amount });
    }

    return affected;
  };

  const describeAffected = (affected) => {
    const parts = affected.map((a) => `${a.label} (already ${a.word} for ${fmtGBP(a.amount)})`);
    const joined = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
    return `This will change the calculated ${joined}. Continue?`;
  };

  const commit = (patch, description, options = {}) => {
    if (options.checkInvoiceImpact) {
      const affected = invoicesAffectedByChange(patch);
      if (affected.length > 0) {
        setPendingFigureChange({ patch, description, affected });
        return;
      }
    }
    applyCommit(patch, description);
  };

  const handleConfirmFigureChange = () => {
    const pending = pendingFigureChange;
    if (!pending) return;
    applyCommit(pending.patch, pending.description);
    setPendingFigureChange(null);
  };

  const handleItemChange = (item, changes, description) => {
    const { patch } = buildInvoiceItemPatch(item, claim, changes, ctx);

    // The claim's own invoicing flag follows the invoices themselves: the job is
    // invoiced once everything applicable is paid, and back to invoiced where a
    // payment is undone.
    if (changes.paid !== undefined) {
      const complete = computeInvoiceSummary({ ...claim, ...patch }, ctx, hasFile).allComplete;
      if (changes.paid && complete) patch.invoice_status = 'Invoice Paid';
      else if (!changes.paid && claim.invoice_status === 'Invoice Paid') patch.invoice_status = 'Invoiced';
    }

    commit(patch, description);
  };

  // Who is recording the payment, kept with it so the tracker and the history
  // both say who marked it paid.
  const paidBy = currentUser?.full_name || currentUser?.email || '';

  // Nothing is marked paid silently, wherever it is marked from: the date the
  // money landed is asked for first — defaulting to today — and only then saved.
  const askPaidDate = (item, state, mode = 'paid') => setPaidPrompt({ mode, item, state });

  const handlePaidConfirm = (date) => {
    const prompt = paidPrompt;
    if (!prompt) return;
    const { mode, item, state } = prompt;
    setPaidPrompt(null);

    if (mode === 'unpaid') {
      handleItemChange(
        item,
        { paid: false },
        `${item.label} marked as unpaid${state.paidDate ? ` — its paid date (${formatInvoiceDay(state.paidDate)}) cleared` : ''}`
      );
      return;
    }

    if (mode === 'correct') {
      handleItemChange(item, { paid_date: date }, `${item.label} paid date corrected to ${formatInvoiceDay(date)}`);
      return;
    }

    handleItemChange(
      item,
      { paid: true, paid_date: date, paid_by: paidBy },
      `${item.label} marked as paid on ${formatInvoiceDay(date)}`
    );
  };

  // Every upload is read off the document before anything is recorded: the
  // figures are checked against the job, and the date that lands is the one
  // printed on the document itself — never today's date, and never another
  // item's date.
  const handleUpload = async (item, fileList) => {
    const [file] = Array.from(fileList || []);
    if (!file) return;
    try {
      const uploaded = await docs.uploadFile(file);
      if (!uploaded) return;
      setReview({ item, fileUrl: uploaded.file_url, fileName: uploaded.file_name });
    } catch (e) {
      toast({ title: 'Upload failed', description: e?.message, variant: 'destructive' });
    }
  };

  // Nothing has touched the claim until this runs: the file is filed against the
  // invoice, its figures and number are recorded, the date marks it received or
  // sent — which locks the amount — and the history says what was read, changed
  // and accepted. The Final Invoice's total can become the final repair cost.
  const handleReviewConfirm = async ({ figures, corrections, accepted, useAsRepairCost }) => {
    if (!review) return;
    const { item } = review;
    const total = Number(figures.amount_total) || 0;
    const repairCost = useAsRepairCost && item.setsRepairCost ? total : null;

    try {
      await docs.attachFile(item, { file_url: review.fileUrl, file_name: review.fileName });
      applyCommit(
        {
          ...buildInvoiceReviewPatch(item, claim, figures, {
            file_url: review.fileUrl,
            file_name: review.fileName,
            repair_cost: repairCost,
          }),
          ...(repairCost ? { final_repair_cost: repairCost } : {}),
        },
        repairCost
          ? `${item.label} recorded — invoice ${figures.invoice_number}, dated ${figures.invoice_date}, ${fmtGBP(total)}; final repair cost set to ${fmtGBP(repairCost)} from the invoice`
          : `${item.label} recorded — invoice ${figures.invoice_number}, dated ${figures.invoice_date}, ${fmtGBP(total)}`
      );
      buildReviewLog({ item, figures, corrections, accepted }).forEach((entry) => {
        logActivity({ parentId: claim.id, parentType: 'Claim', user: currentUser, ...entry });
      });
      setReview(null);
    } catch (e) {
      toast({ title: 'Could not save the invoice', description: e?.message, variant: 'destructive' });
    }
  };

  // Removing a file asks which way it goes: the details read off it can go with
  // it, or stay while a replacement copy is found. Nothing is cleared unless that
  // was chosen, and neither a payment nor an accounts request is ever cleared by
  // either — undoing a payment stays its own decision.
  const handleRemoveFile = async (mode) => {
    const pending = docs.pendingDelete;
    if (!pending) return;
    docs.setPendingDelete(null);
    try {
      const clearing = mode === 'clear' && pending.fromThisFile
        ? buildInvoiceDetailsClearPatch(pending.item, claim, {
          fileUrl: pending.fileUrl,
          clearedBy: paidBy,
        })
        : null;

      await docs.removeFile(pending.docId);
      await removeFileFromUpdates(claim.id, pending.fileUrl);

      if (clearing) {
        applyCommit(
          clearing.patch,
          `${pending.item.label}: "${pending.fileName}" removed and the details read from it cleared (${clearing.clearPoints.join('; ')})`
        );
        return;
      }

      await logActivity({
        parentId: claim.id,
        parentType: 'Claim',
        action: 'Invoice Document Removed',
        description: pending.fromThisFile
          ? `${pending.item.label}: "${pending.fileName}" removed — the details read from it were kept, so a replacement copy is expected`
          : `Removed "${pending.fileName}" from "${pending.item.label}"`,
        user: currentUser,
      });
    } catch (e) {
      toast({ title: 'Remove failed', variant: 'destructive' });
    }
  };

  const handleUndoRequest = (item) => {
    commit(
      buildInvoiceRequestPatch(claim, item.key, { requested: false }),
      `${item.label} accounts request undone — back to outstanding`
    );
  };

  const openRequest = async (item, state) => {
    setPreparingRequest(true);
    try {
      const party = await resolveInvoiceParty(claim, item);
      setRequest({ item, state, party });
    } catch (e) {
      toast({ title: 'Could not load the invoice details', description: e?.message, variant: 'destructive' });
    } finally {
      setPreparingRequest(false);
    }
  };

  const handleRequested = (requestedAt) => {
    if (!request) return;
    // Recorded the same way the request is undone, so the history has the whole
    // of it: who asked accounts for the invoice, and when.
    commit(
      buildInvoiceRequestPatch(claim, request.item.key, {
        requested: true,
        requested_at: requestedAt,
        requested_by: currentUser?.email,
      }),
      `${request.item.label} requested from accounts`
    );
  };

  // The next-step prompt's button does the thing it names: the file picker for an
  // upload, the accounts request, the paid tick, or the figures the amount needs.
  const runAction = (action) => {
    if (!action) return;
    if (action.kind === 'upload') {
      setQuickItem(action.item);
      quickUploadRef.current?.click();
      return;
    }
    if (action.kind === 'request') {
      openRequest(action.item, action.state);
      return;
    }
    if (action.kind === 'pay') {
      askPaidDate(action.item, action.state, 'paid');
      return;
    }
    openStep('figures');
  };

  const renderRow = ({ item, state }, focus) => (
    <InvoiceRow
      key={item.key}
      item={item}
      state={state}
      focus={focus}
      files={docs.filesFor(item.key)}
      isUploading={docs.isUploading}
      claim={claim}
      onChange={(changes, description) => handleItemChange(item, changes, description)}
      onUpload={handleUpload}
      onDeleteFile={(doc) => docs.deleteFile(item, doc, state)}
      onRenameFile={docs.renameFile}
      onViewFile={docs.setViewingFile}
      onRequest={openRequest}
      onUndoRequest={() => handleUndoRequest(item)}
      onAskPaid={(mode) => askPaidDate(item, state, mode)}
    />
  );

  const renderCloseOut = ({ item, state }) => (
    <CloseOutItem
      key={item.key}
      item={item}
      state={state}
      files={docs.filesFor(item.key)}
      isUploading={docs.isUploading}
      onChange={(changes, description) => handleItemChange(item, changes, description)}
      onUpload={handleUpload}
      onDeleteFile={(doc) => docs.deleteFile(item, doc, state)}
      onRenameFile={docs.renameFile}
      onViewFile={docs.setViewingFile}
    />
  );

  const [closeout, figuresStep, raise, collect, payments] = flow.steps;

  // The step the job is on carries the next-step prompt inside it, and anything
  // merely recommended is nudged with the item it belongs to.
  const currentStep = flow.steps.find((s) => s.key === flow.current) || null;
  const suggestion = flow.suggestion;

  // A final repair cost read off an invoice copy that has since been removed is
  // flagged here: the figure itself is left exactly as it was.
  const repairCostCheck = claim.invoice_tracker?.repair_cost_check || null;

  const figuresCard = (
    <>
      <JobFiguresCard
        claim={claim}
        ctx={ctx}
        missing={summary.missing}
        onChange={(fields, description) => commit(fields, description, { checkInvoiceImpact: true })}
        onTrackerChange={(patch, description) => commit(patch, description, { checkInvoiceImpact: true })}
      />
      <RepairCostCheckNote
        check={repairCostCheck}
        onChecked={() => commit(
          buildTrackerMetaPatch(claim, { repair_cost_check: null }),
          `Final repair cost ${fmtGBP(repairCostCheck?.amount || 0)} checked after the invoice copy was removed`
        )}
      />
    </>
  );

  /** One of the steps: its header and line, then its own rows. */
  const step = (config, children, nudge) => (
    <FinancialStep
      n={config.n}
      title={config.title}
      hint={config.hint}
      line={config.line}
      status={config.done ? 'done' : config.key === flow.current ? 'current' : 'later'}
      open={openSteps.has(config.key)}
      onToggle={() => toggleStep(config.key)}
      banner={config.key === flow.current
        ? <NextStepPrompt action={config.action} onDo={runAction} />
        : null}
      nudge={nudge}
    >
      {children}
    </FinancialStep>
  );

  /**
   * A step's rows — or, where none apply, the checked reason it holds nothing.
   * `nudge`, where given, is the recommended item's prompt: it goes in the same
   * cell as the item it belongs to, right above its card.
   */
  const rowsBlock = (config, focus, columns, nudge) => (
    config.empty
      ? <InvoiceSectionEmpty title={config.empty.title} reasons={config.empty.reasons} />
      : (
        <div className={`grid grid-cols-1 items-stretch gap-2 ${columns}`}>
          {config.rows.map((row) => (
            <div key={row.item.key} className="flex flex-col gap-2 [&>*:last-child]:flex-1">
              {nudge && nudge.item.key === row.item.key && (
                <RecommendedNudge action={nudge} onDo={runAction} />
              )}
              {focus === 'closeout' ? renderCloseOut(row) : renderRow(row, focus)}
            </div>
          ))}
        </div>
      )
  );

  return (
    <TooltipProvider delayDuration={250}>
      <div className="space-y-3">
        <FinancialStatusLine
          status={status}
          currentStep={currentStep}
          stepCount={flow.steps.length}
          missing={summary.missing}
        />

        {!showInvoicing && figuresCard}

        {showInvoicing && (
          <>
            <div className="space-y-2.5">
              {step(
                closeout,
                rowsBlock(closeout, 'closeout', 'sm:grid-cols-3', suggestion),
                suggestion ? <RecommendedNudge action={suggestion} onDo={runAction} /> : null
              )}
              {step(figuresStep, figuresCard)}
              {step(raise, rowsBlock(raise, 'send', 'sm:grid-cols-2'))}
              {step(collect, rowsBlock(collect, 'send', 'sm:grid-cols-2'))}
              {step(payments, rowsBlock(payments, 'pay', 'sm:grid-cols-2'))}
            </div>

            {flow.allDone && <AllDoneLine />}

            {preparingRequest && (
              <p className="text-[11px] text-muted-foreground">Preparing the accounts request…</p>
            )}

            <input
              ref={quickUploadRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                // The chosen files are read before the field is cleared: clearing
                // it first empties the list the browser just handed over, and the
                // upload would be dropped without a word.
                const item = quickItem;
                if (e.target.files?.length && item) handleUpload(item, e.target.files);
                e.target.value = '';
              }}
            />
          </>
        )}

        <FinancialTotalsPanel
          summary={summary}
          finalCost={Number(claim.final_repair_cost) || 0}
          finalCostEx={repairNet(claim)}
          finalCostVat={repairVat(claim)}
        />

        {docs.viewingFile && (
          <FileViewer fileUrl={docs.viewingFile} onClose={() => docs.setViewingFile(null)} />
        )}

        <ConfirmDialog
          isOpen={!!docs.pendingDelete && !docs.pendingDelete.fromThisFile}
          onClose={() => docs.setPendingDelete(null)}
          onConfirm={() => handleRemoveFile('plain')}
          title="Delete document"
          message="Are you sure you want to delete this document?"
          confirmText="Delete"
          variant="danger"
        />

        {pendingInvoiceRemoval && (
          <RemoveFileDialog
            isOpen
            fileName={docs.pendingDelete.fileName}
            description={`This is the copy the ${docs.pendingDelete.label} details were read from.`}
            clearPoints={pendingInvoiceRemoval.clearPoints}
            keepHint="Details recorded, copy not attached"
            paidText={pendingInvoiceRemoval.paidText}
            onClose={() => docs.setPendingDelete(null)}
            onClear={() => handleRemoveFile('clear')}
            onKeep={() => handleRemoveFile('keep')}
          />
        )}

        <InvoiceReviewModal
          isOpen={!!review}
          onClose={() => setReview(null)}
          claim={claim}
          item={review?.item}
          party={review ? invoicePartyName(claim, review.item) : ''}
          fileUrl={review?.fileUrl}
          fileName={review?.fileName}
          onConfirm={handleReviewConfirm}
        />

        <ConfirmDialog
          isOpen={!!pendingFigureChange}
          onClose={() => setPendingFigureChange(null)}
          onConfirm={handleConfirmFigureChange}
          title="Change an invoiced figure?"
          message={pendingFigureChange ? describeAffected(pendingFigureChange.affected) : ''}
          confirmText="Continue"
        />

        {paidPrompt && (
          <MarkPaidDialog
            prompt={paidPrompt}
            byName={paidBy}
            onClose={() => setPaidPrompt(null)}
            onConfirm={handlePaidConfirm}
          />
        )}

        <RequestInvoiceModal
          isOpen={!!request}
          onClose={() => setRequest(null)}
          claim={claim}
          item={request?.item}
          state={request?.state}
          party={request?.party}
          accountsEmail={accountsEmail}
          currentUser={currentUser}
          onRequested={handleRequested}
        />
      </div>
    </TooltipProvider>
  );
}