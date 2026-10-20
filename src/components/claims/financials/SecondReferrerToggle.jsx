import React, { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { buildTrackerMetaPatch } from '@/components/shared/invoiceChecklist';
import FieldEditActions from './FieldEditActions';

/**
 * "Second referrer to pay" as a small toggle that sits with the referrer fee
 * rather than on a row of its own. It reads off until its pencil is clicked, and
 * only saves when Save is pressed.
 */
export default function SecondReferrerToggle({ claim, onTrackerChange, editing, onEdit, onDone }) {
  const tracker = claim.invoice_tracker || {};
  const enabled = tracker.second_referrer_enabled === true;
  const name = tracker.second_referrer_name || '';

  const [draftOn, setDraftOn] = useState(enabled);
  const [draftName, setDraftName] = useState(name);

  useEffect(() => { if (editing) { setDraftOn(enabled); setDraftName(name); } }, [editing]);

  const save = () => {
    onDone();
    if (draftOn === enabled && draftName === name) return;
    const before = enabled ? `On (${name || 'no name'})` : 'Off';
    const after = draftOn ? `On (${draftName || 'no name'})` : 'Off';
    if (before === after) return;
    onTrackerChange(
      buildTrackerMetaPatch(claim, {
        second_referrer_enabled: draftOn,
        second_referrer_name: draftOn ? draftName : '',
      }),
      `Second referrer to pay changed from ${before} to ${after}`
    );
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5 h-6">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Second referrer to pay
        </span>
        {enabled ? (
          <span className="text-[11px] font-medium text-foreground truncate">{name || 'Yes'}</span>
        ) : (
          <span className="text-[11px] text-muted-foreground">No</span>
        )}
        <button
          type="button"
          onClick={onEdit}
          title="Edit the second referrer"
          className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors flex-shrink-0"
        >
          <Pencil className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded-md border border-border bg-muted/20 p-1.5">
      <label className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={draftOn}
          onChange={(e) => setDraftOn(e.target.checked)}
          className="w-3 h-3 rounded border-border"
        />
        Second referrer to pay
      </label>
      {draftOn && (
        <Input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') onDone();
          }}
          placeholder="Second referrer name / company"
          className="h-8 text-xs"
        />
      )}
      <div className="flex items-center gap-1">
        <FieldEditActions onSave={save} onCancel={onDone} />
      </div>
    </div>
  );
}