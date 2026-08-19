import React from 'react';
import { JOURNEY_STATUSES, SECONDARY_STATUSES, TERTIARY_STATUSES } from './claimStatusV2';
import { useStatusConfigs } from './StatusConfigContext';

// Three-field v2 status selector used by the Status Change update form.
// value: { journey, secondary, tertiary, on_site_date, hand_over_date } —
// each '' means "no change / clear".
//
// Secondary and Tertiary options are sourced from the ClaimStatusConfig entity
// (managed via Settings → Status Management) so the Status Settings tab is the
// single source of truth. The hardcoded arrays in claimStatusV2 are used only
// as a fallback when no configs have been loaded yet.
//
// On-Site is driven by the journey status (single source of truth). Selecting
// "On-Site" prompts for the on-site date; moving off "On-Site" to a completion
// status (Repairs Complete / Returned to Customer) prompts for the hand-over
// date. The dates are persisted alongside the status change via
// buildStatusChangeClaimUpdate.
const HANDOVER_TARGETS = ['Repairs Complete', 'Returned to Customer'];

export default function StatusChangeFields({ value, onChange, claim }) {
  const { claimStatuses } = useStatusConfigs();
  const currentJourney = claim?.journey_status || claim?.job_status || '';
  const today = new Date().toISOString().split('T')[0];
  const onSiteDate = value?.on_site_date || claim?.on_site_date || today;
  const handOverDate = value?.hand_over_date || claim?.hand_over_date || today;

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
    // On-Site date is captured when entering On-Site; hand-over date when
    // leaving On-Site for a completion status.
    if (field === 'journey') {
      if (v === 'On-Site') {
        next.on_site_date = onSiteDate;
        next.hand_over_date = '';
      } else if (currentJourney === 'On-Site' && HANDOVER_TARGETS.includes(v)) {
        next.hand_over_date = handOverDate;
        next.on_site_date = '';
      } else {
        next.on_site_date = '';
        next.hand_over_date = '';
      }
    }
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

  const showOnSiteDate = value.journey === 'On-Site';
  const showHandOverDate = currentJourney === 'On-Site' && HANDOVER_TARGETS.includes(value.journey);

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Journey Status</label>
        <select value={value.journey || ''} onChange={(e) => set('journey', e.target.value)} className={selectCls}>
          <option value="">No journey status</option>
          {JOURNEY_STATUSES.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
      </div>
      {showOnSiteDate && (
        <div>
          <label className={labelCls}>On-Site Date</label>
          <input type="date" value={onSiteDate} onChange={(e) => onChange({ ...value, on_site_date: e.target.value })} className={selectCls} />
          <p className="text-[10px] text-muted-foreground mt-0.5">Recorded in Key Dates as the on-site date.</p>
        </div>
      )}
      {showHandOverDate && (
        <div>
          <label className={labelCls}>Hand-Over Date</label>
          <input type="date" value={handOverDate} onChange={(e) => onChange({ ...value, hand_over_date: e.target.value })} className={selectCls} />
          <p className="text-[10px] text-muted-foreground mt-0.5">Vehicle handed back to customer — recorded in Key Dates.</p>
        </div>
      )}
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