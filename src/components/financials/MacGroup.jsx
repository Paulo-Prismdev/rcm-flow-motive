import React from 'react';
import { cn } from '@/lib/utils';

/**
 * A grouped container, as System Settings draws them: one rounded surface with the
 * rows inside it separated by hairlines. Presentation only — no borders beyond the
 * hairline, no shadows.
 */
export function MacGroup({ title, footer, children, className }) {
  return (
    <section className={cn('space-y-1.5', className)}>
      {title && <h3 className="px-1 text-[11px] text-mac-muted">{title}</h3>}
      <div className="divide-y divide-mac-line overflow-hidden rounded-[10px] border border-mac-line bg-mac-group">
        {children}
      </div>
      {footer && <p className="px-1 text-[11px] text-mac-muted">{footer}</p>}
    </section>
  );
}

/** One row of a group: 44px high, clickable where it opens something. */
export function MacRow({ onClick, className, children }) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn('flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-150 hover:bg-mac-window', className)}
      >
        {children}
      </button>
    );
  }
  return <div className={cn('flex min-h-11 w-full items-center gap-3 px-3 py-2', className)}>{children}</div>;
}

/** A label on the left and its value on the right, with a grey caption underneath. */
export function MacValueRow({ label, value, sub, caption, right, onClick }) {
  return (
    <MacRow onClick={onClick} className="justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-[13px] text-foreground">{label}</span>
        {caption && <span className="mt-0.5 block text-[11px] text-mac-muted">{caption}</span>}
      </span>
      <span className="min-w-0 flex-shrink-0 text-right">
        <span className="block text-[13px] font-semibold tabular-nums text-foreground">{value}</span>
        {sub && <span className="mt-0.5 block text-[11px] tabular-nums text-mac-muted">{sub}</span>}
        {right}
      </span>
    </MacRow>
  );
}