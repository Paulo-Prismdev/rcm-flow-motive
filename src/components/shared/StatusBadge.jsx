import React from 'react';
import { useStatusConfigs } from './StatusConfigContext';

export default function StatusBadge({ status, variant = "primary" }) {
  const { allStatuses, isLoading } = useStatusConfigs();

  const getStatusColor = (statusName) => {
    if (!statusName) return 'gray';

    const statusLower = statusName.toLowerCase();
    
    // Check custom configurations - NO FALLBACKS
    const customStatus = allStatuses.find(s => s.status_name.toLowerCase() === statusLower);
    if (customStatus) {
      return customStatus.color;
    }

    // If no custom config exists, return gray as default
    return 'gray';
  };

  const colorClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
    gray: 'bg-gray-500',
    pink: 'bg-pink-500',
    indigo: 'bg-indigo-500',
    teal: 'bg-teal-500',
    cyan: 'bg-cyan-500',
    lime: 'bg-lime-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    slate: 'bg-slate-500'
  };

  if (isLoading) {
    return <span className="inline-flex items-center px-[10px] h-6 rounded-[6px] text-[12px] font-semibold bg-gray-200 animate-pulse w-16">&nbsp;</span>
  }

  // Handle array of statuses - render multiple badges
  if (Array.isArray(status)) {
    if (status.length === 0) {
      return <span className="inline-flex items-center px-[10px] h-6 rounded-[6px] text-[12px] font-semibold bg-gray-200 text-gray-500">No status</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {status.map((s, index) => (
          <span 
            key={index}
            className={`inline-flex items-center px-[10px] h-6 rounded-[6px] text-[12px] font-semibold text-white ${colorClasses[getStatusColor(s)] || 'bg-gray-500'}`}
          >
            {s}
          </span>
        ))}
      </div>
    );
  }

  // Handle single status
  if (!status) {
    return <span className="inline-flex items-center px-[10px] h-6 rounded-[6px] text-[12px] font-semibold bg-gray-200 text-gray-500">No status</span>;
  }

  // Secondary variant - outlined style
  if (variant === "secondary") {
    return (
      <span className={`inline-flex items-center px-[10px] h-6 rounded-[6px] text-[12px] font-semibold border-2 ${colorClasses[getStatusColor(status)]?.replace('bg-', 'border-') || 'border-gray-500'} ${colorClasses[getStatusColor(status)]?.replace('bg-', 'text-') || 'text-gray-500'} bg-transparent`}>
        {status}
      </span>
    );
  }

  // Primary variant - filled style (default)
  return (
    <span className={`inline-flex items-center px-[10px] h-6 rounded-[6px] text-[12px] font-semibold text-white ${colorClasses[getStatusColor(status)] || 'bg-gray-500'}`}>
      {status}
    </span>
  );
}