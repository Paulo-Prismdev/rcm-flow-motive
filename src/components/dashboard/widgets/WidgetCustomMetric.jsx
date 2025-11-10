import React from 'react';
import { TrendingUp } from 'lucide-react';

export default function WidgetCustomMetric({ config, isEditMode }) {
  const { title = 'Custom Metric', calculation = 'count' } = config;

  return (
    <div className="glass card-hover p-4 md:p-6 h-full">
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div className="glass-flat p-2 md:p-3">
          <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-indigo-500" />
        </div>
      </div>
      <div>
        <p className="text-xs md:text-sm text-foreground-muted mb-1">{title}</p>
        <h3 className="text-2xl md:text-3xl font-bold mb-1">...</h3>
        <p className="text-[10px] md:text-xs text-foreground-subtle">
          {calculation} calculation
        </p>
      </div>
    </div>
  );
}