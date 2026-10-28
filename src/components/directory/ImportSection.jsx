import React from 'react';

const TONE_PILL = {
  create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  update: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  possible: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  muted: 'bg-muted text-muted-foreground',
};

/** One titled block of the import preview. */
export default function ImportSection({ title, subtitle, count, tone = 'muted', children }) {
  return (
    <section className="rounded-[10px] border border-border bg-card">
      <header className="flex items-start justify-between gap-3 border-b border-border px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground">{title}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE_PILL[tone]}`}>
          {count}
        </span>
      </header>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}