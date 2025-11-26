import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { History, User, Clock } from 'lucide-react';

export default function ActivityLogSection({ parentId, parentType }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activityLogs', parentId],
    queryFn: () => base44.entities.ActivityLog.filter({ parent_id: parentId }, '-created_date', 500),
    enabled: !!parentId,
  });

  if (isLoading) {
    return (
      <div className="neomorph-flat p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <History className="w-5 h-5 text-gold" />
          <h3 className="font-bold">Activity Log</h3>
        </div>
        <div className="text-center py-8 text-foreground-muted">Loading activity...</div>
      </div>
    );
  }

  return (
    <div className="neomorph-flat p-4 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <History className="w-5 h-5 text-gold" />
        <h3 className="font-bold">Activity Log</h3>
        <span className="text-xs text-foreground-muted">({logs.length} entries)</span>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8 text-foreground-muted">
          No activity recorded yet
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="neomorph-inset p-3 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{log.user_name || log.user_email || 'System'}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent font-medium">
                      {log.action}
                    </span>
                  </div>
                  <p className="text-sm text-foreground-muted mt-1">{log.description}</p>
                  {log.field_name && log.old_value !== undefined && log.new_value !== undefined && (
                    <div className="mt-2 text-xs bg-surface p-2 rounded">
                      <span className="text-foreground-muted">{log.field_name}: </span>
                      <span className="line-through text-red-500">{log.old_value || '(empty)'}</span>
                      <span className="mx-2">→</span>
                      <span className="text-green-500">{log.new_value || '(empty)'}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-xs text-foreground-subtle">
                    <Clock className="w-3 h-3" />
                    {format(new Date(log.created_date), 'dd MMM yyyy, HH:mm')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}