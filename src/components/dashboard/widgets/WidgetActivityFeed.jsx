import React from 'react';
import { Activity } from 'lucide-react';

export default function WidgetActivityFeed({ config, isEditMode }) {
  const { limit = 10 } = config;

  return (
    <div className="glass p-4 md:p-6 col-span-1 md:col-span-2">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-accent" />
        <h2 className="text-lg md:text-xl font-bold">Activity Feed</h2>
      </div>
      <div className="space-y-3">
        {isEditMode ? (
          <div className="text-center py-8 text-foreground-muted text-sm">
            Preview not available in edit mode
          </div>
        ) : (
          <div className="text-center py-8 text-foreground-muted text-sm">
            No recent activity
          </div>
        )}
      </div>
    </div>
  );
}