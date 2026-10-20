import React from 'react';

/** One compact select: what it is showing is its own label. */
const Field = ({ title, value, onChange, options, allLabel }) => (
  <select
    title={title}
    aria-label={title}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="h-8 max-w-[180px] rounded-lg border border-border bg-card px-2 text-xs"
  >
    <option value="all">{allLabel}</option>
    {options.map((option) => <option key={option} value={option}>{option}</option>)}
  </select>
);

/** Narrow a tab to the party, claim type or division worth chasing. */
export default function InvoicingFilters({ filters, onChange, onClear, options }) {
  const active = filters.party !== 'all' || filters.claimType !== 'all' || filters.division !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Field
        title="Party"
        allLabel="All parties"
        value={filters.party}
        onChange={(value) => onChange({ ...filters, party: value })}
        options={options.parties}
      />
      <Field
        title="Claim type"
        allLabel="All claim types"
        value={filters.claimType}
        onChange={(value) => onChange({ ...filters, claimType: value })}
        options={options.claimTypes}
      />
      <Field
        title="Business division"
        allLabel="All divisions"
        value={filters.division}
        onChange={(value) => onChange({ ...filters, division: value })}
        options={options.divisions}
      />
      {active && (
        <button
          type="button"
          onClick={onClear}
          className="h-8 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}