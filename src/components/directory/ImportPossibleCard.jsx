import React from 'react';

const CHOICES = [
  { key: 'existing', label: 'Update existing' },
  { key: 'create', label: 'Create new' },
  { key: 'skip', label: 'Leave out' },
];

const Btn = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border text-muted-foreground hover:bg-muted'
    }`}
  >
    {children}
  </button>
);

/** A row that might be an existing repairer, or might be someone new — the user decides. */
export default function ImportPossibleCard({ row, choice, onChoose }) {
  return (
    <div className="px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-medium text-foreground truncate">{row.name}</p>
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">row {row.row}</span>
      </div>

      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Directory has <span className="font-medium text-foreground">{row.candidate.name}</span>
        {row.candidate.postcode ? ` · ${row.candidate.postcode}` : ''}
        {row.postcode && row.postcode !== row.candidate.postcode ? ` · sheet says ${row.postcode}` : ''}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{row.reason}</p>

      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {CHOICES.map((c) => (
          <Btn key={c.key} active={choice === c.key} onClick={() => onChoose(c.key)}>{c.label}</Btn>
        ))}
      </div>

      {choice === 'existing' && row.changes.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {row.changes.map((change) => (
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
      {choice === 'existing' && row.changes.length === 0 && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">Nothing on the directory record would change.</p>
      )}
    </div>
  );
}