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

  const content = (
    <div className="glass p-4 md:p-6 col-span-1 md:col-span-2 card-hover">
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="w-5 h-5 text-accent" />
        <h2 className="text-lg md:text-xl font-bold">Status Breakdown</h2>
      </div>
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-foreground-muted text-sm">Loading...</div>
        ) : statusEntries.length === 0 ? (
          <div className="text-center py-8 text-foreground-muted text-sm">No data available</div>
        ) : (
          statusEntries.map(([status, count]) => {
            const percentage = ((count / activeRecords.length) * 100).toFixed(0);
            return (
              <div key={status} className="glass-flat p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{status}</span>
                  <span className="text-sm text-foreground-muted">{count} ({percentage}%)</span>
                </div>
                <div className="w-full bg-glass-inset rounded-full h-2">
                  <div 
                    className="bg-accent h-2 rounded-full transition-all" 
                    style={{ width: `${percentage}%` }}
                  />
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