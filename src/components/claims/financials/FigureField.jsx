import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Pencil, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import FieldEditActions from './FieldEditActions';

/**
 * A job figure, read-only until its pencil is clicked. The value is only saved
 * when Save is pressed (or Enter); Escape and Cancel leave the figure exactly as
 * it was. An empty figure shows a small Add link rather than a blank box, and is
 * still flagged in amber when the claim needs it before invoicing.
 */
export default function FigureField({
  label, value, onCommit, type = 'text', missing, options, hint,
  className = '', editing, onEdit, onDone,
}) {
  const toDraft = (v) => (v === null || v === undefined ? '' : String(v));
  const [draft, setDraft] = useState(toDraft(value));
  const inputRef = useRef(null);

  // Each time the edit step opens it starts from the saved figure, so a
  // discarded draft can never be saved later by accident.
  useEffect(() => { if (editing) setDraft(toDraft(value)); }, [editing]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const isEmpty = value === null || value === undefined || value === '';
  const multiline = type === 'textarea';
  const amber = 'border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/10';

  const save = () => {
    const next = draft;
    onDone();
    if (next !== toDraft(value)) onCommit(next);
  };

  const labelTone = missing ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground';

  return (
    <div className={className}>
      <label className={`block text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${labelTone}`}>
        {label}
      </label>

      {editing ? (
        <div className="flex items-center gap-1 min-h-8">
          <div className="flex-1 min-w-0">
            {options ? (
              <select
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') onDone(); }}
                className="w-full h-8 px-2 rounded-md border border-border bg-transparent text-sm"
              >
                <option value="">Not set</option>
                {options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : multiline ? (
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') onDone(); }}
                rows={2}
                className="w-full px-2 py-1 rounded-md border border-border bg-transparent text-sm"
              />
            ) : (
              <Input
                ref={inputRef}
                type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
                step={type === 'number' ? '0.01' : undefined}
                inputMode={type === 'number' ? 'decimal' : undefined}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') save();
                  if (e.key === 'Escape') onDone();
                }}
                className="h-8 text-sm"
              />
            )}
          </div>
          <FieldEditActions onSave={save} onCancel={onDone} />
        </div>
      ) : isEmpty ? (
        <div className="flex items-center gap-1.5 h-8">
          <button
            type="button"
            onClick={onEdit}
            className={`inline-flex items-center gap-1 text-[11px] font-semibold hover:underline ${missing ? 'text-amber-600 dark:text-amber-400' : 'text-primary'}`}
          >
            <Plus className="w-3 h-3" /> Add
          </button>
          {missing && (
            <span title="Needed for invoicing">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
            </span>
          )}
        </div>
      ) : (
        <div className={`flex gap-1.5 rounded-md border px-2 ${multiline ? 'min-h-8 py-1 items-start' : 'min-h-8 md:h-8 items-center'} ${missing ? amber : 'border-border bg-muted/30'}`}>
          <span className={`flex-1 min-w-0 text-sm font-medium text-foreground ${multiline ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
            {value}
          </span>
          <button
            type="button"
            onClick={onEdit}
            title={`Edit ${label}`}
            className="p-1 -mr-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors flex-shrink-0"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
      )}

      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}