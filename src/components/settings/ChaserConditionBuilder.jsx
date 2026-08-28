import React from 'react';
import { Plus, X } from 'lucide-react';
import { JOURNEY_STATUSES, SECONDARY_STATUSES } from '@/components/shared/claimStatusV2';

// ── Condition field catalog ──
// Each field is derived from real claim state (dates where relevant), not raw
// status labels, so conditions stay accurate even when statuses lag behind dates.
export const CHASER_FIELDS = [
  { value: 'journey_status', label: 'Journey Status', type: 'enum', options: JOURNEY_STATUSES.map((s) => s.name), hint: 'Date-aware: a claim with an on-site date and no hand-over date counts as "On-Site".' },
  { value: 'secondary_status', label: 'Secondary Status', type: 'enum', options: SECONDARY_STATUSES },
  { value: 'invoice_status', label: 'Invoice Status', type: 'enum', options: ['Not Ready for Invoicing', 'Ready to Invoice', 'Invoice Required - Pending', 'Invoiced', 'Invoice Paid', 'Invoice Overdue', 'Not Applicable'] },
  { value: 'claim_type', label: 'Claim Type', type: 'enum', options: ['Fault Claim', '3rd Party Insurer Direct', '3rd Party Paying Privately', 'Credit Repair', 'Glass Claim', 'Paying Privately'] },
  { value: 'is_total_loss', label: 'Total Loss', type: 'boolean', hint: 'True when a total loss date is recorded.' },
  { value: 'is_on_site', label: 'On-Site', type: 'boolean', hint: 'True when on-site date is set and vehicle not yet handed over.' },
  { value: 'is_returned', label: 'Returned to Customer', type: 'boolean', hint: 'True when a hand-over date is set.' },
  { value: 'has_bodyshop', label: 'Repairer Allocated', type: 'boolean', hint: 'True when a bodyshop/repairer is assigned.' },
  { value: 'requires_indemnity', label: 'Requires Indemnity', type: 'boolean' },
];

const ENUM_OPERATORS = [
  { value: 'is_any_of', label: 'is any of' },
  { value: 'is_not_any_of', label: 'is not any of' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const BOOL_OPERATORS = [{ value: 'is', label: 'is' }];

function getFieldDef(fieldValue) {
  return CHASER_FIELDS.find((f) => f.value === fieldValue);
}

function defaultConditionForField(fieldValue) {
  const def = getFieldDef(fieldValue);
  if (!def) return { field: fieldValue, operator: 'is_any_of', value: '' };
  if (def.type === 'boolean') return { field: fieldValue, operator: 'is', value: 'true' };
  return { field: fieldValue, operator: 'is_any_of', value: '' };
}

// ── Migrate legacy rule fields into the new condition model ──
export function migrateLegacyConditions(rule) {
  const include = Array.isArray(rule.include_conditions) ? [...rule.include_conditions] : [];
  const exclude = Array.isArray(rule.exclude_conditions) ? [...rule.exclude_conditions] : [];

  // Legacy journey-status filter → include "is any of" (comma-separated string)
  if ((!include || include.length === 0) && Array.isArray(rule.trigger_journey_statuses) && rule.trigger_journey_statuses.length > 0) {
    include.push({ field: 'journey_status', operator: 'is_any_of', value: rule.trigger_journey_statuses.join(',') });
  }

  // Legacy total-loss handling → include / exclude conditions
  const tlh = rule.total_loss_handling || 'Include';
  if (tlh === 'Exclude') {
    exclude.push({ field: 'is_total_loss', operator: 'is', value: 'true' });
  } else if (tlh === 'Only') {
    include.push({ field: 'is_total_loss', operator: 'is', value: 'true' });
  }

  return { include_conditions: include, exclude_conditions: exclude };
}

// ── Human-readable summary for rule cards ──
export function summarizeConditions(conditions) {
  if (!conditions || conditions.length === 0) return [];
  return conditions.map((c) => {
    const def = getFieldDef(c.field);
    const label = def?.label || c.field;
    const opLabel = [...ENUM_OPERATORS, ...BOOL_OPERATORS].find((o) => o.value === c.operator)?.label || c.operator;
    let valLabel = '';
    if (c.operator === 'is_empty') valLabel = '';
    else if (c.operator === 'is_not_empty') valLabel = '';
    else if (def?.type === 'boolean') valLabel = c.value === 'true' ? 'Yes' : 'No';
    else valLabel = String(c.value || '').split(',').filter(Boolean).join(' / ');
    return `${label} ${opLabel}${valLabel ? ' ' + valLabel : ''}`;
  });
}

export default function ChaserConditionBuilder({ conditions, onChange, mode }) {
  const list = Array.isArray(conditions) ? conditions : [];

  const addCondition = () => {
    const firstField = CHASER_FIELDS[0].value;
    onChange([...list, defaultConditionForField(firstField)]);
  };

  const updateCondition = (index, patch) => {
    const next = list.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange(next);
  };

  const removeCondition = (index) => {
    onChange(list.filter((_, i) => i !== index));
  };

  const changeField = (index, newField) => {
    onChange(list.map((c, i) => (i === index ? defaultConditionForField(newField) : c)));
  };

  const title = mode === 'include' ? 'Fire only if' : 'Skip if';
  const subtitle = mode === 'include'
    ? 'A claim must match ALL of these to be eligible. Leave empty to chase every claim (subject to the timer).'
    : 'A claim is skipped if ANY of these are true.';

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{title}</label>
      <p className="text-xs text-gray-500 mb-2">{subtitle}</p>

      <div className="space-y-2">
        {list.map((cond, i) => {
          const def = getFieldDef(cond.field);
          const operators = def?.type === 'boolean' ? BOOL_OPERATORS : ENUM_OPERATORS;
          const needsValue = cond.operator !== 'is_empty' && cond.operator !== 'is_not_empty';

          return (
            <div key={i} className="flex flex-wrap items-start gap-2 neomorph-inset p-2 rounded-lg">
              {/* Field */}
              <select
                value={cond.field}
                onChange={(e) => changeField(i, e.target.value)}
                className="neomorph-inset px-2 py-1.5 text-xs rounded-md border-0 flex-1 min-w-[140px]"
              >
                {CHASER_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              {/* Operator */}
              <select
                value={cond.operator}
                onChange={(e) => updateCondition(i, { operator: e.target.value, value: def?.type === 'boolean' ? 'true' : '' })}
                className="neomorph-inset px-2 py-1.5 text-xs rounded-md border-0"
              >
                {operators.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* Value */}
              {needsValue && def?.type === 'boolean' && (
                <select
                  value={cond.value || 'true'}
                  onChange={(e) => updateCondition(i, { value: e.target.value })}
                  className="neomorph-inset px-2 py-1.5 text-xs rounded-md border-0"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              )}

              {needsValue && def?.type === 'enum' && (
                <div className="flex flex-wrap gap-1 flex-1 min-w-[120px]">
                  {def.options.map((opt) => {
                    const current = String(cond.value || '').split(',').filter(Boolean);
                    const selected = current.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const nextVal = selected ? current.filter((v) => v !== opt) : [...current, opt];
                          updateCondition(i, { value: nextVal.join(',') });
                        }}
                        className={`px-2 py-0.5 text-[11px] rounded-full border transition-colors ${
                          selected
                            ? 'bg-[#131d47] text-white border-[#131d47]'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeCondition(i)}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                title="Remove condition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addCondition}
        className="mt-2 flex items-center gap-1 text-xs font-medium text-[#131d47] dark:text-blue-400 hover:underline"
      >
        <Plus className="w-3.5 h-3.5" />
        Add condition
      </button>
    </div>
  );
}