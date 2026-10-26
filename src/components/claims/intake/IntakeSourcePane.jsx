import React, { useEffect, useRef } from 'react';
import { FileText, Mail } from 'lucide-react';
import HighlightableDocumentViewer from '@/components/shared/HighlightableDocumentViewer';

const fileName = (url) => {
  try {
    return decodeURIComponent(String(url).split('?')[0].split('/').pop() || 'document');
  } catch {
    return 'document';
  }
};

/**
 * The instruction beside the values read off it: the uploaded files and the
 * pasted email, with whatever value is in focus highlighted where it sits.
 */
export default function IntakeSourcePane({ files = [], pastedText = '', highlightText = '', activeIndex = 0, onActivate }) {
  const isPasted = activeIndex >= files.length;
  const scrollRef = useRef(null);
  const matchRef = useRef(null);

  useEffect(() => {
    if (isPasted && matchRef.current && scrollRef.current) {
      matchRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isPasted, highlightText, activeIndex]);

  const renderPasted = () => {
    const needle = String(highlightText || '').trim();
    if (!needle || needle.length < 2) return pastedText;
    const lower = pastedText.toLowerCase();
    const lowerNeedle = needle.toLowerCase();
    const parts = [];
    let cursor = 0;
    let index = lower.indexOf(lowerNeedle);
    let first = true;
    while (index !== -1) {
      parts.push(pastedText.slice(cursor, index));
      const chunk = pastedText.slice(index, index + needle.length);
      parts.push(
        <mark
          key={index}
          ref={first ? matchRef : undefined}
          className="bg-yellow-200 dark:bg-yellow-700/50 text-foreground rounded px-0.5 font-semibold"
        >
          {chunk}
        </mark>
      );
      first = false;
      cursor = index + needle.length;
      index = lower.indexOf(lowerNeedle, cursor);
    }
    parts.push(pastedText.slice(cursor));
    return parts;
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {(files.length > 0 || pastedText) && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/40 border-b border-border overflow-x-auto flex-shrink-0">
          {files.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => onActivate(index)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors ${
                activeIndex === index ? 'bg-purple-600 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <FileText className="w-3 h-3" /> {fileName(url)}
            </button>
          ))}
          {pastedText && (
            <button
              type="button"
              onClick={() => onActivate(files.length)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors ${
                isPasted ? 'bg-purple-600 text-white' : 'bg-card border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <Mail className="w-3 h-3" /> Pasted email
            </button>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0">
        {isPasted ? (
          <div ref={scrollRef} className="h-full overflow-auto bg-muted/20 p-3">
            <pre className="whitespace-pre-wrap break-words font-sans text-[11px] leading-relaxed text-foreground">{renderPasted()}</pre>
          </div>
        ) : (
          <HighlightableDocumentViewer fileUrl={files[activeIndex]} highlightText={highlightText} fitWidth allowFullscreen />
        )}
      </div>
    </div>
  );
}