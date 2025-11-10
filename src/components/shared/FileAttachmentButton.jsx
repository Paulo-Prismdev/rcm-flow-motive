import React, { useState, useEffect } from 'react';
import { Paperclip, X, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FileViewer from './FileViewer';

export default function FileAttachmentButton({ fileUrls = [], onRemove, isOpen, onOpenChange }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);

  // Sync with external control if provided
  useEffect(() => {
    if (isOpen !== undefined) {
      setIsModalOpen(isOpen);
    }
  }, [isOpen]);

  const handleOpenChange = (open) => {
    setIsModalOpen(open);
    if (onOpenChange) {
      onOpenChange(open);
    }
  };

  const getFileName = (url) => {
    try {
      const urlObject = new URL(url);
      const path = urlObject.pathname;
      return path.substring(path.lastIndexOf('/') + 1);
    } catch (e) {
      return "File";
    }
  };

  const handleViewFile = (url) => {
    setViewingFile(url);
  };

  const handleCloseViewer = () => {
    setViewingFile(null);
  };

  return (
    <>
      <FileViewer fileUrl={viewingFile} onClose={handleCloseViewer} />
      
      <Button
        onClick={() => handleOpenChange(true)}
        className="neomorph-flat px-4 py-2 flex items-center gap-2 text-gray-600 relative"
      >
        <Paperclip className="w-4 h-4" />
        <span>Attachments</span>
        {fileUrls.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-gold text-black text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {fileUrls.length}
          </span>
        )}
      </Button>

      <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="neomorph-flat bg-[#1A1A1A] p-6 border-gold max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gold flex items-center gap-2">
              <Paperclip className="w-5 h-5" />
              Attachments ({fileUrls.length})
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {fileUrls.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No attachments yet. Drag and drop files anywhere on the screen to attach them.
              </p>
            ) : (
              fileUrls.map((url, index) => (
                <div key={index} className="neomorph-flat p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Paperclip className="w-4 h-4 flex-shrink-0 text-gray-500" />
                    <span className="truncate text-sm">{getFileName(url)}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewFile(url)}
                      className="h-8 w-8 hover:text-gold"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <a href={url} download target="_blank" rel="noopener noreferrer">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-gold"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                    {onRemove && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(url)}
                        className="h-8 w-8 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}