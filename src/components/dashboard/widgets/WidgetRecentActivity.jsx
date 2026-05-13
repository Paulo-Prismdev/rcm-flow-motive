import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Clock, FileText, Calculator } from 'lucide-react';
import StatusBadge from '../../shared/StatusBadge';
import { format } from 'date-fns';

export default function WidgetRecentActivity({ config, isEditMode }) {
  const { limit = 5 } = config;

  const { data: claims = [] } = useQuery({
    queryKey: ['claims'],
    queryFn: () => base44.entities.Claim.list('-created_date', limit),
    enabled: !isEditMode,
  });

  const { data: estimates = [] } = useQuery({
    queryKey: ['estimates'],
    queryFn: () => base44.entities.Estimate.list('-created_date', limit),
    enabled: !isEditMode,
  });

  const recentCases = [
    ...claims.slice(0, 3).map(c => ({ ...c, type: 'Claim', dept: 'Claims', link: `${createPageUrl('Claims')}?view=${c.id}` })),
    ...estimates.slice(0, 2).map(e => ({ ...e, type: 'Estimate', dept: 'Estimating', link: `${createPageUrl('Estimating')}?view=${e.id}` })),
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, limit);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 col-span-1 md:col-span-2 lg:col-span-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-700">Recent Activity</h2>
        </div>
      </div>

      {isEditMode ? (
        <div className="text-center py-10 text-slate-400 text-sm">Preview not available in edit mode</div>
      ) : recentCases.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">No recent activity</div>
      ) : (
        <div className="divide-y divide-slate-50">
          {recentCases.map((item) => (
            <Link key={item.id} to={item.link}>
              <div className="flex items-center gap-4 py-3 hover:bg-slate-50 rounded-xl px-2 transition-colors group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.type === 'Claim' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                  {item.type === 'Claim'
                    ? <FileText className="w-4 h-4 text-blue-500" />
                    : <Calculator className="w-4 h-4 text-emerald-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">
                    {item.reg || item.name || item.reference || 'Untitled'}
                  </p>
                  <p className="text-xs text-slate-400">{item.dept}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={item.job_status || item.status || 'New'} />
                  <span className="text-[11px] text-slate-400 w-12 text-right">{format(new Date(item.created_date), 'MMM d')}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}