import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { PieChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function WidgetStatusBreakdown({ config, isEditMode }) {
  const { department, entity, statusField } = config;

  const { data: records = [], isLoading } = useQuery({
    queryKey: [entity.toLowerCase(), 'status'],
    queryFn: () => base44.entities[entity].list('-created_date', 1000),
    enabled: !isEditMode,
  });

  const activeRecords = records.filter(r => !r.archived);
  
  // Count by status
  const statusCounts = {};
  activeRecords.forEach(r => {
    const status = r[statusField] || 'Unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const statusEntries = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);

  const BAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-rose-500','bg-cyan-500','bg-amber-500'];

  const content = (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 p-5 col-span-1 md:col-span-2">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
            <PieChart className="w-4 h-4 text-violet-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-700">Status Breakdown</h2>
        </div>
        <span className="text-[11px] text-slate-400">{activeRecords.length} records</span>
      </div>
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}</div>
        ) : statusEntries.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">No data available</div>
        ) : (
          statusEntries.slice(0, 6).map(([status, count], i) => {
            const percentage = ((count / activeRecords.length) * 100).toFixed(0);
            return (
              <div key={status}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[140px]">{status}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400">{count}</span>
                    <span className="text-[11px] font-semibold text-slate-500 w-9 text-right">{percentage}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  if (isEditMode) {
    return content;
  }

  return (
    <Link to={createPageUrl(department)} className="block">
      {content}
    </Link>
  );
}