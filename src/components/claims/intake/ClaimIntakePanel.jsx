import React, { useState } from 'react';
import { FileText, Loader, Sparkles, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFileUpload } from '@/hooks/useFileUpload';
import UploadProgressList from '@/components/shared/UploadProgressList';

const fileName = (url) => {
  try {
    return decodeURIComponent(String(url).split('?')[0].split('/').pop() || 'document');
  } catch {
    return 'document';
  }
};

/**
 * The instruction coming in: as many files as there are (the claim form, emails
 * saved as PDF, damage photos) and/or the text of the instruction email pasted
 * in. Everything is read together into one set of claim details.
 */
export default function ClaimIntakePanel({ onRead, isReading = false, error = null }) {
  const [fileUrls, setFileUrls] = useState([]);
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const { uploads, isUploading, uploadFiles, retryUpload } = useFileUpload({
    onComplete: (urls) => setFileUrls((prev) => [...prev, ...urls]),
  });

  const handleFiles = (files) => uploadFiles(files);

  const canRead = (fileUrls.length > 0 || pastedText.trim().length > 0) && !isReading && !isUploading;

  return (
    <div className="w-full space-y-3">
      <div
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
        className={`rounded-xl border-2 border-dashed p-4 text-center transition-colors ${isDragging ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-border'}`}
      >
        <label htmlFor="intake-upload" className="cursor-pointer block">
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            {isUploading ? (
              <>
                <Loader className="w-6 h-6 animate-spin" />
                <p className="text-xs">Uploading {uploads.filter((u) => u.status === 'uploading').length} of {uploads.length}...</p>
              </>
            ) : (
              <>
                <Upload className={`w-6 h-6 ${isDragging ? 'text-purple-600' : ''}`} />
                <p className="text-sm font-medium text-foreground">{isDragging ? 'Drop the files here' : 'Upload the instruction'}</p>
                <p className="text-[11px]">Claim form, emails saved as PDF, damage photos — as many as you have</p>
              </>
            )}
          </div>
          <input id="intake-upload" type="file" multiple className="sr-only" onChange={(e) => handleFiles(e.target.files)} disabled={isUploading} />
        </label>
      </div>

      {uploads.length > 0 && <UploadProgressList uploads={uploads} onRetry={retryUpload} />}

      {fileUrls.length > 0 && (
        <div className="space-y-1">
          {fileUrls.map((url) => (
            <div key={url} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-muted/30">
              <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs truncate flex-1 min-w-0">{fileName(url)}</span>
              <button type="button" onClick={() => setFileUrls((prev) => prev.filter((u) => u !== url))} className="p-1 rounded text-muted-foreground hover:text-red-500 flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-muted-foreground">and/or paste the text of the instruction email</label>
        <textarea
          rows={3}
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Paste the whole email here — the dates, references and third party details are read from it."
          className="w-full text-xs rounded-lg border border-input bg-card text-foreground p-2 resize-y"
        />
      </div>

      {error && <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>}

      <Button
        type="button"
        disabled={!canRead}
        onClick={() => onRead({ fileUrls, pastedText })}
        className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white"
      >
        {isReading ? <><Loader className="w-4 h-4 animate-spin" /> Reading the instruction...</> : <><Sparkles className="w-4 h-4" /> Read &amp; set up the claim</>}
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">Nothing is added to the claim until you check the reading and confirm it.</p>
    </div>
  );
}