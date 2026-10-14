import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FileText, Upload, Trash2, Pencil, Check, X, FolderInput, MoreVertical, FileCheck2, FilePlus2,
} from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from '@/components/ui/use-toast';
import { logActivity } from '@/components/shared/useActivityLogger';
import {
  DOC_ITEMS, DOC_STATUS_META, computeChecklistSummary,
} from '@/components/shared/docChecklist';

const STATUS_QUERY_KEY = (id) => ['claim-documents', id];

export default function DocumentTracker({ claim, currentUser, onUpdate }) {
  const queryClient = useQueryClient();
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [movingId, setMovingId] = useState(null);
  const [generalDialogOpen, setGeneralDialogOpen] = useState(false);
  const [generalTitle, setGeneralTitle] = useState('');
  const [pendingGeneralFiles, setPendingGeneralFiles] = useState(null);

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

  const persistClaimCounts = useCallback(
    (files, newStatusMap) => {
      const s = computeChecklistSummary(files, newStatusMap);
      onUpdate({
        ...claim,
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
    for (const url of urls) {
      const name = (fileList[Array.from(fileList).findIndex((f) => f.name) === 0]?.name) || url.split('/').pop();
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
        });
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
    persistClaimCounts(refreshed.items || [], statusMap);
  };

  const handleRename = async (doc) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    try {
      await base44.entities.ClaimDocument.update(doc.id, { file_name: renameValue.trim() });
      await logActivity({
        parentId: claim.id, parentType: 'Claim', action: 'Document Renamed',
        description: `Renamed file to "${renameValue.trim()}"`,
        user: currentUser,
      });
      queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY(claim.id) });
    } catch (e) {
      toast({ title: 'Rename failed', variant: 'destructive' });
    }
    setRenamingId(null);
  };

  const handleRemove = async (doc) => {
    try {
      await base44.entities.ClaimDocument.delete(doc.id);
      await logActivity({
        parentId: claim.id, parentType: 'Claim', action: 'Document Removed',
        description: `Removed "${doc.file_name || 'a file'}" from "${DOC_ITEMS.find((i) => i.key === doc.item_key)?.label}"`,
        user: currentUser,
      });
      queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY(claim.id) });
      const refreshed = await base44.entities.ClaimDocument.filter({ claim_id: claim.id }, { sort: 'created_date' });
      persistClaimCounts(refreshed.items || [], statusMap);
    } catch (e) {
      toast({ title: 'Remove failed', variant: 'destructive' });
    }
  };

  const handleMove = async (doc, newItemKey) => {
    try {
      await base44.entities.ClaimDocument.update(doc.id, { item_key: newItemKey });
      await logActivity({
        parentId: claim.id, parentType: 'Claim', action: 'Document Moved',
        description: `Moved "${doc.file_name || 'a file'}" to "${DOC_ITEMS.find((i) => i.key === newItemKey)?.label}"`,
        user: currentUser,
      });
      setMovingId(null);
      queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY(claim.id) });
      const refreshed = await base44.entities.ClaimDocument.filter({ claim_id: claim.id }, { sort: 'created_date' });
      persistClaimCounts(refreshed.items || [], statusMap);
    } catch (e) {
      toast({ title: 'Move failed', variant: 'destructive' });
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

  // General documents — new uploads are stored as ClaimDocument records (item_key='general')
  // with a user-provided title. Legacy claim.file_urls are preserved and shown alongside.
  const generalDocRecords = docs.filter((d) => d.item_key === 'general');
  const legacyGeneralFiles = Array.isArray(claim.file_urls) ? claim.file_urls : [];

  const openGeneralDialog = (fileList) => {
    setPendingGeneralFiles(fileList);
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

  const handleRemoveGeneralRecord = async (doc) => {
    try {
      await base44.entities.ClaimDocument.delete(doc.id);
      await logActivity({
        parentId: claim.id, parentType: 'Claim', action: 'Document Removed',
        description: `Removed "${doc.file_name || 'a file'}" from General Documents`,
        user: currentUser,
      });
      queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY(claim.id) });
    } catch (e) {
      toast({ title: 'Remove failed', variant: 'destructive' });
    }
  };

  const handleRemoveLegacyGeneral = async (url) => {
    const current = Array.isArray(claim.file_urls) ? claim.file_urls : [];
    onUpdate({ ...claim, file_urls: current.filter((u) => u !== url) });
    await logActivity({
      parentId: claim.id, parentType: 'Claim', action: 'Document Removed',
      description: 'Removed a file from General Documents',
      user: currentUser,
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

      {/* Checklist items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
        {summary.items.map(({ item, status }) => {
          const meta = DOC_STATUS_META[status];
          const itemFiles = docs.filter((d) => d.item_key === item.key);
          return (
            <div key={item.key} className="rounded-[10px] border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                  <span className="text-sm font-medium truncate">{item.label}</span>
                  {!item.required && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">optional</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <UploadButton onFiles={(files) => handleUpload(item.key, files)} disabled={isUploading} compact />
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>
                    {meta.label}
                  </span>
                  <StatusMenu item={item} status={status} onToggle={handleStatusToggle} />
                </div>
              </div>

              {/* Files within item */}
              {itemFiles.length > 0 && (
                <div className="px-3 pb-2 space-y-1 border-t border-border/60">
                  {itemFiles.map((doc) => (
                    <FileRow
                      key={doc.id}
                      doc={doc}
                      renaming={renamingId === doc.id}
                      renameValue={renameValue}
                      onRenameStart={() => { setRenamingId(doc.id); setRenameValue(doc.file_name || ''); }}
                      onRenameChange={setRenameValue}
                      onRenameSubmit={() => handleRename(doc)}
                      onRenameCancel={() => setRenamingId(null)}
                      onRemove={() => handleRemove(doc)}
                      onMove={(key) => handleMove(doc, key)}
                      moving={movingId === doc.id}
                      onMoveToggle={() => setMovingId(movingId === doc.id ? null : doc.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* General documents area */}
      <div className="rounded-[10px] border border-dashed border-border bg-card">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
          <FolderInput className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">General Documents</span>
          <span className="text-xs text-muted-foreground">({generalDocRecords.length + legacyGeneralFiles.length})</span>
          <div className="ml-auto">
            <UploadButton onFiles={openGeneralDialog} disabled={isUploading} label="Add to General Documents" compact />
          </div>
        </div>
        {(generalDocRecords.length > 0 || legacyGeneralFiles.length > 0) && (
          <div className="px-3 py-1.5 space-y-1">
            {generalDocRecords.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 group rounded-md px-2 py-1 hover:bg-muted/50">
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline truncate flex-1">
                  {doc.file_name || doc.file_url.split('/').pop()}
                </a>
                <button
                  onClick={() => handleRemoveGeneralRecord(doc)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {legacyGeneralFiles.map((url) => (
              <div key={url} className="flex items-center gap-2 group rounded-md px-2 py-1 hover:bg-muted/50">
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <a href={url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline truncate flex-1">
                  {url.split('/').pop()}
                </a>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">legacy</span>
                <button
                  onClick={() => handleRemoveLegacyGeneral(url)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
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
    </div>
  );
}

function StatusMenu({ item, status, onToggle }) {
  const [open, setOpen] = useState(false);
  const options = item.required
    ? [
        { key: 'outstanding', label: 'Outstanding' },
        { key: 'not_applicable', label: 'Not applicable' },
      ]
    : [
        { key: 'not_required', label: 'Optional (default)' },
        { key: 'outstanding', label: 'Expected' },
        { key: 'not_applicable', label: 'Not applicable' },
      ];
  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="p-1 rounded-md text-gray-400 hover:text-foreground hover:bg-muted"
        title="Change status"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-50 w-44 rounded-md border border-border bg-popover shadow-lg py-1">
            {options.map((opt) => (
              <button
                key={opt.key}
                onClick={(e) => { e.stopPropagation(); onToggle(item, opt.key); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted ${status === opt.key ? 'font-semibold text-primary' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FileRow({ doc, renaming, renameValue, onRenameStart, onRenameChange, onRenameSubmit, onRenameCancel, onRemove, onMove, moving, onMoveToggle }) {
  const moveOptions = DOC_ITEMS.filter((i) => i.key !== doc.item_key);
  return (
    <div className="flex items-center gap-2 group rounded-md px-2 py-1.5 hover:bg-muted/50">
      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      {renaming ? (
        <div className="flex items-center gap-1 flex-1">
          <Input
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onRenameSubmit(); if (e.key === 'Escape') onRenameCancel(); }}
            autoFocus
            className="h-7 text-sm"
          />
          <button onClick={onRenameSubmit} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={onRenameCancel} className="p-1 text-gray-400 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      ) : (
        <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline truncate flex-1">
          {doc.file_name || doc.file_url.split('/').pop()}
        </a>
      )}
      {!renaming && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity relative">
          <button onClick={onRenameStart} className="p-1 text-gray-400 hover:text-primary rounded" title="Rename"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={onMoveToggle} className="p-1 text-gray-400 hover:text-primary rounded" title="Move to…"><FolderInput className="w-3.5 h-3.5" /></button>
          <button onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500 rounded" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
          {moving && (
            <div className="absolute right-0 top-7 z-50 w-44 rounded-md border border-border bg-popover shadow-lg py-1">
              {moveOptions.map((i) => (
                <button
                  key={i.key}
                  onClick={() => onMove(i.key)}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted truncate"
                >
                  {i.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UploadButton({ onFiles, disabled, label = 'Upload file', compact = false }) {
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
      {compact ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors disabled:opacity-50"
          title={label}
        >
          <Upload className="w-3 h-3" />
          Upload
        </button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="gap-2 w-full border-dashed"
        >
          <FilePlus2 className="w-3.5 h-3.5" />
          {label}
        </Button>
      )}
    </>
  );
}