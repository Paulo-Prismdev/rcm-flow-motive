import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MacRow } from './MacGroup';

export const toDraft = (value) => (value === null || value === undefined ? '' : String(value));

const INPUT = 'rounded-md border border-mac-line bg-mac-group px-2 text-[13px] text-foreground';

/**
 * One figure as a row: the label on the left with its caption underneath, the value
 * on the right, and any further grey text on the same line. A row with an optional
 * extra carries a small blue link for it. While its group is being edited the row
 * becomes an input — the group saves, never the row.
 */
export default function FigureRow({
  label, value, display, note, caption, hint, type = 'text', options, missing,
  editable = true, editing, draft, onDraft, link,
}) {
  const empty = display === undefined && (value === null || value === undefined || value === '');
  const shown = display !== undefined ? display : empty ? 'Not set' : value;
  const open = editing && editable;

  return (
    <MacRow className="justify-between gap-4">
      <span className="min-w-0 flex-1">
        <span className={cn(
          'flex items-center gap-1.5 text-[13px] font-medium',
          missing ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
        )}>
          {missing && <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.8} />}
          {label}
        </span>
        {(caption || hint) && <span className="mt-0.5 block text-[11px] text-mac-muted">{caption || hint}</span>}
      </span>

      {open ? (
        <span className="flex flex-shrink-0 items-center">
          {options ? (
            <select value={draft} onChange={(e) => onDraft(e.target.value)} className={cn(INPUT, 'h-8 w-56')}>
              <option value="">Not set</option>
              {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          ) : type === 'textarea' ? (
            <textarea
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              rows={2}
              className={cn(INPUT, 'w-72 py-1')}
            />
          ) : (
            <input
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              type={type === 'number' ? 'number' : 'text'}
              step={type === 'number' ? '0.01' : undefined}
              inputMode={type === 'number' ? 'decimal' : undefined}
              className={cn(INPUT, 'h-8 w-40 text-right tabular-nums')}
            />
          )}
        </span>
      ) : (
        <>
          {note && <span className="flex-shrink-0 text-[11px] tabular-nums text-mac-muted">{note}</span>}
          <span className="flex flex-shrink-0 items-center gap-2">
            <span className={cn('text-[13px] tabular-nums', empty ? 'text-mac-muted' : 'font-semibold text-foreground')}>
              {shown}
            </span>
            {link && (
              <button type="button" onClick={link.onClick} className="text-[11px] text-mac-accent hover:underline">
                {link.label}
              </button>
            )}
          </span>
        </>
      )}
    </MacRow>
  );
}