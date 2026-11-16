import React from 'react';
import { FileText } from 'lucide-react';
import withResolvedFile from './withResolvedFile';

function DocumentPreviewInner({ fileUrl, fileExt }) {
  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-xs">No document to display</p>
        </div>
      </div>
    );
  }

  const getExtension = (url) => {
    try {
      const urlObj = new URL(url);
      const fileName = urlObj.pathname.split('/').pop();
      return fileName.split('.').pop()?.toLowerCase() || '';
    } catch {
      return url.split('.').pop()?.toLowerCase() || '';
    }
  };

  const ext = fileExt || getExtension(fileUrl);
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  const isPDF = ext === 'pdf';

  return (
    <div className="w-full h-full bg-muted flex items-center justify-center">
      {isImage ? (
        <img src={fileUrl} alt="Document" className="max-w-full max-h-full object-contain" />
      ) : isPDF ? (
        <iframe src={fileUrl} className="w-full h-full border-0" title="Document Preview" />
      ) : (
        <div className="text-center p-4">
          <FileText className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs text-muted-foreground mb-2">Preview not available for this file type</p>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-info-fg hover:underline text-xs">
            Open in New Tab →
          </a>
        </div>
      )}
    </div>
  );
}

// Takes a stored reference (private or public) and opens it through a signed link.
export default withResolvedFile(DocumentPreviewInner);
