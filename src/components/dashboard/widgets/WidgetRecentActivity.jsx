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
    <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-sm p-5 col-span-1 md:col-span-2 lg:col-span-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <h2 className="text-sm font-bold">Recent Activity</h2>
        </div>
      </div>

      {isEditMode ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Preview not available in edit mode</div>
      ) : recentCases.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">No recent activity</div>
      ) : (
        <div className="divide-y divide-border">
          {recentCases.map((item) => (
            <Link key={item.id} to={item.link}>
              <div className="flex items-center gap-4 py-3 hover:bg-muted rounded-xl px-2 transition-colors group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.type === 'Claim' ? 'bg-blue-500/10' : 'bg-emerald-500/10'}`}>
                  {item.type === 'Claim'
                    ? <FileText className="w-4 h-4 text-blue-500" />
                    : <Calculator className="w-4 h-4 text-emerald-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {item.reg || item.name || item.reference || 'Untitled'}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.dept}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={item.job_status || item.status || 'New'} />
                  <span className="text-[11px] text-muted-foreground w-12 text-right">{format(new Date(item.created_date), 'MMM d')}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}