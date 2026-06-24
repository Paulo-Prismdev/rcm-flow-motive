import React from 'react';
import { Loader, CheckCircle2, AlertCircle, RotateCcw, FileText, Image as ImageIcon } from 'lucide-react';

export default function UploadProgressList({ uploads, onRetry }) {
  if (!uploads || uploads.length === 0) return null;

  return (
    <div className="space-y-2">
      {uploads.map((item) => {
        const isUploading = item.status === 'uploading';
        const isDone = item.status === 'done';
        const isFailed = item.status === 'failed';
        const isImage = item.file?.type?.startsWith('image/');

        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
              isFailed
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : isDone
                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50'
                : 'bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex-shrink-0">
              {isUploading && <Loader className="w-4 h-4 text-blue-500 animate-spin" />}
              {isDone && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {isFailed && <AlertCircle className="w-4 h-4 text-red-500" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex items-center gap-1.5">
                  {!isImage && <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                  {isImage && <ImageIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                  {item.name}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {item.size}
                </span>
              </div>

              {/* Progress bar */}
              {isUploading && (
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}

              {/* Status text */}
              {isUploading && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Uploading... {item.progress}%
                </p>
              )}
              {isDone && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Uploaded successfully</p>
              )}
              {isFailed && (
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-red-500 dark:text-red-400 truncate">{item.error}</p>
                  {onRetry && (
                    <button
                      onClick={() => onRetry(item.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors flex-shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}