import React, { useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

/**
 * A review window that sits over the whole app rather than inside whatever opened it.
 * It renders through a portal on the document body: a plain `fixed` overlay placed
 * inside a pop-up is sized to that pop-up (the pop-up's own transform becomes the
 * containing block), which is what boxed the estimate and authority reviews in. Here
 * the window sits at the top of the stack, as wide and tall as the browser window less
 * a 24px margin on every side, and Radix keeps the window that opened it open
 * underneath — closing this one puts the user back exactly where they were.
 *
 * Its level sits above the app's dialogs (overlay 10000, card 10001) so the pop-up that
 * opened it stays behind and dimmed, yet below the pop-over layer (10005) and the
 * document viewer's full-screen mode (10080), so a menu or the zoomed document opened
 * from inside this window still comes out on top.
 */
export default function TopLevelReviewWindow({ isOpen, onClose, label, className = '', children }) {
  const contentRef = useRef(null);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose?.(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-mobile-full-modal="true"
          className="fixed inset-0 z-[10003] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6"
        >
          <DialogPrimitive.Content
            ref={contentRef}
            aria-describedby={undefined}
            onOpenAutoFocus={(event) => {
              // Hold the focus on the window itself: leaving it on the button underneath
              // would let a keypress fire something behind the window.
              event.preventDefault();
              contentRef.current?.focus({ preventScroll: true });
            }}
            onPointerDownOutside={(event) => event.preventDefault()}
            onEscapeKeyDown={(event) => event.preventDefault()}
            className={`bg-card border border-border rounded-xl shadow-2xl w-full h-full flex flex-col outline-none ${className}`}
          >
            <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
            {children}
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}