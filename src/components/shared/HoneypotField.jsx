import React from 'react';

/**
 * A field real people never see or reach (off screen, skipped by the keyboard and
 * hidden from screen readers). Automated form-fillers tend to complete every field,
 * so the server refuses any submission where this one has a value.
 */
export default function HoneypotField({ value, onChange }) {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
      <label>
        Leave this field empty
        <input
          type="text"
          name="company_website"
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
