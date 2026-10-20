import React, { useRef } from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';

const DAMPING = 0.5;   // drag distance is halved so the pull feels weighted
const THRESHOLD = 64;  // pull needed before the refresh fires
const MAX_PULL = 96;   // furthest the content can be dragged
const HOLD = 46;       // indicator height held while refreshing

/**
 * Pull-down-to-refresh for phone lists.
 * The element it renders is the list's own scroll container, so the list page
 * scrolls as one page and the drag is only picked up at the very top.
 * The pull distance is written straight to the DOM so dragging never
 * re-renders the list underneath.
 */
export default function PullToRefresh({ onRefresh, children, className = '', ...rest }) {
  const rootRef = useRef(null);
  const contentRef = useRef(null);
  const indicatorRef = useRef(null);
  const labelRef = useRef(null);
  const arrowRef = useRef(null);
  const spinRef = useRef(null);
  const startY = useRef(0);
  const pull = useRef(0);
  const dragging = useRef(false);
  const refreshing = useRef(false);

  const paint = (distance, animate) => {
    const content = contentRef.current;
    const indicator = indicatorRef.current;
    if (!content || !indicator) return;
    indicator.style.transition = animate ? 'height 200ms ease' : 'none';
    content.style.transition = animate ? 'transform 200ms ease' : 'none';
    indicator.style.height = `${distance}px`;
    content.style.transform = `translateY(${distance}px)`;
  };

  const setBusy = (busy) => {
    if (labelRef.current) labelRef.current.textContent = busy ? 'Refreshing…' : 'Pull to refresh';
    if (arrowRef.current) arrowRef.current.classList.toggle('hidden', busy);
    if (spinRef.current) spinRef.current.classList.toggle('hidden', !busy);
  };

  const handleTouchStart = (e) => {
    if (refreshing.current) return;
    if ((rootRef.current?.scrollTop || 0) > 0) return;
    dragging.current = true;
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (!dragging.current || refreshing.current) return;
    if ((rootRef.current?.scrollTop || 0) > 0) {
      dragging.current = false;
      pull.current = 0;
      paint(0, true);
      return;
    }
    const delta = (e.touches[0].clientY - startY.current) * DAMPING;
    pull.current = Math.max(0, Math.min(MAX_PULL, delta));
    paint(pull.current, false);
    if (labelRef.current && pull.current > 0) {
      labelRef.current.textContent = pull.current >= THRESHOLD ? 'Release to refresh' : 'Pull to refresh';
    }
  };

  const handleTouchEnd = async () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (pull.current < THRESHOLD || refreshing.current) {
      pull.current = 0;
      paint(0, true);
      setBusy(false);
      return;
    }
    refreshing.current = true;
    setBusy(true);
    paint(HOLD, true);
    try {
      await onRefresh?.();
    } finally {
      refreshing.current = false;
      pull.current = 0;
      paint(0, true);
      setBusy(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      {...rest}
    >
      <div
        ref={indicatorRef}
        className="absolute left-0 right-0 top-0 z-30 flex items-end justify-center overflow-hidden pointer-events-none"
        style={{ height: 0 }}
      >
        <span className="flex items-center gap-1.5 pb-2 text-[11px] text-gray-400">
          <ArrowDown ref={arrowRef} className="w-3.5 h-3.5" />
          <Loader2 ref={spinRef} className="w-3.5 h-3.5 animate-spin hidden" />
          <span ref={labelRef}>Pull to refresh</span>
        </span>
      </div>
      <div ref={contentRef} data-list-inner className="flex flex-col h-full">
        {children}
      </div>
    </div>
  );
}