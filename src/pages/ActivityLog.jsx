import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Search, Filter, Download, Eye, X, Calendar } from 'lucide-react';

const actionTypeColors = {
  'Create': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Update': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Delete': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'View': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  'Archive': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Unarchive': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Export': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'Download': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'Upload': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'Email Sent': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'Status Change': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Other': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export default function ActivityLogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activityLogs'],
    queryFn: () => base44.entities.ActivityLog.list('-created_date', 1000),
    enabled: currentUser?.role === 'admin',
  });

  // Get unique values for filters
  const uniqueUsers = [...new Set(logs.map(l => l.user_email).filter(Boolean))].sort();
  const uniqueEntities = [...new Set(logs.map(l => l.entity_type).filter(Boolean))].sort();

  // Filter logs based on criteria
  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm ||
      log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = !filterAction || log.action_type === filterAction;
    const matchesEntity = !filterEntity || log.entity_type === filterEntity;
    const matchesUser = !filterUser || log.user_email === filterUser;

    // Date filtering
    let matchesDate = true;
    if (dateFilter !== 'all' && log.created_date) {
      const logDate = new Date(log.created_date);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      if (dateFilter === 'today') {
        matchesDate = logDate >= today;
      } else if (dateFilter === 'week') {
        matchesDate = logDate >= weekAgo;
      } else if (dateFilter === 'month') {
        matchesDate = logDate >= monthAgo;
      }
    }

    return matchesSearch && matchesAction && matchesEntity && matchesUser && matchesDate;
  });

  const exportLogs = () => {
    const csv = [
      ['Date/Time', 'User', 'Action', 'Entity Type', 'Reference', 'Description'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_date), 'yyyy-MM-dd HH:mm:ss'),
        log.user_name || log.user_email,
        log.action_type,
        log.entity_type,
        log.entity_reference || '',
        `"${(log.description || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-foreground-muted">Only administrators can view activity logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="neomorph p-4 md:p-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Activity Log</h1>
            <p className="text-sm text-foreground-muted mt-1">
              Complete audit trail of all user actions • {filteredLogs.length} of {logs.length} shown
            </p>
          </div>
          <Button onClick={exportLogs} className="neomorph-flat flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by description, reference, or user..."
                className="pl-10 neomorph-inset"
              />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              className="neomorph-flat px-4"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="neomorph-inset p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-foreground-muted mb-1">Date Range</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="neomorph-inset w-full px-3 py-2 rounded-lg text-sm"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-foreground-muted mb-1">Action Type</label>
                  <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="neomorph-inset w-full px-3 py-2 rounded-lg text-sm"
                  >
                    <option value="">All Actions</option>
                    {Object.keys(actionTypeColors).map(action => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-foreground-muted mb-1">Entity Type</label>
                  <select
                    value={filterEntity}
                    onChange={(e) => setFilterEntity(e.target.value)}
                    className="neomorph-inset w-full px-3 py-2 rounded-lg text-sm"
                  >
                    <option value="">All Entities</option>
                    {uniqueEntities.map(entity => (
                      <option key={entity} value={entity}>{entity}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-foreground-muted mb-1">User</label>
                  <select
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    className="neomorph-inset w-full px-3 py-2 rounded-lg text-sm"
                  >
                    <option value="">All Users</option>
                    {uniqueUsers.map(user => (
                      <option key={user} value={user}>{user}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(filterAction || filterEntity || filterUser || dateFilter !== 'all') && (
                <Button
                  onClick={() => {
                    setFilterAction('');
                    setFilterEntity('');
                    setFilterUser('');
                    setDateFilter('all');
                  }}
                  className="neomorph-flat px-3 py-1 text-sm"
                >
                  <X className="w-3 h-3 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {isLoading ? (
          <div className="text-center py-12">Loading activity logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="neomorph p-12 text-center">
            <p className="text-foreground-muted">No activity logs found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="neomorph card-hover p-4 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-md ${actionTypeColors[log.action_type] || actionTypeColors['Other']}`}>
                        {log.action_type}
                      </span>
                      <span className="text-sm font-medium">{log.entity_type}</span>
                      {log.entity_reference && (
                        <span className="text-xs font-mono px-2 py-1 rounded bg-accent/20 text-accent">
                          {log.entity_reference}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm mb-2">{log.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-foreground-muted">
                      <span>{log.user_name || log.user_email}</span>
                      <span>•</span>
                      <span>{format(new Date(log.created_date), 'dd/MM/yyyy HH:mm:ss')}</span>
                    </div>
                  </div>
                  
                  <Button className="neomorph-flat p-2">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLog(null)}>
          <div className="neomorph-elevated max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Activity Details</h2>
              <Button onClick={() => setSelectedLog(null)} className="neomorph-flat p-2">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-foreground-muted">Action Type</label>
                <p className="font-medium">{selectedLog.action_type}</p>
              </div>

              <div>
                <label className="text-xs text-foreground-muted">Entity</label>
                <p className="font-medium">{selectedLog.entity_type} {selectedLog.entity_reference && `(${selectedLog.entity_reference})`}</p>
              </div>

              <div>
                <label className="text-xs text-foreground-muted">Description</label>
                <p className="font-medium">{selectedLog.description}</p>
              </div>

              <div>
                <label className="text-xs text-foreground-muted">User</label>
                <p className="font-medium">{selectedLog.user_name} ({selectedLog.user_email})</p>
              </div>

              <div>
                <label className="text-xs text-foreground-muted">Date/Time</label>
                <p className="font-medium">{format(new Date(selectedLog.created_date), 'dd/MM/yyyy HH:mm:ss')}</p>
              </div>

              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div>
                  <label className="text-xs text-foreground-muted mb-2 block">Changes Made</label>
                  <div className="neomorph-inset p-3 space-y-2">
                    {Object.entries(selectedLog.changes).map(([field, change]) => (
                      <div key={field} className="text-sm">
                        <span className="font-medium">{field}:</span>
                        <div className="ml-4 text-xs">
                          <div className="text-red-600">- {JSON.stringify(change.old)}</div>
                          <div className="text-green-600">+ {JSON.stringify(change.new)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.page_url && (
                <div>
                  <label className="text-xs text-foreground-muted">Page URL</label>
                  <p className="text-sm break-all">{selectedLog.page_url}</p>
                </div>
              )}

              {selectedLog.user_agent && (
                <div>
                  <label className="text-xs text-foreground-muted">Browser/Device</label>
                  <p className="text-xs">{selectedLog.user_agent}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}