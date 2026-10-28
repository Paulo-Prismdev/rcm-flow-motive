import React from 'react';

/**
 * One repaired row: what it is, and exactly which fields a save would change.
 * A new repairer lists the details it will be created with instead.
 */
export default function ImportRowCard({ title, row, meta, facts = [], changes = [], note }) {
  return (
    <div className="px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-medium text-foreground truncate">{title}</p>
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">row {row}</span>
      </div>

      {meta && <p className="text-[11px] text-muted-foreground">{meta}</p>}

      {facts.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {facts.map((fact) => (
            <span key={fact.label} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {fact.label}: <span className="font-medium text-foreground">{fact.value}</span>
            </span>
          ))}
        </div>
      )}

      {changes.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {changes.map((change) => (
            <li key={change.field} className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">{change.label}</span>
              {': '}
              {change.from ? <span className="line-through opacity-70">{change.from}</span> : <span>—</span>}
              <span aria-hidden> → </span>
              <span className="font-medium text-foreground">{change.to}</span>
            </li>
          ))}
        </ul>
      )}

      {note && <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>}
    </div>
  );
}