import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Loader } from 'lucide-react';

export default function DragDropOverlay({ onFilesUploaded, children }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we're leaving the window bounds
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      setIsDragging(false);
    }
  }, []);

  const handleDragEnd = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setIsUploading(true);
    const uploadedUrls = [];

    try {
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(result.file_url);
      }
      onFilesUploaded(uploadedUrls);
    } catch (error) {
      console.error("File upload failed:", error);
      alert("Failed to upload files. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, [onFilesUploaded]);

  // Global event listeners to handle dragging outside the window
  useEffect(() => {
    const handleWindowDragOver = (e) => {
      e.preventDefault();
    };

    const handleWindowDragLeave = (e) => {
      // If drag leaves the entire document
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDragging(false);
      }
    };

    const handleWindowDrop = (e) => {
      e.preventDefault();
      setIsDragging(false);
    };

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);
    window.addEventListener('dragend', handleDragEnd);

    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
      window.removeEventListener('dragend', handleDragEnd);
    };
  }, [handleDragEnd]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative h-full"
    >
      {children}
      
      {(isDragging || isUploading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm">
          <div className="neomorph-flat bg-[#1A1A1A] p-12 border-gold border-2 border-dashed rounded-2xl pointer-events-none">
            <div className="flex flex-col items-center gap-4">
              {isUploading ? (
                <>
                  <Loader className="w-16 h-16 text-gold animate-spin" />
                  <p className="text-xl font-bold text-gold">Uploading files...</p>
                </>
              ) : (
                <>
                  <Upload className="w-16 h-16 text-gold" />
                  <p className="text-xl font-bold text-gold">Drop files here to attach</p>
                  <p className="text-sm text-gray-500">Release to upload files to this job</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}