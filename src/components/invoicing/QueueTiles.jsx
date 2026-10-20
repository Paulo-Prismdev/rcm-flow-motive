import React, { useState } from 'react';
import QueueRow from './QueueRow';
import QueueTile from './QueueTile';

/**
 * The day's actions as a grid of tiles, one per queue, each opening its own list
 * underneath — one list at a time, so the page stays short enough to see the aged
 * invoices without scrolling.
 */
export default function QueueTiles({ sections = [], onOpen }) {
  const [openKey, setOpenKey] = useState(null);
  const openSection = sections.find((section) => section.key === openKey) || null;
  // Queues with work to do come first, in the order they were built (Warnings first);
  // the clear ones drop to the end as chips.
  const waiting = sections.filter((section) => section.count > 0);
  const clear = sections.filter((section) => section.count === 0);

  return (
    <div className="space-y-2">
      {waiting.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {waiting.map((section) => (
            <QueueTile
              key={section.key}
              section={section}
              open={openKey === section.key}
              onToggle={() => setOpenKey((key) => (key === section.key ? null : section.key))}
            />
          ))}
        </div>
      )}

      {clear.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {clear.map((section) => (
            <QueueTile
              key={section.key}
              section={section}
              open={openKey === section.key}
              onToggle={() => setOpenKey((key) => (key === section.key ? null : section.key))}
            />
          ))}
        </div>
      )}

      {openSection && (
        <div className="bg-card border border-border rounded-[10px] overflow-hidden">
          <p className="px-3 py-2 text-[11px] text-muted-foreground border-b border-border">{openSection.hint}</p>
          {openSection.count === 0
            ? <p className="px-3 py-3 text-xs text-muted-foreground">Nothing here.</p>
            : openSection.rows.map((row) => <QueueRow key={row.id} row={row} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  );
}