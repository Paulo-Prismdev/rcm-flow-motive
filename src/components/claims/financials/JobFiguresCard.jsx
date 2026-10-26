import React, { useEffect, useRef } from 'react';
import StandardJobFigures from './StandardJobFigures';
import CreditRepairFigures from './CreditRepairFigures';
import SecondReferrerToggle from './SecondReferrerToggle';
import StorageFigures from './StorageFigures';
import NotesReferences from './NotesReferences';
import { figureGroupKey } from '@/components/financials/figureGroupKeys';

/**
 * The figures that drive this claim's invoices, as titled groups — Repair, Customer,
 * the referrer's fee, the second referrer's, the repairer's referral, and a credit
 * repair job's partner rates. Every group holds the figures that came off a document
 * against the paperwork behind them, and is changed as a whole: one Edit in its
 * heading, one Save.
 */
export default function JobFiguresCard({
  claim, ctx, missing, focus, onChange, onTrackerChange, storagePercentDefault, editingKey, setEditingKey,
}) {
  const stackRef = useRef(null);

  // "Set the job figure" opens the group holding the figure that still has to be
  // set, and pulls the groups into view where they are off screen.
  useEffect(() => {
    if (!focus?.key) return;
    const group = figureGroupKey(focus.key);
    if (group) setEditingKey(group);
    stackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [focus?.key, focus?.n]);

  const figures = { claim, missing, onChange, editingKey, setEditingKey };

  return (
    <div ref={stackRef} className="space-y-6">
      {ctx.creditRepair
        ? <CreditRepairFigures {...figures} />
        : <StandardJobFigures {...figures} ctx={ctx} onTrackerChange={onTrackerChange} />}

      {/* A total loss job has no repair cost: the storage run up with the repairer is
          the figure its invoicing stands on. */}
      {ctx.totalLoss && (
        <StorageFigures
          claim={claim}
          defaultPercent={storagePercentDefault}
          onTrackerChange={onTrackerChange}
          editingKey={editingKey}
          setEditingKey={setEditingKey}
        />
      )}

      {/* The second referrer who invoices us their own share, where the job has one
          to pay — or the way to add one. */}
      {ctx.hasReferrer && (
        <SecondReferrerToggle
          claim={claim}
          missing={missing}
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