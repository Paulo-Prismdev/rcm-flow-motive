import React, { useRef } from 'react';

/**
 * Grabber for a bottom sheet. Dragging it down moves the sheet with the finger
 * and closes it once the swipe passes the threshold; a simple tap also closes.
 * Desktop is unaffected — the pointer handlers only ever fire from a real
 * interaction on the handle.
 */
export default function SheetDragHandle({
  onClose,
  targetRef,
  className = 'py-2',
  barClassName = 'h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-600',
}) {
  const startY = useRef(0);
  const dy = useRef(0);
  const dragging = useRef(false);

  const handlePointerDown = (e) => {
    dragging.current = true;
    startY.current = e.clientY;
    dy.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
    const sheet = targetRef?.current;
    if (sheet) sheet.style.transition = 'none';
  };

  const handlePointerMove = (e) => {
    if (!dragging.current) return;
    dy.current = Math.max(0, e.clientY - startY.current);
    const sheet = targetRef?.current;
    if (sheet) sheet.style.transform = `translateY(${dy.current}px)`;
  };

  const handlePointerEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const sheet = targetRef?.current;
    const shouldClose = dy.current > 60;
    if (sheet) {
      sheet.style.transition = 'transform 200ms ease-out';
      sheet.style.transform = '';
      window.setTimeout(() => {
        if (sheet) sheet.style.transition = '';
      }, 220);
    }
    if (shouldClose) onClose?.();
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onClick={() => {
        if (dy.current < 8) onClose?.();
      }}
      className={`flex justify-center touch-none cursor-grab active:cursor-grabbing ${className}`}
    >
      <span className={barClassName} />
    </div>
  );
}