import React from 'react';
import { Check } from 'lucide-react';

/** One of the ways the client can be set, opening up when it is the chosen one. */
export default function IntakeClientOption({ selected, disabled = false, onClick, icon: Icon, title, subtitle, children }) {
  return (
    <div className={`rounded-lg border px-2.5 py-1.5 ${selected ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'border-border'}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="flex w-full items-start gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${selected ? 'border-purple-500 bg-purple-500' : 'border-muted-foreground/40'}`}>
          {selected && <Check className="w-2.5 h-2.5 text-white" />}
        </span>
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-px" />}
        <span className="min-w-0">
          <span className="block text-xs font-medium text-foreground">{title}</span>
          {subtitle && <span className="block text-[10px] text-muted-foreground">{subtitle}</span>}
        </span>
      </button>
      {selected && children && <div className="mt-2 space-y-1.5">{children}</div>}
    </div>
  );
}