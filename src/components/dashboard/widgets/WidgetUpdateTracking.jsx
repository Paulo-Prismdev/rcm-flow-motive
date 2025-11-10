import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import UpdateStatusBadge from '../../shared/UpdateStatusBadge';

export default function WidgetUpdateTracking({ config, isEditMode }) {
  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['claims', 'update-tracking'],
    queryFn: () => base44.entities.Claim.list('-created_date', 1000),
    enabled: !isEditMode,
  });

  // Filter out closed claims
  const activeClaims = claims.filter(c => 
    !c.archived && !['Completed', 'Cancelled', 'Total Loss'].includes(c.job_status)
  );

  // Count by update status
  const statusCounts = {
    Red: activeClaims.filter(c => c.update_status_flag === 'Red').length,
    Amber: activeClaims.filter(c => c.update_status_flag === 'Amber').length,
    Green: activeClaims.filter(c => c.update_status_flag === 'Green').length,
    Blue: activeClaims.filter(c => c.update_status_flag === 'Blue').length,
  };

  const totalNeedingAttention = statusCounts.Red + statusCounts.Amber;

  const content = (
    <div className="glass p-4 md:p-6 card-hover h-full">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-bold">48-Hour Update Tracking</h2>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-foreground-muted text-sm">Loading...</div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Link 
              to={createPageUrl('Claims?updateStatus=Red')}
              className="glass-elevated p-4 hover:scale-105 transition-transform"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-xs text-foreground-muted">Overdue</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{statusCounts.Red}</p>
            </Link>

            <Link 
              to={createPageUrl('Claims?updateStatus=Amber')}
              className="glass-elevated p-4 hover:scale-105 transition-transform"
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-foreground-muted">Due Soon</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">{statusCounts.Amber}</p>
            </Link>
          </div>

          <div className="glass-inset p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-foreground-muted">On Track</span>
              <UpdateStatusBadge status="Green" small />
            </div>
            <p className="text-xl font-bold">{statusCounts.Green}</p>
          </div>

          <div className="glass-inset p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-foreground-muted">Snoozed</span>
              <UpdateStatusBadge status="Blue" small />
            </div>
            <p className="text-xl font-bold">{statusCounts.Blue}</p>
          </div>

          {totalNeedingAttention > 0 && (
            <div className="glass-elevated p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                ⚠️ {totalNeedingAttention} claim{totalNeedingAttention !== 1 ? 's' : ''} need{totalNeedingAttention === 1 ? 's' : ''} attention
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isEditMode) {
    return content;
  }

  return content;
}