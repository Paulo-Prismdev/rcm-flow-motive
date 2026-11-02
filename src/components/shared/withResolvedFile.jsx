import React from 'react';
import { Loader2, Lock } from 'lucide-react';
import { fileExtensionOf, isPrivateRef, useResolvedFileUrl } from '@/lib/privateFiles';

/**
 * Wraps a file viewer so it can be given a stored reference (a private file or an
 * older public URL) as `fileUrl`. The reference is exchanged for an address the
 * browser can load (a five-minute signed link for a private file) before the viewer
 * draws, and the viewer also gets `fileExt`: the type comes from the original file
 * name, because a signed link's address doesn't always end in it.
 *
 * `claimId` (optional) keeps the audit entry on the right claim; `logOpen` records
 * the opening (viewers that show a file to a person do; thumbnails don't).
 */
export default function withResolvedFile(Viewer, { logOpen = true } = {}) {
  function ResolvedFileViewer({ fileUrl, claimId, ...rest }) {
    const { data: url, isLoading, isError } = useResolvedFileUrl(fileUrl, { claimId, log: logOpen });
    if (!fileUrl) return <Viewer fileUrl={fileUrl} {...rest} />;
    if (isLoading) {
      return (
        <div className="flex-1 min-h-0 w-full h-full flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Opening the document…
        </div>
      );
    }
    if (isError || !url) {
      return (
        <div className="flex-1 min-h-0 w-full h-full flex items-center justify-center p-6 text-center text-sm text-muted-foreground" role="alert">
          <div>
            <Lock className="w-6 h-6 mx-auto mb-2 opacity-60" aria-hidden="true" />
            {isPrivateRef(fileUrl) ? 'This document could not be opened. You may not have access to it.' : 'This document could not be opened.'}
          </div>
        </div>
      );
    }
    return <Viewer fileUrl={url} fileExt={fileExtensionOf(fileUrl)} {...rest} />;
  }
  ResolvedFileViewer.displayName = `withResolvedFile(${Viewer.displayName || Viewer.name || 'Viewer'})`;
  return ResolvedFileViewer;
}
