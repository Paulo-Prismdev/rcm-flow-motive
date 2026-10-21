import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Check, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import IntakeFieldRow from './IntakeFieldRow';
import IntakeSourcePane from './IntakeSourcePane';
import IntakeSuggestions from './IntakeSuggestions';
import IntakeDirectoryLinks from './IntakeDirectoryLinks';
import IntakeClientChoice from './IntakeClientChoice';
import IntakeChecks from './IntakeChecks';
import {
  INTAKE_FIELDS,
  groupsWithValues,
  intakeNeedsCheck,
  intakePatch,
  intakeValues,
} from './claimIntakeFields';
import { linkPatch } from './directoryMatch';
import { clientChoicePatch, clientChoiceReady } from './clientChoice';

const vehicleFields = (result) => ({
  make_model: result.make_model || '',
  vehicle_make: result.make || '',
  vehicle_model: result.model || '',
  vehicle_colour: result.colour || '',
  vehicle_fuel_type: result.fuel_type || '',
  vehicle_year_of_manufacture: result.year_of_manufacture || null,
  vehicle_engine_capacity: result.engine_capacity || null,
  vehicle_co2_emissions: result.co2_emissions || null,
  vehicle_euro_status: result.euro_status || '',
  vehicle_mot_status: result.mot_status || '',
  vehicle_mot_expiry_date: result.mot_expiry_date || '',
  vehicle_tax_status: result.tax_status || '',
  vehicle_tax_due_date: result.tax_due_date || '',
  vehicle_date_of_last_v5c_issued: result.date_of_last_v5c_issued || '',
  vehicle_wheelplan: result.wheelplan || '',
  vehicle_revenue_weight: result.revenue_weight || null,
});

const thirdPartyVehicleFields = (result) => ({
  tp_make_model: result.make_model || '',
  tp_vehicle_colour: result.colour || '',
  tp_vehicle_fuel_type: result.fuel_type || '',
  tp_vehicle_year_of_manufacture: result.year_of_manufacture || null,
});

const lookupSummary = (result) => [
  result.make_model,
  result.colour,
  result.year_of_manufacture,
  result.mot_status ? `MOT ${result.mot_status}` : '',
  result.tax_status ? `Tax ${result.tax_status}` : '',
].filter(Boolean).join(' • ');

const UK_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The check before a new claim is filled in: the instruction on the left, the
 * details read from it on the right, each one pointing at where it was found,
 * with anything the reading was unsure of waiting to be checked and the claim
 * type it would give the job offered as a suggestion. Nothing reaches the claim
 * until the user confirms here.
 */
export default function ClaimIntakeReview({ isOpen, reading, files = [], pastedText = '', onClose, onConfirm }) {
  const [values, setValues] = useState({});
  const [confidence, setConfidence] = useState({});
  const [snippets, setSnippets] = useState({});
  const [sources, setSources] = useState({});
  const [checked, setChecked] = useState({});
  const [focused, setFocused] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [claimType, setClaimType] = useState('');
  const [links, setLinks] = useState({});
  const [clientChoice, setClientChoice] = useState({ mode: null, record: null });
  const [lookups, setLookups] = useState({});
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) { startedRef.current = false; return; }
    const read = intakeValues(reading?.fields || {});
    setValues(read);
    setConfidence(reading?.confidence || {});
    setSnippets(reading?.snippets || {});
    setSources(reading?.sources || {});
    setChecked({});
    setLinks({});
    setClientChoice({ mode: null, record: null });
    setLookups({});
    setClaimType('');
    setActiveIndex(0);
    setFocused(INTAKE_FIELDS.find((field) => read[field.key])?.key || '');
  }, [isOpen, reading]);

  // The existing vehicle lookup, run on both registrations as soon as the
  // reading lands, so the vehicle details come from DVLA rather than the paper.
  useEffect(() => {
    if (!isOpen || startedRef.current) return;
    startedRef.current = true;

    const runLookup = async (key, reg, label, isThirdParty) => {
      setLookups((prev) => ({ ...prev, [key]: { reg, label, status: 'loading' } }));
      try {
        const response = await base44.functions.invoke('lookupVehicleData', { registrationNumber: reg });
        const result = response?.data || {};
        if (!result.success) {
          setLookups((prev) => ({ ...prev, [key]: { reg, label, status: 'failed', summary: result.message || 'No vehicle details came back.' } }));
          return;
        }
        const patch = isThirdParty ? thirdPartyVehicleFields(result) : vehicleFields(result);
        setLookups((prev) => ({ ...prev, [key]: { reg, label, status: 'found', summary: lookupSummary(result), patch } }));
        if (!isThirdParty && result.make_model) {
          setValues((prev) => (prev.make_model ? prev : { ...prev, make_model: result.make_model }));
        }
      } catch (error) {
        setLookups((prev) => ({ ...prev, [key]: { reg, label, status: 'failed', summary: error?.message || 'The vehicle lookup failed.' } }));
      }
    };

    const reg = String(reading?.fields?.reg || '').trim();
    const tpReg = String(reading?.fields?.tp_reg || '').trim();
    if (reg.replace(/\s/g, '').length >= 3) runLookup('reg', reg, 'Vehicle being repaired', false);
    if (tpReg.replace(/\s/g, '').length >= 3) runLookup('tp_reg', tpReg, 'Third party vehicle', true);
  }, [isOpen, reading]);

  const groups = useMemo(() => groupsWithValues(values), [values]);
  const needsCheck = useMemo(() => intakeNeedsCheck(values, confidence), [values, confidence]);
  const unreviewed = needsCheck.filter((key) => !checked[key]);
  const clientChosen = clientChoiceReady(clientChoice);
  const suggestions = reading?.suggestions || {};
  const damageDraft = String(suggestions.damage_draft || '').trim();

  if (!isOpen) return null;

  const setValue = (key, value) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'excess_waived' && value) next.policy_excess = '';
      return next;
    });
    // Changing a value means it has been looked at.
    setChecked((prev) => ({ ...prev, [key]: true }));
  };

  const focusField = (key) => {
    setFocused(key);
    const source = String(sources[key] || '').toLowerCase();
    if (!source) return;
    if (source.includes('pasted') && pastedText) { setActiveIndex(files.length); return; }
    const index = files.findIndex((url) => {
      const name = decodeURIComponent(String(url).split('?')[0].split('/').pop() || '').toLowerCase();
      return name && (source.includes(name) || name.includes(source));
    });
    if (index >= 0) setActiveIndex(index);
  };

  const highlightText = (() => {
    const value = values[focused];
    if (!value) return '';
    const field = INTAKE_FIELDS.find((f) => f.key === focused);
    if (field?.type === 'date' && UK_DATE.test(value)) {
      const [year, month, day] = value.split('-');
      return `${day}/${month}/${year}`;
    }
    return String(value);
  })();

  const handleConfirm = () => {
    const dvla = lookups.reg?.patch || {};
    const tpDvla = lookups.tp_reg?.patch || {};
    const readPatch = intakePatch({ values, claimType, dvla, tpDvla });
    onConfirm({
      patch: { ...readPatch, ...linkPatch({ links, values }), ...clientChoicePatch(clientChoice, values) },
      files,
      pastedText,
    });
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3" data-mobile-full-modal="true">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-foreground">Check what we read before it goes on the claim</h3>
            <p className="text-[11px] text-muted-foreground truncate">
              {[files.length ? `${files.length} file${files.length === 1 ? '' : 's'}` : '', pastedText ? 'pasted email' : '']
                .filter(Boolean).join(' and ')} read together into one set of details
            </p>
          </div>
          <button type="button" onClick={onClose} title="Cancel the reading" className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          <div className="md:w-1/2 h-52 md:h-full border-b md:border-b-0 md:border-r border-border flex flex-col min-h-0">
            <IntakeSourcePane files={files} pastedText={pastedText} highlightText={highlightText} activeIndex={activeIndex} onActivate={setActiveIndex} />
          </div>

          <div className="md:w-1/2 flex-1 overflow-y-auto p-3 space-y-3">
            {!groups.length && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-px" />
                <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  Nothing could be read from this instruction. Fill the claim in by hand — nothing has been added.
                </p>
              </div>
            )}

            {groups.map((group) => (
              <div key={group.key} className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
                {group.fields.map((field) => {
                  const rowField = field.type === 'excess' ? { ...field, waived: !!values.excess_waived } : field;
                  return (
                    <IntakeFieldRow
                      key={field.key}
                      field={rowField}
                      value={rowField.waived ? '' : values[field.key]}
                      confidence={confidence[field.key] || 'missing'}
                      snippet={snippets[field.key]}
                      source={sources[field.key]}
                      focused={focused === field.key}
                      needsCheck={needsCheck.includes(field.key) && !(field.type === 'excess' && rowField.waived)}
                      checked={!!checked[field.key]}
                      onChange={setValue}
                      onFocus={() => focusField(field.key)}
                      onCheck={(key, on) => setChecked((prev) => ({ ...prev, [key]: on }))}
                    />
                  );
                })}
              </div>
            ))}

            <IntakeClientChoice
              values={values}
              referrerLink={links.referrer}
              choice={clientChoice}
              onChange={setClientChoice}
            />

            <IntakeSuggestions
              suggestions={suggestions}
              claimType={claimType}
              onClaimType={setClaimType}
              damageDraft={damageDraft}
              damageReplaces={!!values.vehicle_damage}
              onUseDamage={(draft) => { setValue('vehicle_damage', draft); focusField('vehicle_damage'); }}
            />

            <IntakeDirectoryLinks values={values} onChange={setLinks} />

            <IntakeChecks
              duplicates={reading?.duplicates || []}
              registrations={['reg', 'tp_reg'].filter((key) => lookups[key]).map((key) => ({ ...lookups[key], key }))}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="gap-1.5">
            <X className="w-3.5 h-3.5" /> Cancel
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            {(!clientChosen || unreviewed.length > 0) && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400 text-right">
                {!clientChosen
                  ? 'Choose who the client is'
                  : `${unreviewed.length} value${unreviewed.length === 1 ? '' : 's'} to check first`}
              </p>
            )}
            <Button
              onClick={handleConfirm}
              disabled={unreviewed.length > 0 || !clientChosen}
              className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0"
            >
              <Check className="w-3.5 h-3.5" /> Add these details to the claim
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}