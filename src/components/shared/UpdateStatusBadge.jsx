import React from 'react';
import { Clock, AlertCircle, CheckCircle, Pause, XCircle } from 'lucide-react';

export default function UpdateStatusBadge({ status, small = false }) {
  if (!status) return null;

  const configs = {
    Red: {
      bg: 'bg-red-500',
      text: 'text-white',
      icon: AlertCircle,
      label: 'Overdue',
      description: 'Update overdue'
    },
    Amber: {
      bg: 'bg-orange-500',
      text: 'text-white',
      icon: Clock,
      label: 'Due Soon',
      description: 'Update due soon'
    },
    Green: {
      bg: 'bg-green-500',
      text: 'text-white',
      icon: CheckCircle,
      label: 'On Track',
      description: 'On track'
    },
    Blue: {
      bg: 'bg-blue-500',
      text: 'text-white',
      icon: Pause,
      label: 'Snoozed',
      description: 'Update tracking paused'
    },
    Gray: {
      bg: 'bg-gray-500',
      text: 'text-white',
      icon: XCircle,
      label: 'Closed',
      description: 'Claim closed'
    }
  };

  const config = configs[status] || configs.Gray;
  const Icon = config.icon;

  if (small) {
    return (
      <span 
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${config.bg} ${config.text}`}
        title={config.description}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  }

  return (
    <span 
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium ${config.bg} ${config.text}`}
      title={config.description}
    >
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
}