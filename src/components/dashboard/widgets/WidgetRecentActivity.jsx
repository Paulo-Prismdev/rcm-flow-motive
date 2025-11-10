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
    ...claims.slice(0, 3).map(c => ({ ...c, type: 'Claim', dept: 'Claims', link: createPageUrl(`Claims?view=${c.id}`) })),
    ...estimates.slice(0, 2).map(e => ({ ...e, type: 'Estimate', dept: 'Estimating', link: createPageUrl(`Estimating?view=${e.id}`) })),
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, limit);

  return (
    <div className="glass p-4 md:p-6 col-span-1 md:col-span-2 lg:col-span-4">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent" />
          Recent Activity
        </h2>
      </div>
      <div className="space-y-3 md:space-y-4">
        {isEditMode ? (
          <div className="text-center py-8 text-foreground-muted text-sm">
            Preview not available in edit mode
          </div>
        ) : recentCases.length === 0 ? (
          <div className="text-center py-8 text-foreground-muted text-sm">
            No recent activity
          </div>
        ) : (
          recentCases.map((item) => (
            <Link key={item.id} to={item.link}>
              <div className="glass-flat p-3 md:p-4 flex items-center justify-between hover:scale-[1.02] transition-all">
                <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                  <div className="glass-flat p-2 md:p-3 flex-shrink-0">
                    {item.type === 'Claim' ? <FileText className="w-4 h-4 md:w-5 md:h-5 text-blue-600" /> : <Calculator className="w-4 h-4 md:w-5 md:h-5 text-green-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm md:text-base">
                      {item.reg || item.name || item.reference || 'Untitled'}
                    </p>
                    <p className="text-xs md:text-sm text-foreground-muted">{item.dept}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <StatusBadge status={item.job_status || item.status || 'New'} />
                  <p className="text-[10px] md:text-xs text-foreground-subtle mt-2">
                    {format(new Date(item.created_date), 'MMM d')}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}