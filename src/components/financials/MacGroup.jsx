import React from 'react';
import { cn } from '@/lib/utils';

/**
 * A grouped container, as System Settings draws them: a heading that stands out —
 * dark, semibold, in the case it was written in — over one rounded surface with its
 * rows separated by hairlines. An optional action (an Edit button, a Save) sits on
 * the heading line, a footer under the surface. Presentation only.
 */
export function MacGroup({ title, action, footer, children, className }) {
  return (
    <section className={cn('space-y-2', className)}>
      {title && (
        <div className="flex min-h-6 items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
          {action}
        </div>
      )}
      <div className="divide-y divide-mac-line overflow-hidden rounded-[10px] border border-mac-line bg-mac-group">
        {children}
      </div>
      {footer}
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
export function MacValueRow({ label, value, note, sub, caption, right, onClick }) {
  return (
    <MacRow onClick={onClick} className="justify-between gap-4">
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] text-foreground">{label}</span>
        {caption && <span className="mt-0.5 block text-[11px] text-mac-muted">{caption}</span>}
      </span>
      {note && <span className="flex-shrink-0 text-[11px] tabular-nums text-mac-muted">{note}</span>}
      <span className="min-w-0 flex-shrink-0 text-right">
        <span className="block text-[13px] font-semibold tabular-nums text-foreground">{value}</span>
        {sub && <span className="mt-0.5 block text-[11px] tabular-nums text-mac-muted">{sub}</span>}
        {right}
      </span>
    </MacRow>
  );
}