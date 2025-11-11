import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { X, Clock, User, Edit, Trash2, Archive, Eye, FileText, Mail, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

const actionIcons = {
  'Create': FileText,
  'Update': Edit,
  'Delete': Trash2,
  'View': Eye,
  'Archive': Archive,
  'Unarchive': Archive,
  'Export': Download,
  'Download': Download,
  'Upload': Upload,
  'Email Sent': Mail,
  'Status Change': Clock,
  'Other': FileText,
};

const actionTypeColors = {
  'Create': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
  'Update': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
  'Delete': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200',
  'View': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200',
  'Archive': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200',
  'Unarchive': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200',
  'Export': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-200',
  'Download': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-200',
  'Upload': 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-200',
  'Email Sent': 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-200',
  'Status Change': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
  'Other': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200',
};

export default function ItemActivityLog({ isOpen, onClose, entityType, entityId, entityReference }) {
  const [selectedLog, setSelectedLog] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activityLogs', entityType, entityId],
    queryFn: async () => {
      const allLogs = await base44.entities.ActivityLog.list('-created_date', 500);
      // Filter logs for this specific item
      return allLogs.filter(log => 
        log.entity_type === entityType && log.entity_id === entityId
      );
    },
    enabled: isOpen && currentUser?.role === 'admin',
  });

  if (!isOpen) return null;

  // Check if user is admin
  if (currentUser?.role !== 'admin') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="neomorph-elevated max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-foreground-muted mb-4">Only administrators can view activity logs.</p>
            <Button onClick={onClose} className="neomorph-flat">Close</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="neomorph-elevated max-w-4xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="p-6 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Activity History</h2>
                <p className="text-sm text-foreground-muted mt-1">
                  {entityType} {entityReference && `• ${entityReference}`} • {logs.length} activities
                </p>
              </div>
              <Button onClick={onClose} className="neomorph-flat p-2">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="text-center py-12 text-foreground-muted">Loading activity history...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto mb-4 text-foreground-muted" />
                <p className="text-foreground-muted">No activity recorded yet for this item.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log, index) => {
                  const Icon = actionIcons[log.action_type] || FileText;
                  const isFirst = index === 0;
                  const isLast = index === logs.length - 1;
                  
                  return (
                    <div key={log.id} className="relative">
                      {/* Timeline line */}
                      {!isLast && (
                        <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border" />
                      )}
                      
                      <div className="flex gap-4">
                        {/* Timeline dot */}
                        <div className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isFirst ? 'bg-accent text-accent-foreground' : 'bg-surface border-2 border-border'}`}>
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* Content */}
                        <div 
                          className="flex-1 neomorph-flat p-4 rounded-xl cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => setSelectedLog(log)}
                        >
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${actionTypeColors[log.action_type] || actionTypeColors['Other']}`}>
                                  {log.action_type}
                                </span>
                                {isFirst && (
                                  <span className="text-xs text-accent font-medium">Latest</span>
                                )}
                              </div>
                              <p className="text-sm mb-2">{log.description}</p>
                              <div className="flex items-center gap-3 text-xs text-foreground-muted">
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <span>{log.user_name || log.user_email}</span>
                                </div>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{format(new Date(log.created_date), 'dd/MM/yyyy HH:mm')}</span>
                                </div>
                              </div>
                            </div>
                            {log.changes && Object.keys(log.changes).length > 0 && (
                              <div className="text-xs px-2 py-1 rounded bg-accent/20 text-accent">
                                {Object.keys(log.changes).length} change{Object.keys(log.changes).length > 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={() => setSelectedLog(null)}>
          <div className="neomorph-elevated max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Activity Details</h3>
              <Button onClick={() => setSelectedLog(null)} className="neomorph-flat p-2">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="neomorph-inset p-4 rounded-xl">
                <label className="text-xs text-foreground-muted block mb-1">Action Type</label>
                <span className={`inline-block px-3 py-1 text-sm font-medium rounded ${actionTypeColors[selectedLog.action_type] || actionTypeColors['Other']}`}>
                  {selectedLog.action_type}
                </span>
              </div>

              <div className="neomorph-inset p-4 rounded-xl">
                <label className="text-xs text-foreground-muted block mb-1">Description</label>
                <p className="text-sm">{selectedLog.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="neomorph-inset p-4 rounded-xl">
                  <label className="text-xs text-foreground-muted block mb-1">User</label>
                  <p className="text-sm font-medium">{selectedLog.user_name}</p>
                  <p className="text-xs text-foreground-muted">{selectedLog.user_email}</p>
                </div>

                <div className="neomorph-inset p-4 rounded-xl">
                  <label className="text-xs text-foreground-muted block mb-1">Date/Time</label>
                  <p className="text-sm font-medium">{format(new Date(selectedLog.created_date), 'dd/MM/yyyy')}</p>
                  <p className="text-xs text-foreground-muted">{format(new Date(selectedLog.created_date), 'HH:mm:ss')}</p>
                </div>
              </div>

              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div className="neomorph-inset p-4 rounded-xl">
                  <label className="text-xs text-foreground-muted block mb-3">Changes Made</label>
                  <div className="space-y-3">
                    {Object.entries(selectedLog.changes).map(([field, change]) => (
                      <div key={field} className="pb-3 border-b border-border last:border-0 last:pb-0">
                        <p className="text-sm font-medium mb-2">{field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                            <span className="font-mono">-</span>
                            <span className="flex-1 break-all">{JSON.stringify(change.old)}</span>
                          </div>
                          <div className="flex items-start gap-2 text-green-600 dark:text-green-400">
                            <span className="font-mono">+</span>
                            <span className="flex-1 break-all">{JSON.stringify(change.new)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.user_agent && (
                <div className="neomorph-inset p-4 rounded-xl">
                  <label className="text-xs text-foreground-muted block mb-1">Browser/Device</label>
                  <p className="text-xs break-all">{selectedLog.user_agent}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}