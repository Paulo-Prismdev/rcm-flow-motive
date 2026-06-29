import React from 'react';
import { FileText } from 'lucide-react';

export default function DocumentPreview({ fileUrl }) {
  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
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

  const ext = getExtension(fileUrl);
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  const isPDF = ext === 'pdf';

  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
      {isImage ? (
        <img src={fileUrl} alt="Document" className="max-w-full max-h-full object-contain" />
      ) : isPDF ? (
        <iframe src={fileUrl} className="w-full h-full border-0" title="Document Preview" />
      ) : (
        <div className="text-center p-4">
          <FileText className="w-10 h-10 mx-auto mb-2 text-gray-400" />
          <p className="text-xs text-gray-500 mb-2">Preview not available for this file type</p>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
            Open in New Tab →
          </a>
        </div>
      )}
    </div>
  );
}