import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useFileUpload } from '@/hooks/useFileUpload';
import { invoiceDocKey } from '@/components/shared/invoiceChecklist';

/**
 * The files filed against a claim's invoices. They are stored as ClaimDocument
 * rows under an `inv_` item key and mirrored into the claim's Internal Updates
 * file storage so the team can find them there too.
 */
export default function useClaimInvoiceDocs(claim, currentUser) {
  const queryClient = useQueryClient();
  const { uploadFiles, isUploading } = useFileUpload();
  const [viewingFile, setViewingFile] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const { data: docs = [] } = useQuery({
    queryKey: ['claim-documents', claim.id],
    queryFn: async () => {
      const page = await base44.entities.ClaimDocument.filter({ claim_id: claim.id }, { sort: 'created_date' });
      return page.items || [];
    },
    enabled: !!claim.id,
  });

  const filesFor = (itemKey) => docs.filter((d) => d.item_key === invoiceDocKey(itemKey));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['claim-documents', claim.id] });
    queryClient.invalidateQueries({ queryKey: ['notes', claim.id, 'Claim'] });
  };

  /** Uploads a file and hands back its URL, without filing it yet. */
  const uploadFile = async (file) => {
    if (!file) return null;
    const urls = await uploadFiles([file]);
    if (!urls?.length) return null;
    return { file_url: urls[0], file_name: file.name || urls[0].split('/').pop() };
  };

  /** Records the update note that points at what was filed. */
  const addUploadNote = async (item, urls) => {
    try {
      await base44.entities.Note.create({
        content: `Invoice document uploaded — ${item.label}`,
        parent_id: claim.id,
        parent_type: 'Claim',
        update_type: 'Accounts',
        file_urls: urls,
        liked_by: [],
        starred: false,
      });
    } catch (e) {
      console.error('Create invoice update note failed', e);
    }
  };

  /** Files an uploaded file against an invoice, with its update note. */
  const attachFile = async (item, { file_url, file_name }) => {
    await base44.entities.ClaimDocument.create({
      claim_id: claim.id,
      item_key: invoiceDocKey(item.key),
      file_url,
      file_name,
      uploaded_by_email: currentUser?.email || '',
      uploaded_by_name: currentUser?.full_name || '',
      uploaded_at: new Date().toISOString(),
      source: 'manual',
    });
    await addUploadNote(item, [file_url]);
    refresh();
  };

  /** Files one or more uploads against an invoice in a single step. */
  const uploadToItem = async (item, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return [];
    const urls = await uploadFiles(files);
    if (!urls?.length) return [];

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
    if (!created.length) return [];

    await addUploadNote(item, created);
    refresh();
    return created;
  };

  const renameFile = async (doc, newName) => {
    const name = (newName || '').trim();
    if (!name) return;
    await base44.entities.ClaimDocument.update(doc.id, { file_name: name });
    refresh();
  };

  /**
   * Queues a file for removal. Whether the item's details were read off this very
   * file is worked out here, because that is what decides whether the removal can
   * offer to take the details with it. The item's state travels with the request
   * so the confirmation can report a payment without touching the claim.
   */
  const deleteFile = (item, doc, state) => {
    const entry = (claim?.invoice_tracker?.items || {})[item.key] || {};
    const detailsSource = entry.details_source || null;
    setPendingDelete({
      kind: 'invoice',
      item,
      state,
      docId: doc.id,
      fileUrl: doc.file_url,
      fileName: doc.file_name || 'this file',
      label: item.label,
      fromThisFile: !!detailsSource?.file_url && detailsSource.file_url === doc.file_url,
    });
  };

  /** Removes one filed file and refreshes what the claim shows. */
  const removeFile = async (docId) => {
    await base44.entities.ClaimDocument.delete(docId);
    refresh();
  };

  return {
    files: docs,
    filesFor,
    uploadFile,
    attachFile,
    uploadToItem,
    renameFile,
    deleteFile,
    removeFile,
    isUploading,
    viewingFile,
    setViewingFile,
    pendingDelete,
    setPendingDelete,
  };
}