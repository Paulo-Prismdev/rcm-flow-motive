import { toast } from '@/components/ui/use-toast';

/**
 * The app's own replacements for the browser's alert() and confirm() boxes, which
 * look out of place, block the whole page and can't be styled. Both can be called
 * from anywhere (not just from inside a component):
 *
 *   if (!(await askConfirm({ title: 'Delete this note?', confirmLabel: 'Delete', destructive: true }))) return;
 *   notify('Draft saved');
 *   notifyError('Could not save the draft', error);
 *
 * askConfirm is shown by <ConfirmHost />, mounted once in App.jsx.
 */

let showConfirm = null;
const waiting = [];

/** Called by ConfirmHost when it mounts. */
export function registerConfirmHost(fn) {
  showConfirm = fn;
  while (waiting.length && showConfirm) {
    const { opts, resolve } = waiting.shift();
    showConfirm(opts, resolve);
  }
  return () => { if (showConfirm === fn) showConfirm = null; };
}

/**
 * Ask the user to confirm something. Resolves true (confirmed) or false (cancelled
 * or dismissed). Accepts a plain message or { title, message, confirmLabel,
 * cancelLabel, destructive }.
 */
export function askConfirm(input) {
  const opts = typeof input === 'string' ? { title: input } : { ...(input || {}) };
  return new Promise((resolve) => {
    if (showConfirm) showConfirm(opts, resolve);
    else waiting.push({ opts, resolve });
  });
}

/** A short message in the corner. */
export function notify(title, description) {
  toast({ title, description });
}

/** A short warning in the corner (something to fix, or something that went wrong), as one line. */
export function warn(title, description) {
  toast({ title, description, variant: 'destructive' });
}

/** A short error message in the corner, with the reason when there is a readable one. */
export function notifyError(title, error) {
  const reason = typeof error === 'string'
    ? error
    : error?.response?.data?.error || error?.response?.data?.message || error?.message || '';
  toast({ title, description: reason || 'Please try again.', variant: 'destructive' });
}
