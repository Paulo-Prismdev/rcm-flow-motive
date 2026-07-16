import React, { useState, useRef } from 'react';
import { X, Upload, Loader, Image, ZoomIn, Download } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import UploadProgressList from './UploadProgressList';
import ConfirmDialog from './ConfirmDialog';

export default function ImageAttachmentModal({ imageUrls = [], onAdd, onRemove, isOpen, onClose }) {
  const [viewingImage, setViewingImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageToRemove, setImageToRemove] = useState(null);
  const fileInputRef = useRef(null);

  const handleRemoveImage = (url) => {
    setImageToRemove(url);
  };

  const handleDownloadImage = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = (url.split('/').pop().split('?')[0]) || 'image.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(url, '_blank');
    }
  };

  const confirmRemoveImage = () => {
    if (imageToRemove && onRemove) {
      onRemove(imageToRemove);
    }
    setImageToRemove(null);
  };

  const { uploads, isUploading, uploadFiles, retryUpload } = useFileUpload({
    accept: 'image',
    onComplete: (urls) => { if (onAdd) onAdd(urls); },
  });

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    await uploadFiles(e.target.files);
    e.target.value = '';
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    await uploadFiles(e.dataTransfer.files);
  };

  return (
    <>
      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!imageToRemove}
        onClose={() => setImageToRemove(null)}
        onConfirm={confirmRemoveImage}
        title="Remove Image"
        message="Are you sure you want to remove this image? This action cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Lightbox */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setViewingImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/80"
            onClick={() => setViewingImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <button
            className="absolute top-4 right-16 text-white bg-black/50 rounded-full p-2 hover:bg-black/80"
            onClick={(e) => { e.stopPropagation(); handleDownloadImage(viewingImage); }}
            title="Download image"
          >
            <Download className="w-6 h-6" />
          </button>
          <img
            src={viewingImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <div>
              <h3 className="text-[18px] font-semibold text-gray-900 dark:text-white">Images</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {imageUrls.length} {imageUrls.length === 1 ? 'image' : 'images'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Upload Area */}
          <div className="px-8 pt-6 flex-shrink-0">
            <div
              className={`border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center transition-all cursor-pointer ${
                isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:border-gray-400 dark:hover:border-gray-600'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Loader className="w-6 h-6 animate-spin" />
                  <span className="text-sm">Uploading {uploads.filter(u => u.status === 'uploading').length} of {uploads.length}...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                  <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-500' : ''}`} />
                  <div>
                    <span className="text-sm font-medium">{isDragging ? 'Drop images here!' : 'Click or drag & drop images to upload'}</span>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">JPG, PNG, GIF, WebP supported</p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </div>
          </div>

          {/* Upload Progress */}
          {uploads.length > 0 && (
            <div className="px-8 pb-2 flex-shrink-0">
              <UploadProgressList uploads={uploads} onRetry={retryUpload} />
            </div>
          )}

          {/* Image Grid - Scrollable */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {imageUrls.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                <Image className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No images uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {imageUrls.map((url, index) => (
                  <div key={index} className="relative group rounded-lg overflow-hidden aspect-square bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <img
                      src={url}
                      alt={`Image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => setViewingImage(url)}
                        className="bg-white/90 text-black rounded-full p-1.5 hover:bg-white transition-colors"
                        title="View full size"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadImage(url)}
                        className="bg-white/90 text-black rounded-full p-1.5 hover:bg-white transition-colors"
                        title="Download image"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {onRemove && (
                        <button
                          onClick={() => handleRemoveImage(url)}
                          className="bg-red-500/90 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                          title="Remove image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}