import React from 'react';
import { JOURNEY_STATUSES, SECONDARY_STATUSES, TERTIARY_STATUSES } from './claimStatusV2';
import { useStatusConfigs } from './StatusConfigContext';

// Three-field v2 status selector used by the Status Change update form.
// value: { journey, secondary, tertiary } — each '' means "no change / clear".
//
// Secondary and Tertiary options are sourced from the ClaimStatusConfig entity
// (managed via Settings → Status Management) so the Status Settings tab is the
// single source of truth. The hardcoded arrays in claimStatusV2 are used only
// as a fallback when no configs have been loaded yet.
export default function StatusChangeFields({ value, onChange }) {
  const { claimStatuses } = useStatusConfigs();

  const secondaryOptions = React.useMemo(() => {
    const configured = (claimStatuses || [])
      .filter(s => s.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(s => s.status_name);
    // If configs exist, use them as the source of truth. Otherwise fall back
    // to the hardcoded list so the form is never empty.
    return configured.length > 0 ? configured : SECONDARY_STATUSES;
  }, [claimStatuses]);

  // Tertiary uses the same option set as Secondary so any group status can
  // also be flagged as extra info.
  const tertiaryOptions = secondaryOptions.length > 0 ? secondaryOptions : TERTIARY_STATUSES;

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

  // If the current value isn't in the available options (e.g. a legacy status
  // that was removed from Settings), include it so the dropdown still shows it.
  const ensureIncluded = (options, current) => {
    if (current && !options.includes(current)) return [current, ...options];
    return options;
  };
  const secondaryList = ensureIncluded(secondaryOptions, value.secondary);
  const tertiaryList = ensureIncluded(tertiaryOptions, value.tertiary);

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
          {secondaryList.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Tertiary Status (extra info)</label>
        <select value={value.tertiary || ''} onChange={(e) => set('tertiary', e.target.value)} className={selectCls}>
          <option value="">No tertiary status</option>
          {tertiaryList.map((s) => (
            <option key={s} value={s} disabled={s === secondaryValue}>
              {s === secondaryValue ? `${s} (same as Secondary)` : s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}