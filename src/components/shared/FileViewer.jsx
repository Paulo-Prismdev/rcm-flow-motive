import React, { useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FilePreviewContent from '@/components/shared/FilePreviewContent';

export default function FileViewer({ fileUrl, onClose }) {
  const returnFocusRef = useRef(null);

  const handleDownload = () => {
    if (!fileUrl) return;
    const fileName = fileUrl.split(/[?#]/)[0].split('/').pop() || 'download';
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
                <Button type="button" variant="outline" size="sm" onClick={handleDownload} aria-label="Download file">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Download</span>
                </Button>
              )}
              <DialogPrimitive.Close asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="Close file preview">
                  <X className="w-5 h-5" />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>
          {fileUrl && <FilePreviewContent fileUrl={fileUrl} />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}