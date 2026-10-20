import React from 'react';
import { AlertTriangle } from 'lucide-react';
import UnifiedModal from './UnifiedModal';
import { Button } from '@/components/ui/button';

/**
 * The confirmation for removing a file an item's details were read from. Two
 * choices, both spelled out before anything happens: take the details with the
 * file, or keep them while a replacement copy is found. Clearing is offered
 * first, because a recorded invoice should not outlive the copy behind it.
 */
export default function RemoveFileDialog({
  isOpen, fileName, description, clearPoints = [], keepHint, paidText,
  onClose, onClear, onKeep,
}) {
  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Remove "${fileName}"?`}
      description={description}
      className="max-w-md"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="outline" size="sm" onClick={onKeep}>
            Remove the file only, keep the details
          </Button>
          <Button type="button" size="sm" onClick={onClear}>
            Remove the file and clear its details
          </Button>
        </div>
      }
    >
      <div className="space-y-2.5">
        <div className="rounded-[10px] border border-border bg-muted/40 p-3">
          <p className="mb-1.5 text-[11px] font-semibold text-foreground">
            Removing the file and clearing its details will:
          </p>
          <ul className="space-y-1">
            {clearPoints.map((point) => (
              <li key={point} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground/70" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[10px] border border-border bg-muted/20 p-3">
          <p className="mb-1 text-[11px] font-semibold text-foreground">
            Removing the file only will:
          </p>
          <p className="text-[11px] text-muted-foreground">
            Keep everything already recorded, so the item shows amber with “{keepHint}” until a
            replacement copy is added.
          </p>
        </div>

        {paidText && (
          <p className="flex items-start gap-1.5 rounded-[10px] border border-amber-300 bg-amber-50 p-3 text-[11px] text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            <AlertTriangle className="mt-px h-3.5 w-3.5 flex-shrink-0" />
            <span>{paidText}</span>
          </p>
        )}

        <p className="text-[10px] text-muted-foreground">
          The matching copy is taken out of Internal Updates either way, and the removal is recorded
          in the activity history.
        </p>
      </div>
    </UnifiedModal>
  );
}