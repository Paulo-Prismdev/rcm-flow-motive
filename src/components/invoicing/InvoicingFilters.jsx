import React from 'react';

const Field = ({ label, value, onChange, options, allLabel }) => (
  <label className="flex flex-col gap-1 min-w-0">
    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 max-w-[200px] px-2 rounded-lg border border-border bg-card text-xs"
    >
      <option value="all">{allLabel}</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>
);

/** Narrow a tab to the party, claim type or division worth chasing. */
export default function InvoicingFilters({ filters, onChange, onClear, options }) {
  const active = filters.party !== 'all' || filters.claimType !== 'all' || filters.division !== 'all';

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field
        label="Party"
        allLabel="All parties"
        value={filters.party}
        onChange={(value) => onChange({ ...filters, party: value })}
        options={options.parties}
      />
      <Field
        label="Claim type"
        allLabel="All claim types"
        value={filters.claimType}
        onChange={(value) => onChange({ ...filters, claimType: value })}
        options={options.claimTypes}
      />
      <Field
        label="Business division"
        allLabel="All divisions"
        value={filters.division}
        onChange={(value) => onChange({ ...filters, division: value })}
        options={options.divisions}
      />
      {active && (
        <button
          type="button"
          onClick={onClear}
          className="h-9 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}