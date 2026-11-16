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
                ? 'bg-danger-bg border-danger/30'
                : isDone
                ? 'bg-success-bg border-success/30'
                : 'bg-muted border-border'
            }`}
          >
            <div className="flex-shrink-0">
              {isUploading && <Loader className="w-4 h-4 text-info-fg animate-spin" />}
              {isDone && <CheckCircle2 className="w-4 h-4 text-success-fg" />}
              {isFailed && <AlertCircle className="w-4 h-4 text-danger-fg" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                  {!isImage && <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                  {isImage && <ImageIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                  {item.name}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {item.size}
                </span>
              </div>

              {/* Progress bar */}
              {isUploading && (
                <div className="w-full h-1.5 bg-accent rounded-full overflow-hidden">
                  <div
                    className="h-full bg-info rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}

              {/* Status text */}
              {isUploading && (
                <p className="text-xs text-muted-foreground mt-1">
                  Uploading... {item.progress}%
                </p>
              )}
              {isDone && (
                <p className="text-xs text-success-fg mt-0.5">Uploaded successfully</p>
              )}
              {isFailed && (
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-danger-fg truncate">{item.error}</p>
                  {onRetry && (
                    <button
                      onClick={() => onRetry(item.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-danger hover:bg-danger text-on-solid text-xs font-medium transition-colors flex-shrink-0"
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