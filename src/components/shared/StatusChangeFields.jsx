import React from 'react';
import { ArrowRight } from 'lucide-react';
import {
  JOURNEY_STATUSES,
  SECONDARY_STATUSES,
  TERTIARY_STATUSES,
  journeyStatusesForOutcome,
  getJourneyDescription,
  nextJourneySteps,
  suggestedInternalStatuses,
  getInternalStatusDescription,
} from './claimStatusV2';
import { OUTCOMES, getClaimOutcome, getOutcomeDescription } from './claimOutcome';
import { useStatusConfigs } from './StatusConfigContext';

// The claim status form: outcome, journey stage, then the two internal statuses.
// value: { outcome, journey, secondary, tertiary, on_site_date, hand_over_date,
//          completion_date, claim_complete_date, salvage_collected_date } —
// each '' means "no change / clear".
//
// The outcome decides which journey the stages are offered from, so a total loss
// is never offered the repair stages (and can therefore reach Claim Complete).
// Under the journey there is a one-click next step for wherever the claim has got
// to, and both internal pickers open with the statuses that read naturally at
// that stage, with the full list below so nothing is restricted.
//
// Internal status options come from the ClaimStatusConfig entity (managed via
// Settings → Status Management) so that tab is the single source of truth; the
// hardcoded arrays in claimStatusV2 are the fallback when no configs are loaded.
export default function StatusChangeFields({ value, onChange, claim }) {
  const { claimStatuses } = useStatusConfigs();
  const today = new Date().toISOString().split('T')[0];
  const onSiteDate = value?.on_site_date || claim?.on_site_date || today;
  const completionDate = value?.completion_date || claim?.completion_date || today;
  const claimCompleteDate = value?.claim_complete_date || claim?.claim_complete_date || today;
  const handOverDate = value?.hand_over_date || claim?.hand_over_date || today;
  const salvageDate = value?.salvage_collected_date || claim?.salvage_collected_date || today;

  const configured = React.useMemo(() => {
    return (claimStatuses || [])
      .filter(s => s.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [claimStatuses]);

  const secondaryOptions = React.useMemo(() => {
    const names = configured.map(s => s.status_name);
    // If configs exist, use them as the source of truth. Otherwise fall back
    // to the hardcoded list so the form is never empty.
    return names.length > 0 ? names : SECONDARY_STATUSES;
  }, [configured]);

  // The additional status uses the same option set as the main one so any status
  // can also be flagged as extra information.
  const tertiaryOptions = secondaryOptions.length > 0 ? secondaryOptions : TERTIARY_STATUSES;

  // A configured status may carry its own description; the built-in meaning is
  // the fallback so every status explains itself.
  const describe = (name) =>
    configured.find(s => s.status_name === name)?.description || getInternalStatusDescription(name);

  const outcome = value?.outcome || getClaimOutcome(claim);
  const journeyStages = journeyStatusesForOutcome(outcome);
  const nextSteps = nextJourneySteps(value?.journey, outcome);

  const journeyLabelFor = (stage) => journeyStages.find(s => s.name === stage)?.description || '';

  // Prevent the two internal statuses from holding the same value — setting one
  // to match the other clears the opposite field.
  const set = (field, v) => {
    const next = { ...value, [field]: v };

    if (field === 'outcome') {
      const validStages = journeyStatusesForOutcome(v).map(s => s.name);
      if (v === 'Total Loss') {
        // A write-off starts its own journey at Total Loss.
        if (!validStages.includes(next.journey)) next.journey = 'Total Loss';
      } else if (next.journey && !validStages.includes(next.journey)) {
        // The stage belongs to the total loss journey — clear it to be set again.
        next.journey = '';
      }
      next.on_site_date = '';
      next.completion_date = '';
      next.claim_complete_date = '';
      next.hand_over_date = '';
      next.salvage_collected_date = '';
    }

    if (v && field === 'tertiary' && v === value.secondary) next.tertiary = '';
    if (v && field === 'secondary' && v === value.tertiary) next.tertiary = '';

    // Entering a stage that owns a date records that date; moving on clears the
    // ones that belong to another stage.
    if (field === 'journey') {
      if (v === 'On-Site') {
        next.on_site_date = onSiteDate;
        next.completion_date = '';
        next.hand_over_date = '';
        next.salvage_collected_date = '';
      } else if (v === 'Repairs Complete') {
        next.completion_date = completionDate;
        next.on_site_date = '';
        next.hand_over_date = '';
        next.salvage_collected_date = '';
      } else if (v === 'Returned to Customer') {
        next.hand_over_date = handOverDate;
        next.on_site_date = '';
        next.completion_date = '';
        next.claim_complete_date = '';
        next.salvage_collected_date = '';
      } else if (v === 'Salvage Collected') {
        next.salvage_collected_date = salvageDate;
        next.on_site_date = '';
        next.completion_date = '';
        next.hand_over_date = '';
      } else if (v === 'Claim Complete') {
        next.claim_complete_date = claimCompleteDate;
        next.on_site_date = '';
        next.completion_date = '';
        next.hand_over_date = '';
        next.salvage_collected_date = '';
      } else {
        next.on_site_date = '';
        next.completion_date = '';
        next.claim_complete_date = '';
        next.hand_over_date = '';
        next.salvage_collected_date = '';
      }
    }
    onChange(next);
  };

  const selectCls = 'w-full px-3 py-2 text-sm bg-background border border-border rounded-lg';
  const labelCls = 'block text-xs text-muted-foreground mb-1';
  const hintCls = 'text-[10px] text-muted-foreground mt-0.5';

  // If a current value isn't in the available options (for example a status that
  // was removed from Settings), include it so the dropdown still shows it.
  const ensureIncluded = (options, current) =>
    current && !options.includes(current) ? [current, ...options] : options;

  // Split an option list so whatever reads naturally at this stage comes first,
  // without hiding anything.
  const splitSuggested = (options, journey) => {
    const suggested = suggestedInternalStatuses(journey).filter(s => options.includes(s));
    const rest = options.filter(s => !suggested.includes(s));
    return { suggested, rest };
  };

  const journeyValue = value?.journey || '';
  const secondaryList = ensureIncluded(secondaryOptions, value?.secondary);
  const tertiaryList = ensureIncluded(tertiaryOptions, value?.tertiary);
  const mainSplit = splitSuggested(secondaryList, journeyValue);
  const extraSplit = splitSuggested(tertiaryList, journeyValue);
  const suggestedGroupLabel = journeyValue ? `Suggested for ${journeyValue}` : 'Suggested';

  const showOnSiteDate = journeyValue === 'On-Site';
  const showCompletionDate = journeyValue === 'Repairs Complete';
  const showHandOverDate = journeyValue === 'Returned to Customer';
  const showClaimCompleteDate = journeyValue === 'Claim Complete';
  const showSalvageDate = journeyValue === 'Salvage Collected';

  const renderInternalOptions = ({ suggested, rest }, { exclude }) => (
    <>
      {suggested.length > 0 && (
        <optgroup label={suggestedGroupLabel}>
          {suggested.map(s => (
            <option key={s} value={s} disabled={s === exclude}>{s === exclude ? `${s} (already the other status)` : s}</option>
          ))}
        </optgroup>
      )}
      {rest.length > 0 && (
        <optgroup label="All statuses">
          {rest.map(s => (
            <option key={s} value={s} disabled={s === exclude}>{s === exclude ? `${s} (already the other status)` : s}</option>
          ))}
        </optgroup>
      )}
    </>
  );

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Outcome</label>
        <select value={outcome} onChange={(e) => set('outcome', e.target.value)} className={selectCls}>
          {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.value}</option>)}
        </select>
        <p className={hintCls}>{getOutcomeDescription(outcome)}</p>
      </div>

      <div>
        <label className={labelCls}>Journey Status</label>
        <select value={journeyValue} onChange={(e) => set('journey', e.target.value)} className={selectCls}>
          <option value="">No journey status</option>
          {journeyStages.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
          {/* A stage left over from the other journey (e.g. a salvage stage on a
              claim that is being switched back to a repair) stays visible so it
              is not silently replaced. */}
          {journeyValue && !journeyStages.some(s => s.name === journeyValue) && (
            <option value={journeyValue}>{journeyValue} (not on this journey)</option>
          )}
        </select>
        {journeyLabelFor(journeyValue) && <p className={hintCls}>{journeyLabelFor(journeyValue)}</p>}
        {nextSteps.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span className="text-[10px] text-muted-foreground">Next step:</span>
            {nextSteps.map((step, i) => (
              <button
                key={step}
                type="button"
                onClick={() => set('journey', step)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                  i === 0
                    ? 'border-primary text-primary hover:bg-primary/10'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {step}
                {i === 0 && <ArrowRight className="w-3 h-3" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {showOnSiteDate && (
        <div>
          <label className={labelCls}>On-Site Date</label>
          <input type="date" value={onSiteDate} onChange={(e) => onChange({ ...value, on_site_date: e.target.value })} className={selectCls} />
          <p className={hintCls}>Recorded in Key Dates as the on-site date.</p>
        </div>
      )}
      {showCompletionDate && (
        <div>
          <label className={labelCls}>Completion Date</label>
          <input type="date" value={completionDate} onChange={(e) => onChange({ ...value, completion_date: e.target.value })} className={selectCls} />
          <p className={hintCls}>Repairs complete — recorded in Key Dates as the completion date.</p>
        </div>
      )}
      {showHandOverDate && (
        <div>
          <label className={labelCls}>Hand-Over Date</label>
          <input type="date" value={handOverDate} onChange={(e) => onChange({ ...value, hand_over_date: e.target.value })} className={selectCls} />
          <p className={hintCls}>Vehicle handed back to customer — recorded in Key Dates.</p>
        </div>
      )}
      {showSalvageDate && (
        <div>
          <label className={labelCls}>Salvage Collected Date</label>
          <input type="date" value={salvageDate} onChange={(e) => onChange({ ...value, salvage_collected_date: e.target.value })} className={selectCls} />
          <p className={hintCls}>The day the salvage was collected — this is what the job's invoicing is chased from.</p>
        </div>
      )}
      {showClaimCompleteDate && (
        <div>
          <label className={labelCls}>Claim Complete Date</label>
          <input type="date" value={claimCompleteDate} onChange={(e) => onChange({ ...value, claim_complete_date: e.target.value })} className={selectCls} />
          <p className={hintCls}>Claim fully closed — recorded in Key Dates as the claim complete date.</p>
        </div>
      )}

      <div>
        <label className={labelCls}>Main internal status (groups the claim on the Repairs list)</label>
        <select value={value?.secondary || ''} onChange={(e) => set('secondary', e.target.value)} className={selectCls}>
          <option value="">No main internal status</option>
          {renderInternalOptions(mainSplit, { exclude: value?.tertiary })}
        </select>
        {value?.secondary && <p className={hintCls}>{describe(value.secondary)}</p>}
      </div>

      <div>
        <label className={labelCls}>Additional internal status</label>
        <select value={value?.tertiary || ''} onChange={(e) => set('tertiary', e.target.value)} className={selectCls}>
          <option value="">No additional internal status</option>
          {renderInternalOptions(extraSplit, { exclude: value?.secondary })}
        </select>
        {value?.tertiary && <p className={hintCls}>{describe(value.tertiary)}</p>}
      </div>
    </div>
  );
}