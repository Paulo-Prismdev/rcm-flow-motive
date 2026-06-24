import { useState, useCallback } from 'react';
import { appParams } from '@/lib/app-params';
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

/**
 * Uploads a file using XMLHttpRequest to get real upload progress events.
 * Replaces the base44 SDK's axios-based call (which can't report progress).
 */
function uploadFileWithProgress(file, onProgress) {
  return new Promise((resolve, reject) => {
    const { serverUrl, appId, token } = appParams;
    const authToken = token || localStorage.getItem('base44_access_token');

    const formData = new FormData();
    formData.append('file', file, file.name);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${serverUrl}/api/apps/${appId}/integration-endpoints/Core/UploadFile`);
    xhr.setRequestHeader('X-App-Id', String(appId));
    if (authToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          const errData = JSON.parse(xhr.responseText);
          msg = errData.detail || errData.message || msg;
        } catch { /* use default */ }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.timeout = 300000; // 5 minutes — generous for slow connections / large batches

    xhr.send(formData);
  });
}

export function useFileUpload({ onComplete, accept = 'all', label = 'file' } = {}) {
  const [uploads, setUploads] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const updateUpload = useCallback((id, patch) => {
    setUploads(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
  }, []);

  const uploadSingleFile = useCallback(async (file) => {
    const uploadId = genId();
    const fileLabel = file.name || label;
    const sizeLabel = formatFileSize(file.size);

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

    try {
      const result = await uploadFileWithProgress(file, (progress) => {
        updateUpload(uploadId, { progress });
      });
      updateUpload(uploadId, { status: 'done', progress: 100, url: result.file_url });
      return result.file_url;
    } catch (error) {
      const errorMsg = error?.message || 'Upload failed';
      updateUpload(uploadId, { status: 'failed', error: errorMsg });
      toast({
        title: 'Upload failed',
        description: `${fileLabel} — ${errorMsg}. Tap retry to try again.`,
        variant: 'destructive',
      });
      return null;
    }
  }, [updateUpload, label]);

  const retryUpload = useCallback(async (uploadId) => {
    const uploadEntry = uploads.find(u => u.id === uploadId);
    if (!uploadEntry?.file) return;

    updateUpload(uploadId, { status: 'uploading', progress: 0, error: undefined });

    try {
      const result = await uploadFileWithProgress(uploadEntry.file, (progress) => {
        updateUpload(uploadId, { progress });
      });
      updateUpload(uploadId, { status: 'done', progress: 100, url: result.file_url, error: undefined });
      toast({
        title: 'Upload complete',
        description: `${uploadEntry.name} uploaded successfully.`,
      });
      return result.file_url;
    } catch (error) {
      const errorMsg = error?.message || 'Upload failed';
      updateUpload(uploadId, { status: 'failed', error: errorMsg });
      toast({
        title: 'Retry failed',
        description: `${uploadEntry.name} — ${errorMsg}`,
        variant: 'destructive',
      });
      return null;
    }
  }, [uploads, updateUpload]);

  const uploadFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return [];

    let fileArray = Array.from(files);

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

    // Upload with limited concurrency to avoid bandwidth contention and timeouts
    const MAX_CONCURRENT = 3;
    const results = [];
    let index = 0;

    async function runNext() {
      while (index < fileArray.length) {
        const currentIndex = index++;
        const url = await uploadSingleFile(fileArray[currentIndex]);
        results[currentIndex] = url;
      }
    }

    const workers = Array.from({ length: Math.min(MAX_CONCURRENT, fileArray.length) }, () => runNext());
    await Promise.all(workers);

    const successfulUrls = results.filter(url => url !== null);

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
    setUploads([]);
  }, []);

  return {
    uploads,
    isUploading,
    uploadFiles,
    retryUpload,
    clearUploads,
    formatFileSize,
  };
}