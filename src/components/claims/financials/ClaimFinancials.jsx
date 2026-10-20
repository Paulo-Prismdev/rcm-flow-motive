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
  buildInvoiceItemPatch,
  buildInvoiceRequestPatch,
  buildInvoiceReviewPatch,
  claimHandlesVatExcess,
  computeInvoiceSummary,
  deriveInvoiceStatus,
  invoiceContext,
  invoicePartyName,
  repairNet,
  repairVat,
  resolveInvoiceAmount,
} from '@/components/shared/invoiceChecklist';
import FinancialHeaderStrip from './FinancialHeaderStrip';
import NextStepCard from './NextStepCard';
import StepIndicator from './StepIndicator';
import FinancialStep from './FinancialStep';
import JobFiguresCard from './JobFiguresCard';
import InvoiceRow from './InvoiceRow';
import CloseOutItem from './CloseOutItem';
import InvoiceSectionEmpty from './InvoiceSectionEmpty';
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
 * The claim's Financials, as the five steps the work happens in: the totals and
 * the overall status always at the top, the one thing to do next, then the steps
 * themselves — close-out documents, job figures, our invoices, invoices in and
 * payments. Internal only.
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

  // The step the job is on is open; a step opened by hand stays open, and when
  // the work moves on the next step opens by itself.
  const [openSteps, setOpenSteps] = useState(() => new Set(flow.current ? [flow.current] : []));
  const lastCurrent = useRef(flow.current);
  useEffect(() => {
    if (lastCurrent.current === flow.current) return;
    lastCurrent.current = flow.current;
    if (flow.current) setOpenSteps((prev) => new Set(prev).add(flow.current));
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
          ...buildInvoiceReviewPatch(item, claim, figures),
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

  const handleConfirmDelete = async () => {
    const pending = docs.pendingDelete;
    try {
      await pending?.action();
      await logActivity({
        parentId: claim.id,
        parentType: 'Claim',
        action: 'Invoice Document Removed',
        description: `Removed "${pending?.fileName}" from "${pending?.label}"`,
        user: currentUser,
      });
      docs.setPendingDelete(null);
    } catch (e) {
      toast({ title: 'Remove failed', variant: 'destructive' });
      docs.setPendingDelete(null);
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

  // The "Next step" card's button does the thing it names: the file picker for an
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
      handleItemChange(action.item, { paid: true }, `${action.item.label} marked as paid`);
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
      onDeleteFile={(doc) => docs.deleteFile(item, doc)}
      onRenameFile={docs.renameFile}
      onViewFile={docs.setViewingFile}
      onRequest={openRequest}
      onUndoRequest={() => handleUndoRequest(item)}
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
      onDeleteFile={(doc) => docs.deleteFile(item, doc)}
      onRenameFile={docs.renameFile}
      onViewFile={docs.setViewingFile}
    />
  );

  const [closeout, figuresStep, raise, collect, payments] = flow.steps;

  const figuresCard = (
    <JobFiguresCard
      claim={claim}
      ctx={ctx}
      missing={summary.missing}
      onChange={(fields, description) => commit(fields, description, { checkInvoiceImpact: true })}
      onTrackerChange={(patch, description) => commit(patch, description, { checkInvoiceImpact: true })}
    />
  );

  /** One of the steps: its header and line, then its own rows. */
  const step = (config, children) => (
    <FinancialStep
      n={config.n}
      title={config.title}
      hint={config.hint}
      line={config.line}
      status={config.done ? 'done' : config.key === flow.current ? 'current' : 'later'}
      open={openSteps.has(config.key)}
      onToggle={() => toggleStep(config.key)}
    >
      {children}
    </FinancialStep>
  );

  /** A step's rows — or, where none apply, the checked reason it holds nothing. */
  const rowsBlock = (config, focus, columns) => (
    config.empty
      ? <InvoiceSectionEmpty title={config.empty.title} reasons={config.empty.reasons} />
      : (
        <div className={`grid grid-cols-1 items-stretch gap-2 ${columns}`}>
          {config.rows.map((row) => (focus === 'closeout' ? renderCloseOut(row) : renderRow(row, focus)))}
        </div>
      )
  );

  return (
    <TooltipProvider delayDuration={250}>
      <div className="space-y-3">
        <FinancialHeaderStrip
          status={status}
          summary={summary}
          finalCost={Number(claim.final_repair_cost) || 0}
          finalCostEx={repairNet(claim)}
          finalCostVat={repairVat(claim)}
        />

        {!showInvoicing && figuresCard}

        {showInvoicing && (
          <>
            <NextStepCard action={flow.nextAction} allDone={flow.allDone} onDo={runAction} />
            <StepIndicator steps={flow.steps} current={flow.current} onSelect={openStep} />

            <div className="space-y-2.5">
              {step(closeout, rowsBlock(closeout, 'closeout', 'sm:grid-cols-3'))}
              {step(figuresStep, figuresCard)}
              {step(raise, rowsBlock(raise, 'send', 'sm:grid-cols-2'))}
              {step(collect, rowsBlock(collect, 'send', 'sm:grid-cols-2'))}
              {step(payments, rowsBlock(payments, 'pay', 'sm:grid-cols-2'))}
            </div>

            {preparingRequest && (
              <p className="text-[11px] text-muted-foreground">Preparing the accounts request…</p>
            )}

            <input
              ref={quickUploadRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                const item = quickItem;
                e.target.value = '';
                if (files?.length && item) handleUpload(item, files);
              }}
            />
          </>
        )}

        {docs.viewingFile && (
          <FileViewer fileUrl={docs.viewingFile} onClose={() => docs.setViewingFile(null)} />
        )}

        <ConfirmDialog
          isOpen={!!docs.pendingDelete}
          onClose={() => docs.setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Delete document"
          message="Are you sure you want to delete this document?"
          confirmText="Delete"
          variant="danger"
        />

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