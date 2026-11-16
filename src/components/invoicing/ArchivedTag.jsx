import React from 'react';

/** Marks a line that sits on a claim which has been filed away. */
export default function ArchivedTag() {
  return (
    <span className="shrink-0 rounded-full border border-border bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
      Archived
    </span>
  );
}