import React, { useMemo, useState } from 'react';
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
  isInvoiceDocument,
  repairNet,
  repairVat,
  resolveInvoiceAmount,
  today,
} from '@/components/shared/invoiceChecklist';
import FinancialHeaderStrip from './FinancialHeaderStrip';
import JobFiguresCard from './JobFiguresCard';
import InvoiceGroup from './InvoiceGroup';
import InvoiceRow from './InvoiceRow';
import CloseOutItem from './CloseOutItem';
import RequestInvoiceModal from './RequestInvoiceModal';
import InvoiceReviewModal from './InvoiceReviewModal';
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
 * The claim's Financials — one flow: the totals and overall status, the job
 * figures the invoices are worked out from, the invoices themselves, and the
 * close-out step. Internal only.
 */
export default function ClaimFinancials({ claim, currentUser, onUpdate, showInvoicing = true }) {
  const { toast } = useToast();
  const { data: client } = useClaimClient(claim);
  const docs = useClaimInvoiceDocs(claim, currentUser);

  const [request, setRequest] = useState(null);
  const [preparingRequest, setPreparingRequest] = useState(false);
  const [pendingFigureChange, setPendingFigureChange] = useState(null);
  const [review, setReview] = useState(null);

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
    onUpdate({ ...claim, ...patch });
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
    commit(patch, description);
  };

  const handleUpload = async (item, fileList) => {
    const [file] = Array.from(fileList || []);
    if (!file) return;

    // An invoice is read off the document first and only saved once its figures
    // have been checked. Documents are filed as they are.
    if (!isInvoiceDocument(item)) {
      const created = await docs.uploadToItem(item, fileList);
      if (!created?.length) return;

      await logActivity({
        parentId: claim.id,
        parentType: 'Claim',
        action: 'Invoice Document Uploaded',
        description: `Uploaded ${created.length} file(s) to "${item.label}"`,
        user: currentUser,
      });

      // The upload IS the received/sent signal: stamp today's date when the item
      // hasn't been dated yet, so the totals and the claims list agree.
      const row = summary.rows.find((r) => r.item.key === item.key);
      if (row && !row.state.date) {
        const { patch } = buildInvoiceItemPatch(item, claim, { date: today() }, ctx);
        commit(patch, `${item.label} ${(item.dateLabel || 'date').toLowerCase()} date set to ${today()}`);
      }
      return;
    }

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
  // and accepted.
  const handleReviewConfirm = async ({ figures, corrections, accepted }) => {
    if (!review) return;
    const { item } = review;
    try {
      await docs.attachFile(item, { file_url: review.fileUrl, file_name: review.fileName });
      applyCommit(
        buildInvoiceReviewPatch(item, claim, figures),
        `${item.label} recorded — invoice ${figures.invoice_number}, dated ${figures.invoice_date}, ${fmtGBP(Number(figures.amount_total) || 0)}`
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
    const patch = buildInvoiceRequestPatch(claim, request.item.key, {
      requested: true,
      requested_at: requestedAt,
      requested_by: currentUser?.email,
    });
    onUpdate({ ...claim, ...patch });
  };

  const renderRow = ({ item, state }) => (
    <InvoiceRow
      key={item.key}
      item={item}
      state={state}
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

  const rowsFor = (section) => summary.rows.filter((r) => r.item.section === section);

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

        <JobFiguresCard
          claim={claim}
          ctx={ctx}
          missing={summary.missing}
          onChange={(fields, description) => commit(fields, description, { checkInvoiceImpact: true })}
          onTrackerChange={(patch, description) => commit(patch, description, { checkInvoiceImpact: true })}
        />

        {showInvoicing && (
          <div className="space-y-3">
            {preparingRequest && (
              <p className="text-[11px] text-muted-foreground">Preparing the accounts request…</p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
              <InvoiceGroup
                label="Invoices In"
                hint="Invoices we receive and pay"
                isEmpty={rowsFor('in').length === 0}
                emptyText="No incoming invoices apply to this claim."
              >
                {rowsFor('in').map(renderRow)}
              </InvoiceGroup>

              <InvoiceGroup
                label="Invoices Out"
                hint="Invoices we send and get paid for"
                isEmpty={rowsFor('out').length === 0}
                emptyText="No outgoing invoices apply to this claim."
              >
                {rowsFor('out').map(renderRow)}
              </InvoiceGroup>
            </div>

            <InvoiceGroup
              label="Close-out"
              hint="The job's final step"
              isEmpty={rowsFor('closeout').length === 0}
              emptyText="No close-out paperwork applies to this claim."
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {rowsFor('closeout').map(renderCloseOut)}
              </div>
            </InvoiceGroup>
          </div>
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