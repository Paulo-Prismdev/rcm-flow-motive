import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

import useEscapeToClose from '@/hooks/useEscapeToClose';
/**
 * A sheet as macOS shows one: a panel that slides in over the dimmed window. On a
 * phone it takes the whole screen, which is what data-mobile-full-modal asks for.
 */
export default function MacSheet({ title, subtitle, onClose, children, footer, className }) {
  useEscapeToClose(onClose);
  return (
    <div className="fixed inset-0 z-window flex items-center justify-center p-0 sm:p-6" data-mobile-full-modal="true">
      <div
        className="absolute inset-0 fm-scrim animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full max-w-4xl animate-in fade-in slide-in-from-bottom-2 flex-col overflow-hidden rounded-2xl fm-glass-window text-foreground duration-150',
          className
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-mac-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-xs text-mac-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-mac-muted transition-colors duration-150 hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-mac-line px-3 py-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}