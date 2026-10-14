import React, { useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FilePreviewContent from '@/components/shared/FilePreviewContent';

export default function FileViewer({ fileUrl, onClose }) {
  const returnFocusRef = useRef(null);

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
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Close file preview">
                <X className="w-5 h-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>
          {fileUrl && <FilePreviewContent fileUrl={fileUrl} />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}