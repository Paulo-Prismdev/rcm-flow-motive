import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clock, User, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

export default function TimeLogSection({ parentId, parentType }) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: timeLogs = [], isLoading } = useQuery({
    queryKey: ['timeLogs', parentId],
    queryFn: () => base44.entities.TimeLog.filter({ parent_id: parentId }, '-created_date'),
    enabled: !!parentId,
  });

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const totalSeconds = timeLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);

  return (
    <div className="neomorph-flat p-4 md:p-6">
      <div className="flex justify-between items-center">
        <button 
          className="flex items-center gap-3 text-left flex-grow"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Clock className="w-5 h-5 text-gold" />
          <h3 className="font-bold">Time Activity</h3>
        </button>
        <div className="flex items-center gap-3">
          <div className="neomorph-flat px-4 py-2">
            <span className="text-sm text-gray-500">Total: </span>
            <span className="font-bold text-gold">{formatDuration(totalSeconds)}</span>
          </div>
          <button onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-gray-300 border-opacity-50">
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {isLoading && <p className="text-sm text-gray-500">Loading activity...</p>}
            {!isLoading && timeLogs.length === 0 && (
              <p className="text-sm text-center text-gray-500 py-4">No time logged yet.</p>
            )}
            
            {timeLogs.map(log => (
              <div key={log.id} className="neomorph-inset p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{log.created_by}</span>
                  </div>
                  <span className="text-sm font-bold text-gold">{formatDuration(log.duration_seconds)}</span>
                </div>
                <div className="text-xs text-gray-500 flex justify-between">
                  <span>Started: {format(new Date(log.started_at), 'dd/MM/yyyy HH:mm')}</span>
                  <span>Ended: {format(new Date(log.ended_at), 'dd/MM/yyyy HH:mm')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}