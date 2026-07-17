import React from 'react';
import { FileText, Wallet } from 'lucide-react';

export default function ClaimTypeTabs({ activeTab, onChange, claimsCount = 0, privateCount = 0 }) {
  const base = "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap";
  const inactive = "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300";
  const active = "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm";

  return (
    <div className="inline-flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-full sm:w-auto">
      <button
        type="button"
        onClick={() => onChange('claims')}
        className={`${base} flex-1 sm:flex-none justify-center ${activeTab === 'claims' ? active : inactive}`}
      >
        <FileText className="w-3.5 h-3.5" />
        Claims
        {claimsCount > 0 && (
          <span className="ml-0.5 text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 rounded-full">
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
          <span className="ml-0.5 text-[10px] bg-amber-200 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-1.5 rounded-full">
            {privateCount}
          </span>
        )}
      </button>
    </div>
  );
}