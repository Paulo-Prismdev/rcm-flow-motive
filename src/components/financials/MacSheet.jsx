import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A sheet as macOS shows one: a panel that slides in over the dimmed window. On a
 * phone it takes the whole screen, which is what data-mobile-full-modal asks for.
 */
export default function MacSheet({ title, subtitle, onClose, children, footer, className }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6" data-mobile-full-modal="true">
      <div
        className="absolute inset-0 bg-black/20 animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full max-w-4xl animate-in fade-in slide-in-from-bottom-2 flex-col overflow-hidden rounded-[10px] border border-mac-line bg-mac-group duration-150',
          className
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-mac-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-[11px] text-mac-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-mac-muted transition-colors duration-150 hover:bg-mac-window hover:text-foreground"
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