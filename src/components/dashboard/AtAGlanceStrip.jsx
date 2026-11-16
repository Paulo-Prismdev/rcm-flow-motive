import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatCompactGBP } from './opsDashboardHelpers';

const TILES = [
  { key: 'open', label: 'Open claims', sub: 'total value', danger: false },
  { key: 'overdue', label: 'Overdue updates', sub: 'need action now', danger: true },
  { key: 'invoice', label: 'Ready to invoice', sub: 'ready to bill', danger: false },
  { key: 'authority', label: 'Awaiting authority', sub: 'pending auth', danger: false },
  { key: 'onsite', label: 'On site', sub: 'in repair', danger: false },
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
            className="bg-card border border-border rounded-xl px-4 py-3.5 text-left hover:bg-muted transition-colors group min-h-[104px] flex flex-col justify-between shadow-card"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                {tile.label}
              </span>
              {tile.danger && count > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-danger" />
              )}
            </div>
            <div className="mt-2">
              <span className={`text-[26px] font-bold leading-none tracking-tight ${tile.danger && count > 0 ? 'text-danger-fg' : 'text-foreground'}`}>
                {isValue ? formatCompactGBP(valueTotal) : count}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-muted-foreground">{isValue ? `${count} claims` : tile.sub}</span>
              <span className="text-xs font-medium text-link opacity-0 group-hover:opacity-100 transition-opacity">
                View →
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}