import React from 'react';
import { JOURNEY_STATUSES, SECONDARY_STATUSES, TERTIARY_STATUSES } from './claimStatusV2';

// Three-field v2 status selector used by the Status Change update form.
// value: { journey, secondary, tertiary } — each '' means "no change / clear".
export default function StatusChangeFields({ value, onChange }) {
  // Prevent Secondary and Tertiary from holding the same value —
  // setting one to match the other clears the opposite field.
  const set = (field, v) => {
    const next = { ...value, [field]: v };
    if (v && field === 'tertiary' && v === value.secondary) next.tertiary = '';
    if (v && field === 'secondary' && v === value.tertiary) next.tertiary = '';
    onChange(next);
  };
  const selectCls = 'w-full px-3 py-2 text-sm bg-background border border-border rounded-lg';
  const labelCls = 'block text-xs text-muted-foreground mb-1';

  // Disable the Tertiary option that matches the current Secondary so it can't be picked.
  const secondaryValue = value.secondary || '';

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Journey Status</label>
        <select value={value.journey || ''} onChange={(e) => set('journey', e.target.value)} className={selectCls}>
          <option value="">No journey status</option>
          {JOURNEY_STATUSES.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Secondary Status (group)</label>
        <select value={value.secondary || ''} onChange={(e) => set('secondary', e.target.value)} className={selectCls}>
          <option value="">No secondary status</option>
          {SECONDARY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Tertiary Status (extra info)</label>
        <select value={value.tertiary || ''} onChange={(e) => set('tertiary', e.target.value)} className={selectCls}>
          <option value="">No tertiary status</option>
          {TERTIARY_STATUSES.map((s) => (
            <option key={s} value={s} disabled={s === secondaryValue}>
              {s === secondaryValue ? `${s} (same as Secondary)` : s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}