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
  invoiceDocumentKind,
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
import AuthorityReviewModal from './AuthorityReviewModal';
import ReinvoiceRequestModal from './ReinvoiceRequestModal';
import FinalInvoiceAuthorityNote from './FinalInvoiceAuthorityNote';
import { buildFinancialFlow } from './financialSteps';
import { buildStepMovedPastPatch, buildStepReopenPatch } from './financialStepSkip';
import PendingStepBanner from './PendingStepBanner';
import { resolveInvoiceParty } from './invoiceParty';
import useClaimInvoiceDocs from './useClaimInvoiceDocs';
import { buildReviewLog, toNum } from './invoiceReview';
import { buildAuthorityLog, buildAuthorityReviewPatch, excessCheck } from './authorityReview';
import { authorityAmount, compareToAuthority, finalInvoiceTotal } from './invoiceAuthorityCheck';
import { fmtGBP } from '@/components/shared/creditRepairRates';

/** Readable names for the financial fields in the claim's activity history. */
const FIELD_LABELS = {
  final_repair_cost: 'Final repair cost',
  client_vat_status: 'Customer VAT status',
  policy_excess: 'Policy excess',
  excess_tbc: 'Excess on authority (TBC)',
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
  const [authorityReview, setAuthorityReview] = useState(null);
  const [reinvoice, setReinvoice] = useState(null);
  const [quickItem, setQuickItem] = useState(null);
  const [paidPrompt, setPaidPrompt] = useState(null);
  // The figure the next-step button has asked for, so the card can open it.
  const [figuresFocus, setFiguresFocus] = useState(null);
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
  // The filed copies are the real ones here, so an invoice counts as done only
  // once its copy is attached — and the job's invoicing only once everything that
  // applies is attached and paid.
  const summary = useMemo(
    () => computeInvoiceSummary(claim, ctx, hasFile),
    [claim, ctx, docs.files]
  );
  const status = useMemo(
    () => deriveInvoiceStatus(claim, hasFile, { financialsView: true }),
    [claim, docs.files]
  );
  const flow = useMemo(() => buildFinancialFlow(summary, ctx, claim), [summary, ctx, claim]);

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

  // Every upload is read off the document before anything is recorded, and what
  // is read depends on the document: an invoice in full, an authority for its
  // own three figures, and a Collection Note not at all — that one is simply
  // stored, and its card goes green.
  const handleUpload = async (item, fileList) => {
    const [file] = Array.from(fileList || []);
    if (!file) return;
    try {
      const uploaded = await docs.uploadFile(file);
      if (!uploaded) return;

      const kind = invoiceDocumentKind(item);

      if (kind === 'store') {
        await docs.attachFile(item, uploaded);
        await logActivity({
          parentId: claim.id,
          parentType: 'Claim',
          action: 'Invoice Document Filed',
          description: `${item.label} stored against the claim — nothing is read off it.`,
          user: currentUser,
        });
        toast({ title: `${item.label} filed`, description: 'The copy is stored against the claim.' });
        return;
      }

      if (kind === 'authority') {
        setAuthorityReview({ item, fileUrl: uploaded.file_url, fileName: uploaded.file_name });
        return;
      }

      setReview({ item, fileUrl: uploaded.file_url, fileName: uploaded.file_name });
    } catch (e) {
      toast({ title: 'Upload failed', description: e?.message, variant: 'destructive' });
    }
  };

  // Nothing has touched the claim until this runs: the file is filed against the
  // invoice, its figures and number are recorded, the date marks it received or
  // sent — which locks the amount — and the history says what was read, changed
  // and accepted. The Final Invoice's total can become the final repair cost.
  const handleReviewConfirm = async ({
    figures, corrections, accepted, useAsRepairCost, acceptInvoiceTotal, requestReinvoice,
  }) => {
    if (!review) return;
    const { item } = review;
    const total = Number(figures.amount_total) || 0;

    // The Final Invoice is settled against the amount the job was authorised at:
    // within the authority its total can become the final repair cost, and where
    // the repairer is asked to re-invoice, the invoice is left waiting on a
    // corrected copy instead.
    const authority = item.setsRepairCost ? authorityAmount(claim) : null;
    const comparison = item.setsRepairCost ? compareToAuthority(total, authority) : null;
    const reinvoice = requestReinvoice && comparison?.status === 'under'
      ? { invoice_total: comparison.invoiceTotal, authority: comparison.authority, by: paidBy }
      : null;
    const repairCost = item.setsRepairCost && !reinvoice
      ? (acceptInvoiceTotal ? total : (useAsRepairCost ? total : null))
      : null;

    const description = reinvoice
      ? `${item.label} recorded — invoice ${figures.invoice_number}, dated ${figures.invoice_date}, ${fmtGBP(total)} is ${fmtGBP(Math.abs(comparison.difference))} under the authorised ${fmtGBP(authority)}; a corrected invoice has been requested from the repairer`
      : acceptInvoiceTotal
        ? `${item.label} recorded — invoice ${figures.invoice_number}, dated ${figures.invoice_date}, ${fmtGBP(total)}; accepted as the final repair cost against the authorised ${fmtGBP(authority)}`
        : repairCost
          ? `${item.label} recorded — invoice ${figures.invoice_number}, dated ${figures.invoice_date}, ${fmtGBP(total)}; final repair cost set to ${fmtGBP(repairCost)} from the invoice`
          : `${item.label} recorded — invoice ${figures.invoice_number}, dated ${figures.invoice_date}, ${fmtGBP(total)}`;

    try {
      await docs.attachFile(item, { file_url: review.fileUrl, file_name: review.fileName });
      applyCommit(
        {
          ...buildInvoiceReviewPatch(item, claim, figures, {
            file_url: review.fileUrl,
            file_name: review.fileName,
            repair_cost: repairCost,
            reinvoice,
          }),
          ...(repairCost ? { final_repair_cost: repairCost } : {}),
        },
        description
      );
      buildReviewLog({ item, figures, corrections, accepted }).forEach((entry) => {
        logActivity({ parentId: claim.id, parentType: 'Claim', user: currentUser, ...entry });
      });
      setReview(null);
      if (reinvoice) setReinvoice({ comparison });
    } catch (e) {
      toast({ title: 'Could not save the invoice', description: e?.message, variant: 'destructive' });
    }
  };

  /**
   * Saving the authority: its authorised amount and its excess land on the
   * claim's own figures, and where the authority is the one that arrived second,
   * the comparison with the Final Invoice that is already on file is settled
   * here — including the choice to have the repairer re-invoice.
   */
  const handleAuthorityConfirm = async ({
    figures, corrections, accepted, excessChoice, acceptInvoiceTotal, requestReinvoice,
  }) => {
    if (!authorityReview) return;
    const { item } = authorityReview;
    const total = toNum(figures.amount_total) || 0;
    const comparison = compareToAuthority(finalInvoiceTotal(claim), total);
    const reinvoice = requestReinvoice && comparison?.status === 'under'
      ? { invoice_total: comparison.invoiceTotal, authority: comparison.authority, by: paidBy }
      : null;
    const acceptTotal = acceptInvoiceTotal && comparison?.status === 'under' ? comparison.invoiceTotal : null;

    const excess = excessCheck(figures, claim);
    const excessWaived = (excess.tbc && excessChoice === 'waived') || (excess.fills && excess.shown === 0);
    const excessText = excessWaived
      ? '; the excess marked as Waived (the authority shows none)'
      : excess.fills
        ? `; the ${fmtGBP(excess.shown)} excess ${excess.tbc ? 'confirmed from the authority (TBC cleared)' : 'filled in'}`
        : excess.differs
          ? `; excess kept at ${excessChoice === 'authority' ? fmtGBP(excess.shown) : excess.storedLabel}`
          : '';
    const decisionText = `${acceptTotal ? `; the invoice total of ${fmtGBP(acceptTotal)} accepted as the final repair cost` : ''}${reinvoice ? `; a corrected invoice requested from the repairer (invoiced ${fmtGBP(reinvoice.invoice_total)} against ${fmtGBP(reinvoice.authority)})` : ''}`;

    try {
      await docs.attachFile(item, { file_url: authorityReview.fileUrl, file_name: authorityReview.fileName });
      applyCommit(
        buildAuthorityReviewPatch(claim, figures, {
          file_url: authorityReview.fileUrl,
          file_name: authorityReview.fileName,
          excessChoice,
          acceptTotal,
          reinvoice,
        }),
        `Final Authority recorded — authorised ${fmtGBP(total)}${excessText}${decisionText}`
      );
      buildAuthorityLog({ item, figures, corrections, accepted }).forEach((entry) => {
        logActivity({ parentId: claim.id, parentType: 'Claim', user: currentUser, ...entry });
      });
      setAuthorityReview(null);
      if (reinvoice) setReinvoice({ comparison });
    } catch (e) {
      toast({ title: 'Could not save the authority', description: e?.message, variant: 'destructive' });
    }
  };

  /** Rejecting an over-authority invoice and asking the repairer for a corrected one. */
  const handleReinvoiceFromReview = ({ comparison }) => {
    setReview(null);
    if (comparison) setReinvoice({ comparison });
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
    if (action.kind === 'figures') {
      // The step the button sits in is the step that is already open, so the
      // move is to open the figure that still has to be set.
      openStep('figures');
      setFiguresFocus((prev) => ({ key: action.key, n: (prev?.n || 0) + 1 }));
    }
  };

  /**
   * Taking the job past a step that still has invoices to attach. Nothing about
   * the invoices changes: they stay outstanding, the step stays amber with what it
   * is waiting on, and the choice is remembered on the claim so it is still held
   * over the next time the claim is opened — and recorded in its history.
   */
  const movePastStep = (config) => {
    const labels = config.pendingLabels;
    commit(
      buildStepMovedPastPatch(claim, config.key, { outstanding: labels, by: paidBy }),
      `Step ${config.n} (${config.title}) moved past with ${labels.length} invoice${labels.length === 1 ? '' : 's'} still to attach: ${labels.join(', ')}`
    );
  };

  /** Putting a step the job was taken past back as the job's own next work. */
  const reopenStep = (config) => {
    commit(
      buildStepReopenPatch(claim, config.key),
      `Step ${config.n} (${config.title}) reopened — its invoices are the job's next work again`
    );
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

  // The Final Invoice against the authority, worked out from the two figures the
  // claim already holds — so a change to the authority that leaves an invoice on
  // file over it flags itself, with no stored state to go stale.
  const finalInvoiceState = summary.rows.find((r) => r.item.key === 'final_invoice')?.state || null;
  const finalInvoiceComparison = compareToAuthority(finalInvoiceTotal(claim), authorityAmount(claim));
  const askRepairerForCorrectedInvoice = () => {
    if (finalInvoiceComparison) setReinvoice({ comparison: finalInvoiceComparison });
  };
  const finalInvoiceNote = finalInvoiceState && (finalInvoiceState.reinvoice || finalInvoiceComparison)
    ? (
      <FinalInvoiceAuthorityNote
        comparison={finalInvoiceComparison}
        awaitingCorrected={!!finalInvoiceState.reinvoice}
        onReinvoice={finalInvoiceComparison ? askRepairerForCorrectedInvoice : null}
      />
    )
    : null;

  const figuresCard = (
    <>
      <JobFiguresCard
        claim={claim}
        ctx={ctx}
        missing={summary.missing}
        focus={figuresFocus}
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

  /**
   * One of the steps: its header and line, then its own rows. The step the job is
   * on carries the next-step prompt — with the reminder of anything the steps it
   * has been taken past are still waiting on, and the way to move past this one
   * where its invoices are not to hand yet. A step already moved past carries its
   * own amber banner instead, with the way back into it.
   */
  const step = (config, children, nudge) => {
    const isCurrent = config.key === flow.current;
    const banner = isCurrent
      ? (
        <NextStepPrompt
          action={config.action}
          onDo={runAction}
          pending={flow.stillWaitingOn}
          onContinue={config.canContinue ? () => movePastStep(config) : null}
        />
      )
      : config.movedPast
        ? <PendingStepBanner outstanding={config.pendingLabels} onReopen={() => reopenStep(config)} />
        : null;

    return (
      <FinancialStep
        n={config.n}
        title={config.title}
        hint={config.hint}
        line={config.line}
        status={config.done ? 'done'
          : config.movedPast ? 'pending'
            : isCurrent ? 'current'
              : config.workable ? 'later' : 'dimmed'}
        open={openSteps.has(config.key)}
        onToggle={() => toggleStep(config.key)}
        banner={banner}
        nudge={nudge}
      >
        {children}
      </FinancialStep>
    );
  };

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
          copies={summary.copiesMissing.map((c) => c.label)}
          payments={flow.toPay}
        />

        {!showInvoicing && figuresCard}

        {showInvoicing && (
          <>
            <div className="space-y-2.5">
              {step(
                closeout,
                <>
                  {finalInvoiceNote}
                  {rowsBlock(closeout, 'closeout', 'sm:grid-cols-3', suggestion)}
                </>,
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
          onReinvoiceEmail={handleReinvoiceFromReview}
        />

        <AuthorityReviewModal
          isOpen={!!authorityReview}
          onClose={() => setAuthorityReview(null)}
          claim={claim}
          item={authorityReview?.item}
          fileUrl={authorityReview?.fileUrl}
          fileName={authorityReview?.fileName}
          onConfirm={handleAuthorityConfirm}
        />

        <ReinvoiceRequestModal
          isOpen={!!reinvoice}
          onClose={() => setReinvoice(null)}
          claim={claim}
          comparison={reinvoice?.comparison}
          currentUser={currentUser}
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