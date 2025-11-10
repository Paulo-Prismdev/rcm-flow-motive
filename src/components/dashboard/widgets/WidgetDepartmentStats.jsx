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
    <div className="glass p-4 md:p-6 col-span-1 md:col-span-2 lg:col-span-4 card-hover">
      <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6">{department} Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-flat p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="glass-flat p-2">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className="text-xs text-foreground-muted">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold">{isLoading ? '...' : stat.value}</p>
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