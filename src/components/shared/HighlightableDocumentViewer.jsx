import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2, ZoomIn, ZoomOut, FileText } from 'lucide-react';

// Use CDN-hosted worker matching the installed pdfjs-dist version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

function getExtension(url) {
  try {
    const urlObj = new URL(url);
    const fileName = urlObj.pathname.split('/').pop();
    return fileName.split('.').pop()?.toLowerCase() || '';
  } catch {
    return url.split('.').pop()?.toLowerCase() || '';
  }
}

export default function HighlightableDocumentViewer({ fileUrl, highlightText }) {
  const containerRef = useRef(null);
  const pageRefs = useRef([]);
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState([]);
  const [scale, setScale] = useState(1.3);
  const [highlights, setHighlights] = useState([]);
  const [isImage, setIsImage] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [error, setError] = useState(null);

  // Load & render PDF pages
  useEffect(() => {
    if (!fileUrl) return;
    let cancelled = false;
    setLoading(true);
    setPageData([]);
    setHighlights([]);
    setError(null);
    setUseIframeFallback(false);
    pageRefs.current = [];

    const ext = getExtension(fileUrl);
    if (ext !== 'pdf') {
      setIsImage(true);
      setLoading(false);
      return;
    }
    setIsImage(false);

    (async () => {
      try {
        // Fetch the PDF as an ArrayBuffer first — this avoids CORS issues
        // with pdf.js trying to fetch via XHR internally
        const response = await fetch(fileUrl, { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        const pages = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: ctx, viewport }).promise;

          const textContent = await page.getTextContent();
          const textItems = textContent.items.map(item => {
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
            const fontHeight = Math.hypot(tx[2], tx[3]) || 12 * scale;
            return {
              str: item.str,
              x: tx[4],
              y: tx[5] - fontHeight,
              w: Math.abs(item.width * tx[0]) || 50,
              h: fontHeight,
            };
          });

          pages.push({
            dataUrl: canvas.toDataURL(),
            width: viewport.width,
            height: viewport.height,
            textItems,
          });
        }
        if (!cancelled) {
          setPageData(pages);
          setLoading(false);
        }
      } catch (err) {
        console.error('PDF render error:', err);
        if (!cancelled) {
          // If pdf.js rendering fails, fall back to iframe
          setUseIframeFallback(true);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [fileUrl, scale]);

  // Search text layer & highlight matching regions
  useEffect(() => {
    if (!pageData.length) {
      setHighlights([]);
      return;
    }

    const searchStr = highlightText != null ? String(highlightText).trim() : '';
    if (searchStr.length < 2) {
      setHighlights([]);
      return;
    }

    const lowerSearch = searchStr.toLowerCase();
    const newHighlights = [];
    let firstHighlightPage = null;

    pageData.forEach((page, pageIndex) => {
      let fullText = '';
      const itemRanges = [];
      page.textItems.forEach(item => {
        const start = fullText.length;
        fullText += item.str;
        itemRanges.push({ start, end: fullText.length, item });
      });

      const lowerText = fullText.toLowerCase();
      let searchStart = 0;
      while (searchStart < lowerText.length) {
        const idx = lowerText.indexOf(lowerSearch, searchStart);
        if (idx === -1) break;
        const matchEnd = idx + lowerSearch.length;
        itemRanges.forEach(({ start, end, item }) => {
          if (end > idx && start < matchEnd) {
            newHighlights.push({ pageIndex, x: item.x, y: item.y, w: item.w, h: item.h });
            if (firstHighlightPage === null) firstHighlightPage = pageIndex;
          }
        });
        searchStart = matchEnd;
      }
    });

    setHighlights(newHighlights);

    // Auto-scroll to first match
    if (firstHighlightPage !== null) {
      setTimeout(() => {
        const el = pageRefs.current[firstHighlightPage];
        if (el && containerRef.current) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  }, [highlightText, pageData]);

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-950">
        <div className="text-center">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-xs text-gray-400">No document to display</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto mb-2" />
          <p className="text-xs text-gray-500">Loading document...</p>
        </div>
      </div>
    );
  }

  // Fallback: native PDF viewer via iframe (no highlighting, but always works)
  if (useIframeFallback) {
    return (
      <div className="h-full flex flex-col bg-gray-200 dark:bg-gray-950">
        <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 flex-shrink-0">
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            Document loaded in basic mode — highlighting unavailable for this file type
          </p>
        </div>
        <iframe src={fileUrl} className="w-full flex-1 border-0" title="Document Preview" />
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="h-full overflow-auto bg-gray-100 dark:bg-gray-950" ref={containerRef}>
        <img src={fileUrl} alt="Document" className="max-w-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-200 dark:bg-gray-950">
      {/* Zoom controls */}
      <div className="flex items-center justify-center gap-2 py-1 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <button onClick={() => setScale(s => Math.max(0.5, s - 0.3))} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <ZoomOut className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <span className="text-xs text-gray-500 w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(s => Math.min(3, s + 0.3))} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <ZoomIn className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>
      {/* Pages */}
      <div ref={containerRef} className="flex-1 overflow-auto p-3">
        {pageData.map((page, idx) => (
          <div
            key={idx}
            ref={el => pageRefs.current[idx] = el}
            className="relative mx-auto mb-3 shadow-lg bg-white"
            style={{ width: page.width, height: page.height }}
          >
            <img src={page.dataUrl} alt={`Page ${idx + 1}`} className="block" style={{ width: page.width, height: page.height }} />
            {highlights.filter(h => h.pageIndex === idx).map((h, i) => (
              <div
                key={i}
                className="absolute border-2 border-purple-500 bg-purple-400/30 pointer-events-none rounded-sm"
                style={{ left: h.x, top: h.y, width: h.w, height: h.h }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}