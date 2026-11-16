import React from 'react';

/**
 * The shape of a list while it loads (design system: skeleton). Screen readers hear
 * the label; everyone else sees soft placeholder rows instead of "Loading…".
 */
export default function LoadingRows({ count = 3, height = 'h-14', label = 'Loading', className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-busy="true" aria-label={label}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${height} rounded-lg bg-muted animate-pulse`} />
      ))}
      <span className="sr-only">{label}…</span>
    </div>
  );
}
