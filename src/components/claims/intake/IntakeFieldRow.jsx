import React from 'react';
import { AlertTriangle, Check, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';

const CONFIDENCE_META = {
  high: { label: 'Read', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', icon: Check },
  medium: { label: 'Check', className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', icon: AlertTriangle },
  low: { label: 'Check', className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', icon: AlertTriangle },
  missing: { label: 'Not found', className: 'bg-muted text-muted-foreground', icon: AlertTriangle },
};

/** One value read off the instruction, editable, with where it was found. */
export default function IntakeFieldRow({
  field, value, confidence, snippet, source, focused, needsCheck, checked,
  onChange, onFocus, onCheck,
}) {
  const meta = CONFIDENCE_META[confidence] || CONFIDENCE_META.missing;
  const Icon = meta.icon;
  const unchecked = needsCheck && !checked;
  const snippetAt = snippet && value ? snippet.toLowerCase().indexOf(String(value).toLowerCase()) : -1;

  const control = () => {
    if (field.type === 'textarea') {
      return (
        <textarea
          rows={2}
          value={value ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onFocus={onFocus}
          className={`w-full text-xs rounded-md border bg-transparent px-2 py-1 resize-y ${unchecked ? 'border-amber-300 dark:border-amber-700' : 'border-input'}`}
        />
      );
    }
    if (field.type === 'yesno') {
      return (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {['yes', 'no'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => { onChange(field.key, value === option ? '' : option); onFocus(); }}
              className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                value === option ? 'bg-accent text-accent-foreground border-accent' : 'border-input text-muted-foreground hover:bg-muted'
              }`}
            >
              {option === 'yes' ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      );
    }
    if (field.type === 'excess') {
      return (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={value ?? ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            onFocus={onFocus}
            placeholder="Not stated on the instruction"
            disabled={!!field.waived}
            className={`h-7 text-xs ${unchecked ? 'border-amber-300 dark:border-amber-700' : ''}`}
          />
          <label className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground whitespace-nowrap cursor-pointer">
            <input type="checkbox" checked={!!field.waived} onChange={(e) => onChange('excess_waived', e.target.checked)} className="w-3 h-3 rounded border-border" />
            Waived
          </label>
        </div>
      );
    }
    if (field.type === 'select') {
      return (
        <select
          value={value ?? ''}
          onChange={(e) => { onChange(field.key, e.target.value); onFocus(); }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full h-7 text-xs rounded-md border bg-card text-foreground px-2 ${unchecked ? 'border-amber-300 dark:border-amber-700' : 'border-input'}`}
        >
          <option value="">Not stated</option>
          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      );
    }
    return (
      <Input
        type={field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'}
        value={value ?? ''}
        onChange={(e) => onChange(field.key, e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onFocus={onFocus}
        className={`h-7 text-xs ${unchecked ? 'border-amber-300 dark:border-amber-700' : ''}`}
      />
    );
  };

  return (
    <div
      onClick={onFocus}
      className={`rounded-lg border px-2 py-1.5 cursor-pointer transition-colors ${focused ? 'border-purple-400 dark:border-purple-600 bg-purple-50/70 dark:bg-purple-900/10' : 'border-border hover:border-purple-300 dark:hover:border-purple-800'}`}
    >
      <div className="flex items-start gap-2">
        <span className="w-[104px] flex-shrink-0 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {field.label}
        </span>
        <div className="flex-1 min-w-0">{control()}</div>
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold flex-shrink-0 mt-1 ${meta.className}`}>
          <Icon className="w-2.5 h-2.5" strokeWidth={3} /> {meta.label}
        </span>
        <button
          type="button"
          title="Show where this is on the instruction"
          onClick={(e) => { e.stopPropagation(); onFocus(); }}
          className="p-1 mt-0.5 rounded text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 flex-shrink-0"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      </div>

      {unchecked && (
        <label className="mt-1 ml-[112px] inline-flex items-center gap-1.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 cursor-pointer">
          <input
            type="checkbox"
            checked={!!checked}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onCheck(field.key, e.target.checked)}
            className="w-3 h-3 rounded border-border"
          />
          I've checked this value
        </label>
      )}

      {focused && (
        <p className="mt-1 ml-[112px] text-[10px] leading-snug text-muted-foreground">
          {snippet ? (
            <>
              Found {source ? <>in <span className="font-medium text-foreground/80">{source}</span></> : 'in the instruction'}:{' '}
              {snippetAt >= 0 ? (
                <>
                  {snippet.slice(0, snippetAt)}
                  <mark className="bg-yellow-200 dark:bg-yellow-700/50 text-foreground rounded px-0.5 font-semibold">
                    {snippet.slice(snippetAt, snippetAt + String(value).length)}
                  </mark>
                  {snippet.slice(snippetAt + String(value).length)}
                </>
              ) : snippet}
            </>
          ) : (
            'Not found in the instruction — added by hand.'
          )}
        </p>
      )}
    </div>
  );
}