import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatCompactGBP } from './opsDashboardHelpers';

const TILES = [
  { key: 'open', label: 'Open Claims', accent: '#0F172A', sub: 'total value' },
  { key: 'overdue', label: 'Overdue Updates', accent: '#DC2626', sub: 'need action now', danger: true },
  { key: 'invoice', label: 'Ready to Invoice', accent: '#0D9488', sub: 'ready to bill' },
  { key: 'authority', label: 'Awaiting Authority', accent: '#D97706', sub: 'pending auth' },
  { key: 'onsite', label: 'On-Site', accent: '#06b6d4', sub: 'in repair' },
];

export default function AtAGlanceStrip({ stats, valueTotal }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-[#E2E8F0] border border-[#E2E8F0]">
      {TILES.map((tile) => {
        const count = stats[tile.key] || 0;
        const isValue = tile.key === 'open';
        return (
          <button
            key={tile.key}
            onClick={() => navigate(createPageUrl('Claims'))}
            className="bg-white dark:bg-slate-900 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group min-h-[104px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                {tile.label}
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: tile.accent }}
              />
            </div>
            <div className="mt-2">
              <span
                className={`font-display font-bold text-[28px] leading-none tracking-tight ${tile.danger && count > 0 ? 'text-[#DC2626]' : 'text-[#0F172A] dark:text-slate-100'}`}
              >
                {isValue ? formatCompactGBP(valueTotal) : count}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-[#64748B]">{isValue ? `${count} claims` : tile.sub}</span>
              <span className="text-[10px] font-medium text-[#0D9488] opacity-0 group-hover:opacity-100 transition-opacity">
                View →
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}