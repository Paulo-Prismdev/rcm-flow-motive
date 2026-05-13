import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function WidgetDepartmentStats({ config, isEditMode }) {
  const { department, entity } = config;

  const { data: records = [], isLoading } = useQuery({
    queryKey: [entity.toLowerCase(), 'all'],
    queryFn: () => base44.entities[entity].list('-created_date', 1000),
    enabled: !isEditMode,
  });

  const activeRecords = records.filter(r => !r.archived);
  const completedThisMonth = records.filter(r => {
    const completionDate = r.completion_date || r.date_authorised || r.report_completed_date;
    if (!completionDate) return false;
    const date = new Date(completionDate);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const inProgress = activeRecords.filter(r => {
    const status = r.job_status || r.status || r.sourcing_status;
    return status && status.toLowerCase().includes('progress');
  });

  const stats = [
    { label: 'Total Active', value: activeRecords.length, icon: TrendingUp, color: 'text-blue-500' },
    { label: 'In Progress', value: inProgress.length, icon: Clock, color: 'text-orange-500' },
    { label: 'Completed This Month', value: completedThisMonth.length, icon: CheckCircle, color: 'text-green-500' },
  ];

  const content = (
    <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-200 p-5 col-span-1 md:col-span-2 lg:col-span-4">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold">{department} Overview</h2>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{activeRecords.length} active</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-muted rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-card shadow-sm flex items-center justify-center flex-shrink-0">
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{stat.label}</p>
                <p className="text-2xl font-bold tabular-nums">{isLoading ? '–' : stat.value}</p>
              </div>
            </div>
          );
        })}
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