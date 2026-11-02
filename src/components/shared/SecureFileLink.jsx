import React, { useState } from 'react';
import { openFileInNewTab } from '@/lib/privateFiles';
import { toast } from '@/components/ui/use-toast';

/**
 * A link to a stored file that works for private files too. Clicking it asks the
 * server for a short-lived link (which checks access and logs the opening) and opens
 * the file in a new tab. Older public files open the same way, so their openings are
 * logged as well. Renders as a button styled however `className` says.
 */
export default function SecureFileLink({ fileRef, claimId, purpose = 'download', className, title, children, ...rest }) {
  const [busy, setBusy] = useState(false);
  const open = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!fileRef || busy) return;
    setBusy(true);
    try {
      await openFileInNewTab(fileRef, { claimId, purpose });
    } catch {
      toast({ title: 'This file could not be opened', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={open} className={className} title={title} aria-label={rest['aria-label'] || title} aria-busy={busy} disabled={busy}>
      {children}
    </button>
  );
}
