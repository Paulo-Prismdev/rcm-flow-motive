import React from 'react';
import { useStatusConfigs } from './StatusConfigContext';

export default function StatusBadge({ status }) {
  const { allStatuses, isLoading } = useStatusConfigs();

  const getStatusColor = () => {
    if (isLoading || !status) return 'gray';

    const statusLower = status.toLowerCase();
    
    // Check custom configurations - NO FALLBACKS
    const customStatus = allStatuses.find(s => s.status_name.toLowerCase() === statusLower);
    if (customStatus) {
      return customStatus.color;
    }

    // If no custom config exists, return gray as default
    return 'gray';
  };

  const color = getStatusColor();
  
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
    return <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-gray-200 animate-pulse w-16">&nbsp;</span>
  }

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-md text-white ${colorClasses[color] || 'bg-gray-500'}`}>
      {status}
    </span>
  );
}