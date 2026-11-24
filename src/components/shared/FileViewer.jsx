import React, { useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FilePreviewContent from '@/components/shared/FilePreviewContent';
import {
  downloadFileObject, fetchStoredFile, resolveFileUrl, saveFileObject, savesThroughShareSheet,
} from '@/lib/privateFiles';
import { toast } from '@/components/ui/use-toast';

// `fileUrl` is the stored reference: a private file opens through a short-lived signed
// link and each opening is logged. `claimId` keeps the log entry on the right claim.
export default function FileViewer({ fileUrl, onClose, claimId }) {
  const returnFocusRef = useRef(null);
  const [saving, setSaving] = useState(false);
  // On a phone or tablet the copy is fetched as soon as the document opens, so that
  // Download can hand it straight to the share sheet inside the tap — a phone only
  // opens the share sheet from a tap, never after a wait. (Not logged as a download
  // until it is actually saved.)
  const prefetched = useRef(null);
  const shareSheet = savesThroughShareSheet();

  useEffect(() => {
    prefetched.current = null;
    if (!fileUrl || !shareSheet) return;
    const entry = { ref: fileUrl, file: null };
    entry.promise = fetchStoredFile(fileUrl, { claimId, log: false })
      .then(({ file }) => { entry.file = file; return file; })
      .catch(() => null);
    prefetched.current = entry;
  }, [fileUrl, claimId, shareSheet]);

  // The download goes on the claim's audit trail, as it always has.
  const logDownload = () => resolveFileUrl(fileUrl, { claimId, log: true, purpose: 'download' }).catch(() => {});

  const save = async (file) => {
    try {
      const outcome = await saveFileObject(file);
      if (outcome === 'downloaded') toast({ title: 'Downloaded', description: file.name });
    } catch (e) {
      if (e?.name === 'NotAllowedError') {
        // The phone wanted a fresh tap for the share sheet: the copy is ready now.
        prefetched.current = { ref: fileUrl, file, promise: Promise.resolve(file) };
        toast({ title: 'Ready to save', description: 'Tap Save again to save or share the document.' });
      } else {
        downloadFileObject(file);
      }
    }
  };

  const handleDownload = async () => {
    if (!fileUrl || saving) return;
    const entry = prefetched.current?.ref === fileUrl ? prefetched.current : null;
    if (entry?.file) {
      // Straight from the tap, so the share sheet is allowed to open.
      logDownload();
      await save(entry.file);
      return;
    }
    setSaving(true);
    try {
      let file = entry ? await entry.promise : null;
      if (!file) ({ file } = await fetchStoredFile(fileUrl, { claimId, log: false }));
      logDownload();
      await save(file);
    } catch {
      // The copy couldn't be fetched into the app: open it, so it can at least be saved
      // from the browser's own viewer.
      try {
        const href = await resolveFileUrl(fileUrl, { claimId, log: true, purpose: 'download' });
        window.open(href, '_blank', 'noopener');
      } catch {
        toast({ title: 'This file could not be downloaded', variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogPrimitive.Root open={!!fileUrl} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[2147483646] bg-background/90 backdrop-blur-sm" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[2147483647] flex flex-col overflow-hidden bg-card text-card-foreground shadow-2xl outline-none"
          onOpenAutoFocus={() => { returnFocusRef.current = document.activeElement; }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
          }}
          onPointerDownOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-shrink-0 items-center justify-between p-4 border-b border-border bg-muted">
            <DialogPrimitive.Title className="text-lg font-semibold">File Preview</DialogPrimitive.Title>
            <div className="flex items-center gap-2">
              {fileUrl && (
                <Button type="button" variant="outline" size="sm" onClick={handleDownload} disabled={saving} aria-label={shareSheet ? 'Save or share file' : 'Download file'}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>{shareSheet ? 'Save' : 'Download'}</span>
                </Button>
              )}
              <DialogPrimitive.Close asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="Close file preview">
                  <X className="w-5 h-5" />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>
          {fileUrl && <FilePreviewContent fileUrl={fileUrl} claimId={claimId} />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}