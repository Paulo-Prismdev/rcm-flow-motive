import React from 'react';

const TONE_PILL = {
  create: 'bg-success-bg text-success-fg',
  update: 'bg-info-bg text-info-fg',
  possible: 'bg-warning-bg text-warning-fg',
  muted: 'bg-muted text-muted-foreground',
};

/** One titled block of the import preview. */
export default function ImportSection({ title, subtitle, count, tone = 'muted', children }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-start justify-between gap-3 border-b border-border px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${TONE_PILL[tone]}`}>
          {count}
        </span>
      </header>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}