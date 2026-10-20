import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FileText, Upload, Trash2, Check, FileCheck2,
} from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from '@/components/ui/use-toast';
import { logActivity } from '@/components/shared/useActivityLogger';
import FileViewer from '@/components/shared/FileViewer';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import {
  DOC_ITEMS, computeChecklistSummary, itemKeyDate,
} from '@/components/shared/docChecklist';
import DocumentChecklistCard from '@/components/claims/DocumentChecklistCard';
import RemoveFileDialog from '@/components/shared/RemoveFileDialog';
import { removeFileFromUpdates } from '@/components/shared/removeFileFromUpdates';
import { formatInvoiceDay } from '@/components/shared/invoiceChecklist';
import { TooltipProvider } from '@/components/ui/tooltip';

const STATUS_QUERY_KEY = (id) => ['claim-documents', id];

// A document arriving today is what an empty Key Dates date is set from, and it
// stays editable right there on the item.
const todayISO = () => new Date().toISOString().split('T')[0];

// Key Dates are stored as YYYY-MM-DD; the date inputs need the same shape.
const toInputDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

export default function DocumentTracker({ claim, currentUser, onUpdate }) {
  const queryClient = useQueryClient();
  const [viewingFile, setViewingFile] = useState(null);
  const [generalDialogOpen, setGeneralDialogOpen] = useState(false);
  const [generalTitle, setGeneralTitle] = useState('');
  const [pendingGeneralFiles, setPendingGeneralFiles] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  // A document being dragged out of General Documents onto a checklist placeholder.
  const [dragDoc, setDragDoc] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  // Item whose Key Dates field we should focus, straight after a file lands in it.
  const [focusDateKey, setFocusDateKey] = useState(null);
  // Item whose actions menu is open (one at a time).
  const [openMenuKey, setOpenMenuKey] = useState(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: STATUS_QUERY_KEY(claim.id),
    queryFn: async () => {
      const page = await base44.entities.ClaimDocument.filter({ claim_id: claim.id }, { sort: 'created_date' });
      return page.items || [];
    },
    enabled: !!claim.id,
  });

  const statusMap = claim.doc_checklist_status || {};
  const summary = useMemo(
    () => computeChecklistSummary(docs, statusMap),
    [docs, statusMap]
  );

  // `extra` lets an action change something else on the claim in the same save,
  // so two writes can never overwrite each other.
  const persistClaimCounts = useCallback(
    (files, newStatusMap, extra = {}) => {
      const s = computeChecklistSummary(files, newStatusMap);
      onUpdate({
        ...claim,
        ...extra,
        doc_checklist_status: newStatusMap,
        doc_checklist_received: s.received,
        doc_checklist_total: s.total,
      });
    },
    [claim, onUpdate]
  );

  // One-time backfill: file an existing instruction PDF against "Instruction to repairer".
  React.useEffect(() => {
    if (isLoading || !claim.instruction_pdf_url) return;
    const exists = docs.some(
      (d) => d.item_key === 'instruction_to_repairer' && d.file_url === claim.instruction_pdf_url
    );
    if (exists) return;
    (async () => {
      try {
        await base44.entities.ClaimDocument.create({
          claim_id: claim.id,
          item_key: 'instruction_to_repairer',
          file_url: claim.instruction_pdf_url,
          file_name: `Instruction PDF (${claim.job_number || claim.reg || ''}).pdf`,
          uploaded_by_email: 'system',
          uploaded_by_name: 'System',
          uploaded_at: new Date().toISOString(),
          source: 'backfill',
        });
        queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY(claim.id) });
      } catch (e) {
        console.error('Backfill instruction doc failed', e);
      }
    })();
  }, [isLoading, claim.id, claim.instruction_pdf_url, claim.job_number, claim.reg, docs, queryClient]);

  const { uploadFiles, uploads, isUploading } = useFileUpload();

  const handleUpload = async (itemKey, fileList) => {
    if (!fileList?.length) return;
    const urls = await uploadFiles(fileList);
    if (!urls?.length) return;
    // The Key Dates date an upload fills in is remembered as coming from the first
    // file that landed, so removing that file can clear the date it set — and
    // nothing else.
    const item = DOC_ITEMS.find((i) => i.key === itemKey);
    const dateMissing = !!item?.dateField && !claim[item.dateField.field];
    let dateSet = false;

    for (const url of urls) {
      const name = (fileList[Array.from(fileList).findIndex((f) => f.name) === 0]?.name) || url.split('/').pop();
      const marksDate = dateMissing && !dateSet;
      try {
        await base44.entities.ClaimDocument.create({
          claim_id: claim.id,
          item_key: itemKey,
          file_url: url,
          file_name: name,
          uploaded_by_email: currentUser?.email || '',
          uploaded_by_name: currentUser?.full_name || '',
          uploaded_at: new Date().toISOString(),
          source: 'manual',
          ...(marksDate
            ? { date_set_field: item.dateField.field, date_set_value: todayISO() }
            : {}),
        });
        if (marksDate) dateSet = true;
      } catch (e) {
        console.error('Create doc record failed', e);
      }
    }
    await logActivity({
      parentId: claim.id, parentType: 'Claim', action: 'Document Uploaded',
      description: `Uploaded ${urls.length} file(s) to "${DOC_ITEMS.find((i) => i.key === itemKey)?.label}"`,
      user: currentUser,
    });
    queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY(claim.id) });
    const refreshed = await base44.entities.ClaimDocument.filter({ claim_id: claim.id }, { sort: 'created_date' });

    // The file is in: the Key Dates date it supplies is filled in when it is
    // still empty, and its field is opened straight away so it can be put right.
    persistClaimCounts(
      refreshed.items || [],
      statusMap,
      dateMissing ? { [item.dateField.field]: todayISO() } : {}
    );

    if (dateMissing) {
      setFocusDateKey(item.key);
      setOpenMenuKey(item.key);
    }
  };

  const handleRename = async (doc, newName) => {
    if (!newName) return;
    try {
      await base44.entities.ClaimDocument.update(doc.id, { file_name: newName });
      await logActivity({
        parentId: claim.id, parentType: 'Claim', action: 'Document Renamed',
        description: `Renamed file to "${newName}"`,
        user: currentUser,
      });
      queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY(claim.id) });
    } catch (e) {
      toast({ title: 'Rename failed', variant: 'destructive' });
    }
  };

  /**
   * Removing a file. Where that file is the one that set the item's Key Dates
   * date, the choice is offered: take the date with the file, or keep it while a
   * replacement copy is found. Any other file — a second copy — just goes.
   */
  const handleRemove = (doc) => {
    const item = DOC_ITEMS.find((i) => i.key === doc.item_key);
    const label = item?.label || 'document';
    const fileName = doc.file_name || 'this file';
    const dateField = doc.date_set_field || null;
    // Only the date this very file set, still standing, is its to clear.
    const dateSetByFile = !!dateField && claim[dateField] === doc.date_set_value;
    const dateLabel = item?.dateField?.field === dateField ? item.dateField.label : '';

    const removeDoc = async (clearDate) => {
      await base44.entities.ClaimDocument.delete(doc.id);
      await removeFileFromUpdates(claim.id, doc.file_url);
      queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY(claim.id) });
      queryClient.invalidateQueries({ queryKey: ['notes', claim.id, 'Claim'] });
      const refreshed = await base44.entities.ClaimDocument.filter({ claim_id: claim.id }, { sort: 'created_date' });
      persistClaimCounts(
        refreshed.items || [],
        statusMap,
        clearDate ? { [dateField]: null } : {}
      );
      await logActivity({
        parentId: claim.id, parentType: 'Claim', action: 'Document Removed',
        description: clearDate
          ? `Removed "${fileName}" from "${label}" and cleared the date it set (${dateLabel || 'Key Dates'}: ${formatInvoiceDay(claim[dateField])})`
          : dateSetByFile
            ? `Removed "${fileName}" from "${label}" — the date it set was kept, so a replacement copy is expected`
            : `Removed "${fileName}" from "${label}"`,
        user: currentUser,
      });
    };

    if (!dateSetByFile) {
      setPendingDelete({ label, fileName, action: () => removeDoc(false) });
      return;
    }

    setPendingDelete({
      kind: 'date',
      label,
      fileName,
      description: `This is the copy the ${dateLabel || 'Key Dates'} date was recorded from.`,
      clearPoints: [
        `clear the ${dateLabel || 'Key Dates'} date it set (${formatInvoiceDay(claim[dateField])})`,
        'leave the item outstanding until a replacement copy is added',
      ],
      clearDate: () => removeDoc(true),
      keepDate: () => removeDoc(false),
    });
  };

  /** Runs whatever the open confirmation chose, closing it either way. */
  const runPending = async (which) => {
    const pending = pendingDelete;
    setPendingDelete(null);
    try {
      await pending?.[which]?.();
    } catch (e) {
      toast({ title: 'Remove failed', variant: 'destructive' });
    }
  };

  const handleStatusToggle = async (item, newStatus) => {
    const newMap = { ...statusMap };
    if (newStatus === 'outstanding') {
      newMap[item.key] = 'outstanding';
    } else if (newStatus === 'not_applicable') {
      newMap[item.key] = 'not_applicable';
    } else if (newStatus === 'not_required') {
      newMap[item.key] = 'not_required';
    } else {
      delete newMap[item.key];
    }
    await logActivity({
      parentId: claim.id, parentType: 'Claim', action: 'Document Checklist Updated',
      description: `"${item.label}" marked as ${newStatus.replace('_', ' ')}`,
      user: currentUser,
    });
    persistClaimCounts(docs, newMap);
  };

  // The date entered against a checklist item IS the claim's Key Dates field —
  // one value in one place, editable from either screen.
  const handleItemDateChange = (item, value) => {
    onUpdate({ ...claim, [item.dateField.field]: value || null });
  };

  // Drag a document out of General Documents and drop it on a placeholder to file
  // it as that document.
  const startDragDoc = (e, payload) => {
    setDragDoc(payload);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', payload.name || 'document');
    } catch (err) {
      // Some browsers block writes to dataTransfer; the drag state carries it.
    }
  };

  const endDragDoc = () => {
    setDragDoc(null);
    setDropTarget(null);
  };

  const fileIntoChecklist = async (item, payload) => {
    // Filing a document is what fills in its Key Dates date, so the file that does
    // it is remembered as the one that set that date.
    const dateMissing = !!item.dateField && !claim[item.dateField.field];
    const dateSet = dateMissing
      ? { date_set_field: item.dateField.field, date_set_value: todayISO() }
      : {};

    try {
      if (payload.record) {
        if (payload.record.item_key === item.key) return;
        await base44.entities.ClaimDocument.update(payload.record.id, {
          item_key: item.key,
          ...dateSet,
        });
      } else {
        // A legacy general file becomes a proper document record, so it can be
        // filed like any other.
        await base44.entities.ClaimDocument.create({
          claim_id: claim.id,
          item_key: item.key,
          file_url: payload.url,
          file_name: payload.name,
          uploaded_by_email: currentUser?.email || '',
          uploaded_by_name: currentUser?.full_name || '',
          uploaded_at: new Date().toISOString(),
          source: 'manual',
          ...dateSet,
        });
      }
      await logActivity({
        parentId: claim.id, parentType: 'Claim', action: 'Document Filed',
        description: `Filed "${payload.name}" as "${item.label}"`,
        user: currentUser,
      });
      // A moved legacy file leaves the claim's general file list, so the same
      // document never sits in two places.
      const extra = {
        ...(payload.legacyUrl
          ? { file_urls: (Array.isArray(claim.file_urls) ? claim.file_urls : []).filter((u) => u !== payload.legacyUrl) }
          : {}),
        ...(dateMissing ? { [item.dateField.field]: todayISO() } : {}),
      };
      queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY(claim.id) });
      const refreshed = await base44.entities.ClaimDocument.filter({ claim_id: claim.id }, { sort: 'created_date' });
      persistClaimCounts(refreshed.items || [], statusMap, extra);
      if (dateMissing) {
        setFocusDateKey(item.key);
        setOpenMenuKey(item.key);
      }
      toast({ title: `Filed as ${item.label}` });
    } catch (e) {
      toast({ title: 'Could not file that document', variant: 'destructive' });
    }
  };

  const handleDropOnItem = (item) => {
    const payload = dragDoc;
    setDragDoc(null);
    setDropTarget(null);
    if (payload) fileIntoChecklist(item, payload);
  };

  // General documents — new uploads are stored as ClaimDocument records (item_key='general')
  // with a user-provided title. Legacy claim.file_urls are preserved and shown alongside.
  const generalDocRecords = docs.filter((d) => d.item_key === 'general');
  const legacyGeneralFiles = Array.isArray(claim.file_urls) ? claim.file_urls : [];

  const openGeneralDialog = (fileList) => {
    setPendingGeneralFiles(Array.from(fileList || []));
    setGeneralTitle('');
    setGeneralDialogOpen(true);
  };

  const confirmAddGeneral = async () => {
    if (!pendingGeneralFiles?.length) { setGeneralDialogOpen(false); return; }
    const urls = await uploadFiles(pendingGeneralFiles);
    if (!urls?.length) { setGeneralDialogOpen(false); return; }
    const title = generalTitle.trim();
    for (const url of urls) {
      try {
        await base44.entities.ClaimDocument.create({
          claim_id: claim.id,
          item_key: 'general',
          file_url: url,
          file_name: title || pendingGeneralFiles[0]?.name || url.split('/').pop(),
          uploaded_by_email: currentUser?.email || '',
          uploaded_by_name: currentUser?.full_name || '',
          uploaded_at: new Date().toISOString(),
          source: 'manual',
        });
      } catch (e) {
        console.error('Create general doc record failed', e);
      }
    }
    await logActivity({
      parentId: claim.id, parentType: 'Claim', action: 'Document Uploaded',
      description: `Uploaded ${urls.length} file(s) to General Documents${title ? ` ("${title}")` : ''}`,
      user: currentUser,
    });
    queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY(claim.id) });
    setGeneralDialogOpen(false);
    setPendingGeneralFiles(null);
    setGeneralTitle('');
  };

  const handleRemoveGeneralRecord = (doc) => {
    setPendingDelete({
      label: 'General Documents',
      fileName: doc.file_name || 'this file',
      action: async () => {
        await base44.entities.ClaimDocument.delete(doc.id);
        await logActivity({
          parentId: claim.id, parentType: 'Claim', action: 'Document Removed',
          description: `Removed "${doc.file_name || 'a file'}" from General Documents`,
          user: currentUser,
        });
        queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY(claim.id) });
      },
    });
  };

  const handleRemoveLegacyGeneral = (url) => {
    const fileName = url.split('/').pop() || 'this file';
    setPendingDelete({
      label: 'General Documents',
      fileName,
      action: async () => {
        const current = Array.isArray(claim.file_urls) ? claim.file_urls : [];
        onUpdate({ ...claim, file_urls: current.filter((u) => u !== url) });
        await logActivity({
          parentId: claim.id, parentType: 'Claim', action: 'Document Removed',
          description: 'Removed a file from General Documents',
          user: currentUser,
        });
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] border border-border bg-muted/40">
        <FileCheck2 className="w-4 h-4 text-primary flex-shrink-0" />
        <p className="text-xs font-semibold flex-shrink-0">
          {summary.received} of {summary.total} received
        </p>
        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className={`h-full transition-all ${summary.complete ? 'bg-green-500' : 'bg-primary'}`}
            style={{ width: `${summary.total ? (summary.received / summary.total) * 100 : 0}%` }}
          />
        </div>
        {summary.complete && (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-green-600 dark:text-green-400 flex-shrink-0">
            <Check className="w-3 h-3" /> Complete
          </span>
        )}
      </div>

      {/* Checklist items — each document is a solid status button and every
          other action lives behind its ⋮ menu. */}
      <TooltipProvider delayDuration={250}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {summary.items.map(({ item, status }) => {
            const itemFiles = docs.filter((d) => d.item_key === item.key);
            return (
              <DocumentChecklistCard
                key={item.key}
                item={item}
                status={status}
                files={itemFiles}
                uploading={isUploading}
                dateRecorded={itemKeyDate(item, claim)}
                keyDateLabel={item.dateField?.label}
                keyDateValue={item.dateField ? toInputDate(claim[item.dateField.field]) : ''}
                autoFocusKeyDate={focusDateKey === item.key}
                onKeyDateChange={(value) => handleItemDateChange(item, value)}
                menuOpen={openMenuKey === item.key}
                onMenuOpenChange={(open) => {
                  setOpenMenuKey(open ? item.key : null);
                  if (!open) setFocusDateKey(null);
                }}
                dragActive={!!dragDoc}
                isDropTarget={dropTarget === item.key}
                onDropTargetEnter={() => { if (dragDoc && dropTarget !== item.key) setDropTarget(item.key); }}
                onDropTargetLeave={() => setDropTarget((t) => (t === item.key ? null : t))}
                onDrop={() => handleDropOnItem(item)}
                onUpload={(files) => handleUpload(item.key, files)}
                onView={(url) => setViewingFile(url)}
                onRename={handleRename}
                onRemove={handleRemove}
                onStatusChange={(newStatus) => handleStatusToggle(item, newStatus)}
              />
            );
          })}
        </div>
      </TooltipProvider>

      {/* General documents area */}
      <div className="rounded-[10px] border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
          <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-semibold">General Documents</span>
          <span className="text-[11px] text-muted-foreground">({generalDocRecords.length + legacyGeneralFiles.length})</span>
          <span className="hidden md:inline text-[10px] text-muted-foreground">— drag a file onto a document above to file it</span>
          <div className="ml-auto">
            <UploadButton onFiles={openGeneralDialog} disabled={isUploading} label="Add to General Documents" />
          </div>
        </div>
        {(generalDocRecords.length > 0 || legacyGeneralFiles.length > 0) ? (
          <div className="divide-y divide-border/60">
            {generalDocRecords.map((doc) => (
              <div
                key={doc.id}
                draggable
                onDragStart={(e) => startDragDoc(e, { record: doc, name: doc.file_name || doc.file_url.split('/').pop() })}
                onDragEnd={endDragDoc}
                title="Drag onto a document above to file it"
                className={`flex items-center gap-2 px-3 py-1.5 group hover:bg-muted/40 cursor-grab active:cursor-grabbing ${dragDoc?.record?.id === doc.id ? 'opacity-40' : ''}`}
              >
                <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <button onClick={() => setViewingFile(doc.file_url)} className="text-xs text-foreground hover:text-primary hover:underline truncate flex-1 text-left">
                  {doc.file_name || doc.file_url.split('/').pop()}
                </button>
                <button
                  onClick={() => handleRemoveGeneralRecord(doc)}
                  className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity flex-shrink-0"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {legacyGeneralFiles.map((url) => (
              <div
                key={url}
                draggable
                onDragStart={(e) => startDragDoc(e, { legacyUrl: url, url, name: url.split('/').pop() })}
                onDragEnd={endDragDoc}
                title="Drag onto a document above to file it"
                className={`flex items-center gap-2 px-3 py-1.5 group hover:bg-muted/40 cursor-grab active:cursor-grabbing ${dragDoc?.legacyUrl === url ? 'opacity-40' : ''}`}
              >
                <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <button onClick={() => setViewingFile(url)} className="text-xs text-foreground hover:text-primary hover:underline truncate flex-1 text-left">
                  {url.split('/').pop()}
                </button>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">legacy</span>
                <button
                  onClick={() => handleRemoveLegacyGeneral(url)}
                  className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity flex-shrink-0"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-3 py-3 text-xs text-muted-foreground">
            No general documents yet — upload one, or drag a file from here onto a document above.
          </p>
        )}
      </div>

      {/* Add general document dialog (title prompt) */}
      {generalDialogOpen && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-background p-5 shadow-lg">
            <h3 className="text-sm font-semibold mb-3">Add General Document</h3>
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <Input
              value={generalTitle}
              onChange={(e) => setGeneralTitle(e.target.value)}
              placeholder="e.g. Hire Agreement, Police Report…"
              autoFocus
              className="mt-1 mb-3"
              onKeyDown={(e) => { if (e.key === 'Enter') confirmAddGeneral(); }}
            />
            <p className="text-xs text-muted-foreground mb-4">
              {pendingGeneralFiles?.length || 0} file(s) ready to upload.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setGeneralDialogOpen(false); setPendingGeneralFiles(null); }}>Cancel</Button>
              <Button size="sm" onClick={confirmAddGeneral} disabled={isUploading}>
                {isUploading ? 'Uploading…' : 'Upload'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {viewingFile && (
        <FileViewer fileUrl={viewingFile} onClose={() => setViewingFile(null)} />
      )}

      <ConfirmDialog
        isOpen={!!pendingDelete && pendingDelete.kind !== 'date'}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => runPending('action')}
        title="Delete document"
        message="Are you sure you want to delete this document?"
        confirmText="Delete"
        variant="danger"
      />

      {pendingDelete?.kind === 'date' && (
        <RemoveFileDialog
          isOpen
          fileName={pendingDelete.fileName}
          description={pendingDelete.description}
          clearPoints={pendingDelete.clearPoints}
          keepHint="Date recorded, copy not attached"
          onClose={() => setPendingDelete(null)}
          onClear={() => runPending('clearDate')}
          onKeep={() => runPending('keepDate')}
        />
      )}
    </div>
  );
}

function UploadButton({ onFiles, disabled, label = 'Upload file' }) {
  const inputRef = React.useRef(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ''; }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-medium border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors disabled:opacity-50"
        title={label}
      >
        <Upload className="w-3 h-3" />
        Upload
      </button>
    </>
  );
}