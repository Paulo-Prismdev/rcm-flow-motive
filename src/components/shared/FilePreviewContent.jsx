import React from 'react';
import { Button } from '@/components/ui/button';

export default function FilePreviewContent({ fileUrl }) {
  const extension = fileUrl.split(/[?#]/)[0].split('.').pop()?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-muted flex items-center justify-center">
      {isImage ? (
        <img src={fileUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
      ) : extension === 'pdf' ? (
        <iframe src={fileUrl} className="w-full h-full border-0" title="PDF Preview" />
      ) : (
        <div className="text-center p-8">
          <p className="text-muted-foreground mb-4">Preview not available for this file type</p>
          <Button type="button" onClick={() => window.open(fileUrl, '_blank')}>
            Open in New Tab
          </Button>
        </div>
      )}
    </div>
  );
}