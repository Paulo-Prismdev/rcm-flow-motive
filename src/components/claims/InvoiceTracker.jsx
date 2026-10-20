import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Receipt, Lock, Check, FileCheck2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { logActivity } from '@/components/shared/useActivityLogger';
import FileViewer from '@/components/shared/FileViewer';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useFileUpload } from '@/hooks/useFileUpload';
import useClaimClient from '@/hooks/useClaimClient';
import InvoiceItemCard from './InvoiceItemCard';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  invoiceContext, computeInvoiceSummary, buildInvoiceItemPatch,
  buildTrackerMetaPatch, invoiceDocKey, today, claimHandlesVatExcess,
} from '@/components/shared/invoiceChecklist';

const fmtGBP = (n) => `£${(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Invoicing document tracker — internal only.
 * Uploads are stored as ClaimDocument rows under an `inv_` item key, which the
 * general Docs checklist ignores, and are mirrored into the claim's Internal
 * Updates file storage so the team can find them there.
 */
export default function InvoiceTracker({ claim, currentUser, onUpdate }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: client } = useClaimClient(claim);
  const { uploadFiles, isUploading } = useFileUpload();

  const [viewingFile, setViewingFile] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [secondRefName, setSecondRefName] = useState('');

  const { data: docs = [] } = useQuery({
    queryKey: ['claim-documents', claim.id],
    queryFn: async () => {
      const page = await base44.entities.ClaimDocument.filter({ claim_id: claim.id }, { sort: 'created_date' });
      return page.items || [];
    },
    enabled: !!claim.id,
  });

  const tracker = claim.invoice_tracker || {};

  useEffect(() => {
    setSecondRefName(tracker.second_referrer_name || '');
  }, [tracker.second_referrer_name]);

  const filesFor = (itemKey) => docs.filter((d) => d.item_key === invoiceDocKey(itemKey));

  const ctx = useMemo(
    () => invoiceContext(claim, claimHandlesVatExcess(claim, client)),
    [claim, client]
  );
  const summary = useMemo(
    () => computeInvoiceSummary(claim, ctx, (itemKey) => filesFor(itemKey).length > 0),
    [claim, ctx, docs]
  );

  const commit = (patch, description) => {
    onUpdate({ ...claim, ...patch });
    if (description) {
      logActivity({
        parentId: claim.id, parentType: 'Claim', action: 'Invoice Tracker Updated',
        description, user: currentUser,
      });
    }
  };

  const handleChange = (item, changes, description) => {
    const { patch } = buildInvoiceItemPatch(item, claim, changes, ctx);
    commit(patch, description);
  };

  const handleUpload = async (item, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const urls = await uploadFiles(files);
    if (!urls?.length) return;

    const created = [];
    for (let i = 0; i < urls.length; i++) {
      try {
        await base44.entities.ClaimDocument.create({
          claim_id: claim.id,
          item_key: invoiceDocKey(item.key),
          file_url: urls[i],
          file_name: files[i]?.name || urls[i].split('/').pop(),
          uploaded_by_email: currentUser?.email || '',
          uploaded_by_name: currentUser?.full_name || '',
          uploaded_at: new Date().toISOString(),
          source: 'manual',
        });
        created.push(urls[i]);
      } catch (e) {
        console.error('Create invoice document record failed', e);
      }
    }
    if (!created.length) return;

    // Mirror into Internal Updates file storage so the team can find it there.
    try {
      await base44.entities.Note.create({
        content: `Invoice document uploaded — ${item.label}`,
        parent_id: claim.id,
        parent_type: 'Claim',
        update_type: 'Accounts',
        file_urls: created,
        liked_by: [],
        starred: false,
      });
    } catch (e) {
      console.error('Create invoice update note failed', e);
    }

    await logActivity({
      parentId: claim.id, parentType: 'Claim', action: 'Invoice Document Uploaded',
      description: `Uploaded ${created.length} file(s) to "${item.label}"`,
      user: currentUser,
    });

    // The upload IS the received/sent signal: stamp today's date when the item
    // hasn't been dated yet, so the tracker and the claims list agree.
    const row = summary.rows.find((r) => r.item.key === item.key);
    if (row && !row.state.date) {
      const { patch } = buildInvoiceItemPatch(item, claim, { date: today() }, ctx);
      commit(patch, `${item.label} ${(item.dateLabel || 'date').toLowerCase()} date set to ${today()}`);
    }

    queryClient.invalidateQueries({ queryKey: ['claim-documents', claim.id] });
    queryClient.invalidateQueries({ queryKey: ['notes', claim.id, 'Claim'] });
  };

  const handleDeleteFile = (item, doc) => {
    setPendingDelete({
      fileName: doc.file_name || 'this file',
      action: async () => {
        await base44.entities.ClaimDocument.delete(doc.id);
        await logActivity({
          parentId: claim.id, parentType: 'Claim', action: 'Invoice Document Removed',
          description: `Removed "${doc.file_name || 'a file'}" from "${item.label}"`,
          user: currentUser,
        });
        queryClient.invalidateQueries({ queryKey: ['claim-documents', claim.id] });
      },
    });
  };

  const handleRenameFile = async (doc, newName) => {
    const name = (newName || '').trim();
    if (!name) return;
    try {
      await base44.entities.ClaimDocument.update(doc.id, { file_name: name });
      queryClient.invalidateQueries({ queryKey: ['claim-documents', claim.id] });
    } catch (e) {
      toast({ title: 'Rename failed', variant: 'destructive' });
    }
  };

  const toggleSecondReferrer = (enabled) => {
    commit(
      buildTrackerMetaPatch(claim, {
        second_referrer_enabled: enabled,
        second_referrer_name: enabled ? (tracker.second_referrer_name || '') : '',
      }),
      enabled ? 'Second referrer added to the invoicing tracker' : 'Second referrer removed from the invoicing tracker'
    );
  };

  const saveSecondReferrerName = () => {
    const current = tracker.second_referrer_name || '';
    if (secondRefName === current) return;
    commit(
      buildTrackerMetaPatch(claim, { second_referrer_name: secondRefName }),
      `Second referrer set to ${secondRefName || 'none'}`
    );
  };

  const renderItems = (sectionKey) => {
    const rows = summary.rows.filter((r) => r.item.section === sectionKey);
    if (rows.length === 0) return null;
    return (
      <TooltipProvider delayDuration={250}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {rows.map(({ item, state }) => (
            <InvoiceItemCard
              key={item.key}
              item={item}
              state={state}
              files={filesFor(item.key)}
              isUploading={isUploading}
              onChange={(changes, description) => handleChange(item, changes, description)}
              onUpload={handleUpload}
              onDeleteFile={(doc) => handleDeleteFile(item, doc)}
              onRenameFile={handleRenameFile}
              onViewFile={setViewingFile}
            />
          ))}
        </div>
      </TooltipProvider>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Receipt className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoicing Tracker</h3>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold">
          <Lock className="w-2.5 h-2.5" /> Internal only
        </span>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] border border-border bg-muted/40">
        <FileCheck2 className="w-4 h-4 text-primary flex-shrink-0" />
        <p className="text-xs font-semibold flex-shrink-0">
          {summary.complete} of {summary.total} complete
        </p>
        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className={`h-full transition-all ${summary.allComplete ? 'bg-green-500' : 'bg-primary'}`}
            style={{ width: `${summary.total ? (summary.complete / summary.total) * 100 : 0}%` }}
          />
        </div>
        {summary.allComplete && (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-green-600 dark:text-green-400 flex-shrink-0">
            <Check className="w-3 h-3" /> Complete
          </span>
        )}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-[10px] border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Outstanding</p>
          <p className="text-lg font-bold tabular-nums leading-tight text-amber-800 dark:text-amber-200">{summary.outstanding}</p>
        </div>
        <div className="rounded-[10px] border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">Owed to us</p>
          <p className="text-lg font-bold tabular-nums leading-tight text-green-800 dark:text-green-200">{fmtGBP(summary.owedToUs)}</p>
        </div>
        <div className="rounded-[10px] border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">We owe</p>
          <p className="text-lg font-bold tabular-nums leading-tight text-red-800 dark:text-red-200">{fmtGBP(summary.weOwe)}</p>
        </div>
      </div>

      {/* Second referrer */}
      <div className="rounded-[10px] border border-border bg-muted/30 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            checked={tracker.second_referrer_enabled === true}
            onChange={(e) => toggleSecondReferrer(e.target.checked)}
            className="rounded border-border"
          />
          Second referrer to pay
        </label>
        {tracker.second_referrer_enabled === true && (
          <Input
            value={secondRefName}
            onChange={(e) => setSecondRefName(e.target.value)}
            onBlur={saveSecondReferrerName}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            placeholder="Second referrer name / company"
            className="h-8 text-sm sm:max-w-xs"
          />
        )}
      </div>

      {/* Job close-out */}
      {summary.rows.some((r) => r.item.section === 'closeout') && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job close-out</h4>
          {renderItems('closeout')}
        </div>
      )}

      {/* In / Out columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoices In</h4>
            <p className="text-[10px] text-muted-foreground">Invoices we receive and pay</p>
          </div>
          {renderItems('in') || (
            <p className="text-[11px] text-muted-foreground/70">No incoming invoices apply to this claim.</p>
          )}
        </div>
        <div className="space-y-1.5">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoices Out</h4>
            <p className="text-[10px] text-muted-foreground">Invoices we send and get paid for</p>
          </div>
          {renderItems('out') || (
            <p className="text-[11px] text-muted-foreground/70">No outgoing invoices apply to this claim.</p>
          )}
        </div>
      </div>

      {viewingFile && (
        <FileViewer fileUrl={viewingFile} onClose={() => setViewingFile(null)} />
      )}

      <ConfirmDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          try {
            await pendingDelete?.action();
          } catch (e) {
            toast({ title: 'Remove failed', variant: 'destructive' });
          }
          setPendingDelete(null);
        }}
        title="Delete document"
        message="Are you sure you want to delete this document?"
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}