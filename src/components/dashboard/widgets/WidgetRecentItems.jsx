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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 col-span-1 md:col-span-2 lg:col-span-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-700">Recent {department}</h2>
        </div>
        <span className="text-[11px] text-slate-400">{records.filter(r => !r.archived).length} items</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : records.filter(r => !r.archived).length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">No recent items</div>
      ) : (
        <div className="divide-y divide-slate-50">
          {records.filter(r => !r.archived).map((item) => (
            <Link key={item.id} to={getPageUrl(item)}>
              <div className="flex items-center gap-4 py-3 px-2 hover:bg-slate-50 rounded-xl transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{getItemDisplayName(item)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{format(new Date(item.created_date), 'MMM d, yyyy')}</p>
                </div>
                <StatusBadge status={getItemStatus(item)} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}