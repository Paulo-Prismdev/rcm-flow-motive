import React from 'react';
import { AlertTriangle, Check, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';

const CONFIDENCE_META = {
  high: { label: 'Read', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', icon: Check },
  medium: { label: 'Check', className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', icon: AlertTriangle },
  low: { label: 'Check', className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', icon: AlertTriangle },
  missing: { label: 'Not found', className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', icon: AlertTriangle },
};

/**
 * One figure the AI read off the invoice: editable, with what it made of it, the
 * text it found the value in, and — while it is the focused figure — the
 * matching text highlighted on the document beside this panel.
 */
export default function ExtractedFigureRow({
  field, value, confidence, snippet, focused, needsReview, reviewed,
  onChange, onFocus, onReview,
}) {
  const meta = CONFIDENCE_META[confidence] || CONFIDENCE_META.missing;
  const Icon = meta.icon;
  const unchecked = needsReview && !reviewed;

  const snippetAt = snippet && value ? snippet.toLowerCase().indexOf(String(value).toLowerCase()) : -1;

  return (
    <div
      onClick={onFocus}
      className={`rounded-lg border px-2 py-1.5 cursor-pointer transition-colors ${focused ? 'border-purple-400 dark:border-purple-600 bg-purple-50/70 dark:bg-purple-900/10' : 'border-border hover:border-purple-300 dark:hover:border-purple-800'}`}
    >
      <div className="flex items-center gap-2">
        <span className="w-[92px] flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {field.label}
        </span>
        <div className="flex-1 min-w-0">
          <Input
            type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
            step={field.type === 'number' ? '0.01' : undefined}
            inputMode={field.type === 'number' ? 'decimal' : undefined}
            value={value ?? ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onFocus={onFocus}
            className={`h-7 text-xs ${unchecked ? 'border-amber-300 dark:border-amber-700' : ''}`}
          />
        </div>
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold flex-shrink-0 ${meta.className}`}>
          <Icon className="w-2.5 h-2.5" strokeWidth={3} /> {meta.label}
        </span>
        <button
          type="button"
          title="Show where this is on the document"
          onClick={(e) => { e.stopPropagation(); onFocus(); }}
          className="p-1 rounded text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 flex-shrink-0"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      </div>

      {unchecked && (
        <label className="mt-1 ml-[100px] inline-flex items-center gap-1.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 cursor-pointer">
          <input
            type="checkbox"
            checked={!!reviewed}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onReview(field.key, e.target.checked)}
            className="w-3 h-3 rounded border-border"
          />
          I've checked this figure
        </label>
      )}

      {focused && (
        <p className="mt-1 ml-[100px] text-[10px] leading-snug text-muted-foreground">
          {snippet ? (
            <>
              Found in the document:{' '}
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
            'No snippet of where this appears on the document.'
          )}
        </p>
      )}
    </div>
  );
}