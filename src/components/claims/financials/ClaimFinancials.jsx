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
  claimHandlesVatExcess,
  computeInvoiceSummary,
  deriveInvoiceStatus,
  invoiceContext,
  repairNet,
  repairVat,
  today,
} from '@/components/shared/invoiceChecklist';
import FinancialHeaderStrip from './FinancialHeaderStrip';
import JobFiguresCard from './JobFiguresCard';
import InvoiceGroup from './InvoiceGroup';
import InvoiceRow from './InvoiceRow';
import RequestInvoiceModal from './RequestInvoiceModal';
import { resolveInvoiceParty } from './invoiceParty';
import useClaimInvoiceDocs from './useClaimInvoiceDocs';

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

  const commit = (patch, description) => {
    onUpdate({ ...claim, ...patch });
    if (description) {
      logActivity({
        parentId: claim.id,
        parentType: 'Claim',
        action: 'Financials Updated',
        description,
        user: currentUser,
      });
    }
  };

  const handleItemChange = (item, changes, description) => {
    const { patch } = buildInvoiceItemPatch(item, claim, changes, ctx);
    commit(patch, description);
  };

  const handleUpload = async (item, fileList) => {
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

  const rowsFor = (section) => summary.rows.filter((r) => r.item.section === section);

  return (
    <TooltipProvider delayDuration={250}>
      <div className="space-y-4">
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
          onChange={(fields, description) => commit(fields, description)}
          onTrackerChange={(patch, description) => commit(patch, description)}
        />

        {showInvoicing && (
          <div className="space-y-4">
            {preparingRequest && (
              <p className="text-[11px] text-muted-foreground">Preparing the accounts request…</p>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
              {rowsFor('closeout').map(renderRow)}
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