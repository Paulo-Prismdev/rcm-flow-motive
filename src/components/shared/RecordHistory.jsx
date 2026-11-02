import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronRight, History } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * A record's change history (who changed what, and when), folded away until opened.
 * Used on directory records; claims have their own fuller Activity Log section.
 */
export default function RecordHistory({ recordId }) {
  const [open, setOpen] = useState(false);
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activityLogs', recordId],
    queryFn: () => base44.entities.ActivityLog.filter({ parent_id: recordId }, '-created_date', 200),
    enabled: open && !!recordId,
  });
  if (!recordId) return null;

  return (
    <div className="border-t pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
        <History className="h-3.5 w-3.5" /> Change history
      </button>
      {open && (
        <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
          {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {!isLoading && logs.length === 0 && <p className="text-xs text-muted-foreground">No changes recorded yet.</p>}
          {logs.map((log) => (
            <div key={log.id} className="rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
              <div className="flex justify-between gap-2 text-muted-foreground">
                <span className="truncate">{log.user_name || log.user_email || 'System'}</span>
                <span className="flex-shrink-0">{log.created_date ? format(new Date(log.created_date), 'd MMM yyyy, HH:mm') : ''}</span>
              </div>
              <p className="mt-0.5 text-foreground">
                {log.field_name
                  ? <>{log.field_name}: <span className="text-muted-foreground line-through">{log.old_value || '—'}</span> → {log.new_value || '—'}</>
                  : log.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
