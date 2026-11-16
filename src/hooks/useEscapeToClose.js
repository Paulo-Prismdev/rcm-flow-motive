import { useEffect, useRef } from 'react';

/**
 * Escape closes a hand-built window, the way the shared windows already close.
 * Only the window opened last closes (a window opened from a window goes first), and
 * nothing happens while a shared dialog, sheet or menu is open, because that one
 * handles Escape itself.
 */
const stack = [];

const sharedLayerOpen = () => !!document.querySelector(
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [data-radix-popper-content-wrapper]'
);

/** How many hand-built windows are listening for Escape right now. */
export const escapeWindowsOpen = () => stack.length;

let listening = false;
function onKeyDown(e) {
  if (e.key !== 'Escape' || e.defaultPrevented || stack.length === 0) return;
  if (sharedLayerOpen()) return;
  const top = stack[stack.length - 1];
  e.preventDefault();
  top.current?.();
}

export default function useEscapeToClose(onClose, active = true) {
  const ref = useRef(onClose);
  ref.current = onClose;

  useEffect(() => {
    if (!active || typeof onClose !== 'function') return undefined;
    stack.push(ref);
    if (!listening) {
      document.addEventListener('keydown', onKeyDown);
      listening = true;
    }
    return () => {
      const i = stack.lastIndexOf(ref);
      if (i !== -1) stack.splice(i, 1);
    };
  }, [active, typeof onClose === 'function']); // eslint-disable-line react-hooks/exhaustive-deps
}
