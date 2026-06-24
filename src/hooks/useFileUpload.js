import { useState, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function useFileUpload({ onComplete, accept = 'all', label = 'file' } = {}) {
  const [uploads, setUploads] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const progressTimers = useRef(new Map());

  const updateUpload = useCallback((id, patch) => {
    setUploads(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
  }, []);

  const clearTimers = useCallback((id) => {
    const timer = progressTimers.current.get(id);
    if (timer) {
      clearInterval(timer);
      progressTimers.current.delete(id);
    }
  }, []);

  const simulateProgress = useCallback((id, fileSize) => {
    // Estimate upload duration: ~2s per MB, minimum 1.5s
    const estimatedMs = Math.max(1500, (fileSize / (1024 * 1024)) * 2000);
    const intervalMs = 200;
    const totalSteps = estimatedMs / intervalMs;
    // We animate to 90% — the remaining 10% resolves on actual completion
    const incrementPerStep = 90 / totalSteps;

    let current = 0;
    const timer = setInterval(() => {
      current += incrementPerStep;
      // Slow down as we approach 90% so it doesn't slam to 90 instantly
      const eased = current < 70 ? current : 70 + (current - 70) * 0.3;
      if (eased >= 90) {
        updateUpload(id, { progress: 90 });
        clearTimers(id);
      } else {
        updateUpload(id, { progress: Math.round(eased) });
      }
    }, intervalMs);
    progressTimers.current.set(id, timer);
  }, [updateUpload, clearTimers]);

  const uploadSingleFile = useCallback(async (file) => {
    const uploadId = genId();
    const fileLabel = file.name || label;
    const sizeLabel = formatFileSize(file.size);

    // Size validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const entry = {
        id: uploadId,
        name: fileLabel,
        size: sizeLabel,
        status: 'failed',
        error: `File exceeds ${MAX_FILE_SIZE_MB}MB limit`,
        progress: 0,
        file,
      };
      setUploads(prev => [...prev, entry]);
      toast({
        title: 'File too large',
        description: `${fileLabel} (${sizeLabel}) exceeds the ${MAX_FILE_SIZE_MB}MB limit. Please compress or use a smaller file.`,
        variant: 'destructive',
      });
      return null;
    }

    const entry = {
      id: uploadId,
      name: fileLabel,
      size: sizeLabel,
      status: 'uploading',
      progress: 0,
      file,
    };
    setUploads(prev => [...prev, entry]);
    simulateProgress(uploadId, file.size);

    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      clearTimers(uploadId);
      updateUpload(uploadId, { status: 'done', progress: 100, url: result.file_url });
      return result.file_url;
    } catch (error) {
      clearTimers(uploadId);
      const errorMsg = error?.response?.data?.message || error?.message || 'Upload failed';
      updateUpload(uploadId, { status: 'failed', error: errorMsg });
      toast({
        title: 'Upload failed',
        description: `${fileLabel} — ${errorMsg}. Tap retry to try again.`,
        variant: 'destructive',
      });
      return null;
    }
  }, [updateUpload, clearTimers, simulateProgress, label]);

  const retryUpload = useCallback(async (uploadId) => {
    const uploadEntry = uploads.find(u => u.id === uploadId);
    if (!uploadEntry?.file) return;

    updateUpload(uploadId, { status: 'uploading', progress: 0, error: undefined });
    simulateProgress(uploadId, uploadEntry.file.size);

    try {
      const result = await base44.integrations.Core.UploadFile({ file: uploadEntry.file });
      clearTimers(uploadId);
      updateUpload(uploadId, { status: 'done', progress: 100, url: result.file_url, error: undefined });
      toast({
        title: 'Upload complete',
        description: `${uploadEntry.name} uploaded successfully.`,
      });
      return result.file_url;
    } catch (error) {
      clearTimers(uploadId);
      const errorMsg = error?.response?.data?.message || error?.message || 'Upload failed';
      updateUpload(uploadId, { status: 'failed', error: errorMsg });
      toast({
        title: 'Retry failed',
        description: `${uploadEntry.name} — ${errorMsg}`,
        variant: 'destructive',
      });
      return null;
    }
  }, [uploads, updateUpload, clearTimers, simulateProgress]);

  const uploadFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return [];

    let fileArray = Array.from(files);

    // Filter by accepted type if specified
    if (accept === 'image') {
      fileArray = fileArray.filter(f => f.type.startsWith('image/'));
      if (fileArray.length === 0) {
        toast({
          title: 'No valid images',
          description: 'Please select image files only (JPG, PNG, GIF, WebP).',
          variant: 'destructive',
        });
        return [];
      }
    }

    setIsUploading(true);
    const successfulUrls = [];

    for (const file of fileArray) {
      const url = await uploadSingleFile(file);
      if (url) successfulUrls.push(url);
    }

    const failedCount = fileArray.length - successfulUrls.length;
    if (successfulUrls.length > 0 && onComplete) {
      onComplete(successfulUrls);
    }

    if (successfulUrls.length > 0 && failedCount === 0) {
      toast({
        title: 'Upload complete',
        description: `${successfulUrls.length} ${successfulUrls.length === 1 ? 'file' : 'files'} uploaded successfully.`,
      });
    } else if (successfulUrls.length > 0 && failedCount > 0) {
      toast({
        title: 'Upload partially complete',
        description: `${successfulUrls.length} succeeded, ${failedCount} failed.`,
        variant: 'destructive',
      });
    }

    setIsUploading(false);
    return successfulUrls;
  }, [uploadSingleFile, onComplete]);

  const clearUploads = useCallback(() => {
    progressTimers.current.forEach((_, id) => clearTimers(id));
    setUploads([]);
  }, [clearTimers]);

  return {
    uploads,
    isUploading,
    uploadFiles,
    retryUpload,
    clearUploads,
    formatFileSize,
  };
}