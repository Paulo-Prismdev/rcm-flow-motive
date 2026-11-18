import React from 'react';
import { Button } from '@/components/ui/button';
import withResolvedFile from './withResolvedFile';
import { HighlightableDocumentViewerInner } from './HighlightableDocumentViewer';

/**
 * Phones and tablets — above all the installed app — can't show a PDF inside a frame:
 * Android hands it to another app (so it seems to open behind the screen) and an
 * iPhone shows it blank or only its first page. There the pages are drawn in the app
 * itself instead, sized to the screen, with zoom. A desktop keeps the browser's own
 * PDF viewer, with its search and print.
 */
const drawPdfPages = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches
    || window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(max-width: 1023px)').matches;
};

function FilePreviewContentInner({ fileUrl, fileExt }) {
  const extension = fileExt || fileUrl.split(/[?#]/)[0].split('.').pop()?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);

  if (extension === 'pdf' && drawPdfPages()) {
    return (
      <div className="flex-1 min-h-0 w-full">
        <HighlightableDocumentViewerInner fileUrl={fileUrl} fileExt="pdf" fitWidth noIframe />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-muted flex items-center justify-center">
      {isImage ? (
        <img src={fileUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
      ) : extension === 'pdf' ? (
        <iframe src={fileUrl} className="w-full h-full border-0" title="PDF Preview" />
      ) : (
        <div className="text-center p-8">
          <p className="text-muted-foreground mb-4">Preview not available for this file type</p>
          <Button type="button" onClick={() => window.open(fileUrl, '_blank', 'noopener')}>
            Open in New Tab
          </Button>
        </div>
      )}
    </div>
  );
}

// Takes a stored reference (private or public) and opens it through a signed link.
export default withResolvedFile(FilePreviewContentInner);
