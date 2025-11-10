import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function WidgetStatCard({ config, isEditMode }) {
  const { title = 'Stat Card', entity = 'Claim', color = 'blue' } = config;

  const { data: records = [], isLoading } = useQuery({
    queryKey: [entity.toLowerCase(), 'count'],
    queryFn: () => base44.entities[entity].list('-created_date', 1000),
    enabled: !isEditMode,
  });

  const openCount = records.filter(r => {
    if (entity === 'Claim') return r.job_status !== 'Completed' && r.job_status !== 'Cancelled';
    if (entity === 'Estimate') return r.status !== 'Completed' && r.status !== 'Cancelled';
    if (entity === 'Engineering') return r.status !== 'Completed' && r.status !== 'Cancelled';
    if (entity === 'Part') return r.sourcing_status !== 'Delivered' && r.sourcing_status !== 'Cancelled';
    return true;
  }).length;

  const colorClasses = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    orange: 'text-orange-500',
    red: 'text-red-500',
    purple: 'text-purple-500',
    pink: 'text-pink-500',
  };

  // Map entity to page name
  const pageMap = {
    'Claim': 'Claims',
    'Estimate': 'Estimating',
    'Engineering': 'Engineering',
    'Part': 'Parts',
  };

  const pageName = pageMap[entity] || 'Dashboard';

  const content = (
    <div className="glass card-hover p-4 md:p-6 h-full">
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div className="glass-flat p-2 md:p-3">
          <TrendingUp className={`w-5 h-5 md:w-6 md:h-6 ${colorClasses[color]}`} />
        </div>
      </div>
      <div>
        <p className="text-xs md:text-sm text-foreground-muted mb-1">{title}</p>
        <h3 className="text-2xl md:text-3xl font-bold mb-1">
          {isLoading ? '...' : openCount}
        </h3>
        <p className="text-[10px] md:text-xs text-foreground-subtle">
          {records.length} total
        </p>
      </div>
    </div>
  );

  if (isEditMode) {
    return content;
  }

  return (
    <Link to={createPageUrl(pageName)} className="block h-full">
      {content}
    </Link>
  );
}