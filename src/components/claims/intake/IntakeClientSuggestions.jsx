import React from 'react';
import { Building2, User } from 'lucide-react';

/** The directory clients that could be this claim's client, likeliest first. */
export default function IntakeClientSuggestions({ suggestions = [], selectedId, onPick }) {
  if (!suggestions.length) return null;

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Likely matches</p>
      {suggestions.map((row) => (
        <button
          key={row.record.id}
          type="button"
          onClick={() => onPick(row.record)}
          className={`w-full rounded-md border px-2 py-1 text-left transition-colors ${
            selectedId === row.record.id
              ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20'
              : 'border-border hover:bg-muted'
          }`}
        >
          <span className="flex items-center gap-1.5">
            {row.record.client_type === 'Company'
              ? <Building2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              : <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
            <span className="text-xs font-medium text-foreground truncate">{row.record.name}</span>
          </span>
          <span className="block text-[10px] text-muted-foreground truncate">{row.reasons.join(' · ')}</span>
        </button>
      ))}
    </div>
  );
}