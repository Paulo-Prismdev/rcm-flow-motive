import React, { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import StandardJobFigures from './StandardJobFigures';
import CreditRepairFigures from './CreditRepairFigures';
import SecondReferrerToggle from './SecondReferrerToggle';
import StorageFigures from './StorageFigures';
import NotesReferences from './NotesReferences';

/**
 * The one card where the figures that drive this claim's invoices live. Every
 * figure, the notes and the second referrer details are read-only until their
 * own pencil is clicked, and only one of them can be edited at a time. Missing
 * figures are flagged here — and only the ones this claim actually needs.
 */
export default function JobFiguresCard({ claim, ctx, missing, focus, onChange, onTrackerChange, storagePercentDefault }) {
  const [editingKey, setEditingKey] = useState(null);
  const cardRef = useRef(null);

  // "Go to job figures" opens the figure that still has to be set, and pulls the
  // card into view where it is off screen.
  useEffect(() => {
    if (!focus?.key) return;
    setEditingKey(focus.key);
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [focus?.key, focus?.n]);

  return (
    <div ref={cardRef} className="rounded-[10px] border border-border bg-card p-2.5 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job figures</h4>
        {missing.length > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
            {missing.length} needed for invoicing
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-semibold">
            <Check className="w-2.5 h-2.5" strokeWidth={3} /> All figures set
          </span>
        )}
      </div>

      {ctx.creditRepair ? (
        <CreditRepairFigures
          claim={claim}
          missing={missing}
          onChange={onChange}
          editingKey={editingKey}
          setEditingKey={setEditingKey}
        />
      ) : (
        <StandardJobFigures
          claim={claim}
          ctx={ctx}
          missing={missing}
          onChange={onChange}
          onTrackerChange={onTrackerChange}
          editingKey={editingKey}
          setEditingKey={setEditingKey}
        />
      )}

      {ctx.creditRepair && ctx.hasReferrer && (
        <SecondReferrerToggle
          claim={claim}
          missing={missing}
          onTrackerChange={onTrackerChange}
          editingKey={editingKey}
          setEditingKey={setEditingKey}
        />
      )}

      {/* A total loss job has no repair cost: the storage run up with the repairer
          is the figure its invoicing stands on, and our share of it is the one
          figure the job adds of its own. */}
      {ctx.totalLoss && (
        <StorageFigures
          claim={claim}
          defaultPercent={storagePercentDefault}
          onTrackerChange={onTrackerChange}
          editingKey={editingKey}
          setEditingKey={setEditingKey}
        />
      )}

      <NotesReferences
        claim={claim}
        onChange={onChange}
        editingKey={editingKey}
        setEditingKey={setEditingKey}
      />
    </div>
  );
}