import React from 'react';
import { FileText, Wallet } from 'lucide-react';

export default function ClaimTypeTabs({ activeTab, onChange, claimsCount = 0, privateCount = 0 }) {
  const base = "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap";
  const inactive = "text-muted-foreground hover:text-foreground";
  const active = "bg-card text-foreground shadow-sm";

  return (
    <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg w-full sm:w-auto">
      <button
        type="button"
        onClick={() => onChange('claims')}
        className={`${base} flex-1 sm:flex-none justify-center ${activeTab === 'claims' ? active : inactive}`}
      >
        <FileText className="w-3.5 h-3.5" />
        Claims
        {claimsCount > 0 && (
          <span className="ml-0.5 text-xs bg-accent text-muted-foreground px-1.5 rounded-full">
            {claimsCount}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => onChange('private')}
        className={`${base} flex-1 sm:flex-none justify-center ${activeTab === 'private' ? active : inactive}`}
      >
        <Wallet className="w-3.5 h-3.5" />
        Paying Privately
        {privateCount > 0 && (
          <span className="ml-0.5 text-xs bg-amber-200 dark:bg-amber-900/50 text-warning-fg px-1.5 rounded-full">
            {privateCount}
          </span>
        )}
      </button>
    </div>
  );
}