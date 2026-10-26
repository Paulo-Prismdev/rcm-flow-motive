import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2, ZoomIn, ZoomOut, FileText, Maximize2, Minimize2 } from 'lucide-react';

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

const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
// The pages sit inside a p-3 scroll area, so this much of the viewer is not theirs.
const PAGE_PADDING = 24;

const clampScale = (value) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

/**
 * The instruction's pages, with whatever value is in focus highlighted where it sits.
 *
 * `fitWidth` opens the document showing the full width of a page — no page cut off at
 * the right-hand edge — and re-fits it whenever the viewer changes size, while leaving
 * a deliberate zoom alone. `allowFullscreen` hands the document the whole screen for
 * checking fine detail. Both are opt-in, so the other review screens keep their own
 * framing.
 */
export default function HighlightableDocumentViewer({ fileUrl, highlightText, fitWidth = false, allowFullscreen = false }) {
  const containerRef = useRef(null);
  const pageRefs = useRef([]);
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState([]);
  const [scale, setScale] = useState(1.3);
  const [highlights, setHighlights] = useState([]);
  const [isImage, setIsImage] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  // A page's true width at 100%, so the pages can be sized to the viewer.
  const naturalWidthRef = useRef(0);

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
          if (i === 1) naturalWidthRef.current = page.getViewport({ scale: 1 }).width;
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

  // The page is sized to the width the viewer actually has, so a whole page width is
  // readable without scrolling sideways. Re-runs when the viewer changes size (a new
  // document, or going full screen) but not when the reader zooms, so a deliberate
  // zoom-in stays where they put it.
  useEffect(() => {
    if (!fitWidth || !naturalWidthRef.current) return;
    const frame = requestAnimationFrame(() => {
      const available = (containerRef.current?.clientWidth || 0) - PAGE_PADDING;
      if (available <= 0) return;
      const target = clampScale(available / naturalWidthRef.current);
      setScale((current) => (Math.abs(target - current) > 0.01 ? target : current));
    });
    return () => cancelAnimationFrame(frame);
  }, [fitWidth, fileUrl, expanded, pageData.length]);

  // Full screen steps back out on Escape, so the document can never trap the reader.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e) => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

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

  // Zooming from a fitted page steps proportionally, so each click is the same jump
  // whether the reader is at 60% or 160%; viewers that open at a set scale keep the
  // fixed steps they have always had.
  const zoomOut = () => setScale((s) => (fitWidth ? clampScale(s / 1.25) : Math.max(MIN_SCALE, s - 0.3)));
  const zoomIn = () => setScale((s) => (fitWidth ? clampScale(s * 1.25) : Math.min(MAX_SCALE, s + 0.3)));
  const fitToWidth = () => {
    const available = (containerRef.current?.clientWidth || 0) - PAGE_PADDING;
    if (available > 0 && naturalWidthRef.current > 0) setScale(clampScale(available / naturalWidthRef.current));
  };

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

  const viewer = (
    <div className={expanded
      ? 'fixed inset-0 z-[10080] flex flex-col bg-gray-200 dark:bg-gray-950 p-2'
      : 'h-full flex flex-col bg-gray-200 dark:bg-gray-950'}>
      {/* Zoom controls */}
      <div className="flex items-center justify-center gap-1.5 py-1 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <button onClick={zoomOut} title="Zoom out" className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <ZoomOut className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <span className="text-xs text-gray-500 w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
        <button onClick={zoomIn} title="Zoom in" className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <ZoomIn className="w-3.5 h-3.5 text-gray-500" />
        </button>
        {fitWidth && (
          <button
            onClick={fitToWidth}
            title="Fit the whole page width in the viewer"
            className="ml-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Fit width
          </button>
        )}
        {allowFullscreen && (
          <button
            onClick={() => setExpanded(on => !on)}
            title={expanded ? 'Back to the review window' : 'Show the document full screen'}
            className="ml-1 p-1 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}
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

  // Full screen is rendered outside the review window, so the document gets the whole
  // screen rather than the pane it normally shares with the details.
  return expanded ? createPortal(viewer, document.body) : viewer;
}