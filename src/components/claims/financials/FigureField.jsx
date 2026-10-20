import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

/**
 * A job figure edited in place: the value saves on blur or Enter, so the figure
 * that drives the invoices is entered once and used everywhere. Missing figures
 * are outlined in amber rather than announced.
 */
export default function FigureField({ label, value, onCommit, type = 'text', missing, options, hint, placeholder, className = '' }) {
  const toDraft = (v) => (v === null || v === undefined ? '' : String(v));
  const [draft, setDraft] = useState(toDraft(value));

  useEffect(() => { setDraft(toDraft(value)); }, [value]);

  const commit = () => {
    if (draft === toDraft(value)) return;
    onCommit(draft);
  };

  const ring = missing
    ? 'border-amber-300 dark:border-amber-700'
    : 'border-border';

  return (
    <div className={className}>
      <label className={`block text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${missing ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
        {label}
      </label>
      {options ? (
        <select
          value={draft}
          onChange={(e) => { setDraft(e.target.value); onCommit(e.target.value); }}
          className={`w-full h-8 px-2 rounded-md border bg-transparent text-sm ${ring}`}
        >
          <option value="">Not set</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <Input
          type={type}
          step={type === 'number' ? '0.01' : undefined}
          inputMode={type === 'number' ? 'decimal' : undefined}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          className={`h-8 text-sm ${ring}`}
        />
      )}
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}