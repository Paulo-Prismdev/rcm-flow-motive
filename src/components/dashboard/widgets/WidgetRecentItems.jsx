import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Clock } from 'lucide-react';
import StatusBadge from '../../shared/StatusBadge';
import { format } from 'date-fns';
import { formatUKRegistration } from '../../shared/formatRegistration';

export default function WidgetRecentItems({ config, isEditMode }) {
  const { department, entity, limit = 10 } = config;

  const { data: records = [], isLoading } = useQuery({
    queryKey: [entity.toLowerCase(), 'recent'],
    queryFn: () => base44.entities[entity].list('-created_date', limit),
    enabled: !isEditMode,
  });

  const getItemDisplayName = (item) => {
    if (item.reg) return formatUKRegistration(item.reg);
    if (item.vehicle_ref) return formatUKRegistration(item.vehicle_ref);
    return item.name || item.reference || 'Untitled';
  };

  const getItemStatus = (item) => {
    return item.job_status || item.status || item.sourcing_status || 'New';
  };

  const getPageUrl = (item) => {
    return `${createPageUrl(department)}?view=${item.id}`;
  };

  return (
    <div className="glass p-4 md:p-6 col-span-1 md:col-span-2 lg:col-span-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent" />
          <h2 className="text-lg md:text-xl font-bold">Recent {department}</h2>
        </div>
      </div>
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-foreground-muted text-sm">Loading...</div>
        ) : records.filter(r => !r.archived).length === 0 ? (
          <div className="text-center py-8 text-foreground-muted text-sm">No recent items</div>
        ) : (
          records.filter(r => !r.archived).map((item) => (
            <Link key={item.id} to={getPageUrl(item)}>
              <div className="glass-flat p-3 md:p-4 flex items-center justify-between hover:scale-[1.01] transition-all">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm md:text-base">
                    {getItemDisplayName(item)}
                  </p>
                  <p className="text-xs text-foreground-muted mt-1">
                    {format(new Date(item.created_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <StatusBadge status={getItemStatus(item)} />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}