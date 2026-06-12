import React from 'react';
import { Check, Clock, X } from 'lucide-react';
import { format } from 'date-fns';

const MILESTONES = [
  { id: 'awaiting_booking', label: 'Awaiting Booking In' },
  { id: 'booked_in', label: 'Booked In' },
  { id: 'on_site', label: 'On Site' },
  { id: 'in_repair', label: 'In Repair' },
  { id: 'repairs_complete', label: 'Repairs Complete' },
  { id: 'returned', label: 'Returned to Client' },
];

// Status names that indicate a milestone has been passed
const MILESTONE_STATUS_MAP = {
  awaiting_booking: [],
  booked_in: ['Booked In'],
  on_site: ['On Site'],
  in_repair: ['In Repair', 'Awaiting Parts', 'Quality Check'],
  repairs_complete: ['Completed', 'Invoice Pending', 'Invoiced'],
  returned: ['Returned to Client'],
};

// All statuses that come after a given milestone (to determine "completed")
const STATUS_ORDER = [
  'New', 'In Progress', 'Awaiting Authority', 'Authorised',
  'Booked In', 'On Site', 'In Repair', 'Awaiting Parts',
  'Quality Check', 'Completed', 'Invoice Pending', 'Invoiced',
  'Returned to Client'
];

function getStatusRank(status) {
  const idx = STATUS_ORDER.indexOf(status);
  return idx === -1 ? -1 : idx;
}

export default function ClaimJourneyTimeline({ claim, updates = [] }) {
  const isCancelled = claim.job_status === 'Cancelled' || claim.secondary_status === 'Cancelled';

  const cancelledUpdate = isCancelled
    ? updates.filter(u => u.description?.toLowerCase().includes('cancelled')).sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
    : null;

  // Use the higher rank between primary and secondary status
  const primaryRank = getStatusRank(claim.job_status);
  const secondaryRank = getStatusRank(claim.secondary_status);
  const currentRank = Math.max(primaryRank, secondaryRank);

  // The effective "current" status for active-stage detection
  const effectiveStatus = secondaryRank > primaryRank ? claim.secondary_status : claim.job_status;

  // Find the date a status was first set via ClaimUpdate records
  const getUpdateForStatuses = (statusNames) => {
    // Look for a status change update mentioning any of these statuses
    return updates
      .filter(u => u.update_type === 'Status Change' &&
        statusNames.some(s => u.description?.toLowerCase().includes(s.toLowerCase()))
      )
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
  };

  const getMilestoneInfo = (id) => {
    const statusNames = MILESTONE_STATUS_MAP[id];
    const update = statusNames.length ? getUpdateForStatuses(statusNames) : null;

    switch (id) {
      case 'awaiting_booking': {
        const isActive = currentRank < getStatusRank('Booked In') && currentRank >= 0;
        const isCompleted = currentRank >= getStatusRank('Booked In');

        return {
          isCompleted,
          isActive,
          date: claim.date_received,
          user: null,
        };
      }
      case 'booked_in': {
        const isActive = effectiveStatus === 'Booked In';
        const isCompleted = currentRank > getStatusRank('Booked In');
        return {
          isCompleted,
          isActive,
          date: claim.booking_in_date || update?.created_date,
          user: update?.created_by,
        };
      }
      case 'on_site': {
        const isActive = effectiveStatus === 'On Site';
        const isCompleted = currentRank > getStatusRank('On Site');
        return {
          isCompleted,
          isActive,
          date: claim.on_site_date || update?.created_date,
          user: update?.created_by,
        };
      }
      case 'in_repair': {
        const isActive = ['In Repair', 'Awaiting Parts', 'Quality Check'].includes(effectiveStatus);
        const isCompleted = currentRank >= getStatusRank('Completed');
        return {
          isCompleted,
          isActive,
          date: update?.created_date,
          user: update?.created_by,
        };
      }
      case 'repairs_complete': {
        const isActive = ['Completed', 'Invoice Pending', 'Invoiced'].includes(effectiveStatus);
        const isCompleted = currentRank >= getStatusRank('Returned to Client');
        return {
          isCompleted,
          isActive,
          date: claim.completion_date || update?.created_date,
          user: update?.created_by,
        };
      }
      case 'returned': {
        const isActive = effectiveStatus === 'Returned to Client';
        const isCompleted = false;
        return {
          isCompleted,
          isActive,
          date: update?.created_date,
          user: update?.created_by,
        };
      }
      default:
        return { isCompleted: false, isActive: false, date: null, user: null };
    }
  };

  const formatDate = (d) => {
    if (!d) return null;
    try { return format(new Date(d), 'dd/MM/yy'); } catch { return null; }
  };

  if (isCancelled) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Claim Journey</p>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-red-500 border-2 border-red-500 text-white">
            <X className="w-4 h-4 stroke-[3]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">Claim Cancelled</p>
            {cancelledUpdate && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {formatDate(cancelledUpdate.created_date)}
                {cancelledUpdate.created_by && ` · ${cancelledUpdate.created_by.split('@')[0]}`}
              </p>
            )}
            {claim.cancellation_reason && (
              <p className="text-[11px] text-muted-foreground mt-0.5">Reason: {claim.cancellation_reason}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Calculate which line segments should be green (between completed milestones)
  const completedCount = MILESTONES.filter((m) => getMilestoneInfo(m.id).isCompleted).length;

  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 overflow-x-auto">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Claim Journey</p>
      <div className="relative flex items-start" style={{ minWidth: 520 }}>
        {/* Background connector line segments */}
        <div className="absolute left-0 right-0 h-[2px] z-0" style={{ top: 18 }}>
          {MILESTONES.map((_, index) => {
            if (index === MILESTONES.length - 1) return null;
            const currentCompleted = getMilestoneInfo(MILESTONES[index].id).isCompleted;
            const nextCompleted = getMilestoneInfo(MILESTONES[index + 1].id).isCompleted;
            const isGreen = currentCompleted;
            const segmentWidth = 100 / (MILESTONES.length - 1);
            return (
              <div
                key={`segment-${index}`}
                className={`absolute h-full transition-all duration-300 ${
                  isGreen ? 'bg-green-500' : 'bg-border'
                }`}
                style={{
                  left: `${index * segmentWidth}%`,
                  width: `${segmentWidth}%`,
                }}
              />
            );
          })}
        </div>

        {MILESTONES.map((milestone, index) => {
          const info = getMilestoneInfo(milestone.id);

          return (
            <div key={milestone.id} className="flex-1 flex flex-col items-center relative z-10">
              {/* Node */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 border-2 ${
                info.isCompleted
                  ? 'bg-green-500 border-green-500 text-white'
                  : info.isActive
                    ? 'bg-white dark:bg-card border-primary text-primary ring-4 ring-primary/20'
                    : 'bg-white dark:bg-card border-border text-muted-foreground'
              }`}>
                {info.isCompleted ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : info.isActive ? (
                  <div className="w-3 h-3 rounded-full bg-primary" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full border border-muted-foreground/40" />
                )}
              </div>

              {/* Label + date + user */}
              <div className="text-center mt-1 px-1 max-w-[90px]">
                <p className={`text-[11px] font-semibold leading-tight ${
                  info.isActive ? 'text-primary' : info.isCompleted ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {milestone.label}
                </p>
                {formatDate(info.date) && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(info.date)}</p>
                )}
                {info.user && (
                  <p className="text-[9px] text-muted-foreground/50 truncate" title={info.user}>
                    {info.user.split('@')[0]}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}