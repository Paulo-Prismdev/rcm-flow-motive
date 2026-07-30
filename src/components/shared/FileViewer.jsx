import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FileViewer({ fileUrl, onClose }) {
  useEffect(() => {
    if (!fileUrl) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [fileUrl, onClose]);

  if (!fileUrl) return null;

  const getFileExtension = (url) => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.split('/').pop();
      const extension = fileName.split('.').pop()?.toLowerCase();
      return extension || '';
    } catch (e) {
      const extension = url.split('.').pop()?.toLowerCase();
      return extension || '';
    }
  };

  const extension = getFileExtension(fileUrl);
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);
  const isPDF = extension === 'pdf';

  return (
    <div 
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-screen h-screen bg-white dark:bg-gray-900 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">File Preview</h3>
          <Button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            variant="ghost"
            size="icon"
            className="hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
          {isImage ? (
            <img 
              src={fileUrl} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain"
            />
          ) : isPDF ? (
            <iframe 
              src={fileUrl} 
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          ) : (
            <div className="text-center p-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Preview not available for this file type
              </p>
              <Button
                onClick={() => window.open(fileUrl, '_blank')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Open in New Tab
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}