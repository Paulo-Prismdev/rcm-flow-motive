import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatCompactGBP } from './opsDashboardHelpers';

const TILES = [
  { key: 'open', label: 'Open Claims', sub: 'total value', danger: false },
  { key: 'overdue', label: 'Overdue Updates', sub: 'need action now', danger: true },
  { key: 'invoice', label: 'Ready to Invoice', sub: 'ready to bill', danger: false },
  { key: 'authority', label: 'Awaiting Authority', sub: 'pending auth', danger: false },
  { key: 'onsite', label: 'On-Site', sub: 'in repair', danger: false },
];

export default function AtAGlanceStrip({ stats, valueTotal }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {TILES.map((tile) => {
        const count = stats[tile.key] || 0;
        const isValue = tile.key === 'open';
        return (
          <button
            key={tile.key}
            onClick={() => navigate(createPageUrl('Claims'))}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[10px] px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group min-h-[104px] flex flex-col justify-between shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {tile.label}
              </span>
              {tile.danger && count > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              )}
            </div>
            <div className="mt-2">
              <span className={`text-[26px] font-bold leading-none tracking-tight ${tile.danger && count > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {isValue ? formatCompactGBP(valueTotal) : count}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{isValue ? `${count} claims` : tile.sub}</span>
              <span className="text-[10px] font-medium text-teal-600 dark:text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity">
                View →
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}