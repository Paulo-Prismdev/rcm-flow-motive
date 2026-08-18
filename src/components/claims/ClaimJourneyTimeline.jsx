import React from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { isExceptionJourney, JOURNEY_STATUSES } from '@/components/shared/claimStatusV2';

const MILESTONES = [
  { id: 'awaiting_booking', label: 'Awaiting Booking In' },
  { id: 'booked_in', label: 'Booked In' },
  { id: 'on_site', label: 'On Site' },
  { id: 'in_repair', label: 'In Repair' },
  { id: 'repairs_complete', label: 'Repairs Complete' },
  { id: 'returned', label: 'Returned to Customer' },
];

// v2 journey order, excluding exception / outcome states. The On Site milestone
// is also driven by the on_site_date marker.
const JOURNEY_ORDER = JOURNEY_STATUSES.map(s => s.name).filter(n => !isExceptionJourney(n));

const getJourneyRank = (status) => {
  const idx = JOURNEY_ORDER.indexOf(status);
  if (idx !== -1) return idx;
  if (status === 'On Site') return 2; // legacy value — treat as On-Site level
  return 0;
};

// Best-effort date attribution for milestones without a dedicated claim date field.
const MILESTONE_STATUS_MAP = {
  in_repair: ['Awaiting Parts', 'In Repair'],
  returned: ['Returned to Customer'],
};

// Exception / outcome banner styling — same treatment as the old Cancelled banner
const EXCEPTION_CONFIG = {
  'Cancelled': {
    bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800',
    iconBg: 'bg-red-500 border-red-500', title: 'Claim Cancelled',
    titleColor: 'text-red-600 dark:text-red-400', Icon: X,
  },
  'Potential Total Loss': {
    bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800',
    iconBg: 'bg-orange-500 border-orange-500', title: 'Potential Total Loss',
    titleColor: 'text-orange-600 dark:text-orange-400', Icon: AlertTriangle,
  },
  'Total Loss': {
    bg: 'bg-gray-100 dark:bg-gray-800/40', border: 'border-gray-300 dark:border-gray-700',
    iconBg: 'bg-gray-500 border-gray-500', title: 'Total Loss',
    titleColor: 'text-gray-700 dark:text-gray-300', Icon: AlertTriangle,
  },
};

export default function ClaimJourneyTimeline({ claim, updates = [] }) {
  const journeyStatus = claim.journey_status || claim.job_status || 'Awaiting BID';
  const isException = isExceptionJourney(journeyStatus);

  const formatDate = (d) => {
    if (!d) return null;
    try { return format(new Date(d), 'dd/MM/yy'); } catch { return null; }
  };

  // Best-effort: earliest update whose description mentions a given journey name.
  const getUpdateForStatuses = (statusNames) =>
    updates
      .filter(u => statusNames.some(s => u.description?.toLowerCase().includes(s.toLowerCase())))
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];

  if (isException) {
    const cfg = EXCEPTION_CONFIG[journeyStatus];
    const exceptionUpdate = getUpdateForStatuses([journeyStatus]);
    return (
      <div className={`border rounded-xl px-3 py-2 ${cfg.bg} ${cfg.border}`}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Claim Journey</p>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 text-white ${cfg.iconBg}`}>
            <cfg.Icon className="w-4 h-4 stroke-[3]" />
          </div>
          <div>
            <p className={`text-sm font-semibold ${cfg.titleColor}`}>{cfg.title}</p>
            {exceptionUpdate && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {formatDate(exceptionUpdate.created_date)}
                {exceptionUpdate.created_by && ` · ${exceptionUpdate.created_by.split('@')[0]}`}
              </p>
            )}
            {journeyStatus === 'Cancelled' && claim.cancellation_reason && (
              <p className="text-[11px] text-muted-foreground mt-0.5">Reason: {claim.cancellation_reason}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentRank = getJourneyRank(journeyStatus);
  const onSiteSet = !!claim.on_site_date;

  const getMilestoneInfo = (id) => {
    const statusNames = MILESTONE_STATUS_MAP[id] || [];
    const update = statusNames.length ? getUpdateForStatuses(statusNames) : null;

    switch (id) {
      case 'awaiting_booking':
        return { isCompleted: currentRank > 0 || onSiteSet, isActive: currentRank === 0 && !onSiteSet, date: claim.date_received, user: null };
      case 'booked_in':
        return { isCompleted: currentRank > 1 || onSiteSet, isActive: currentRank === 1 && !onSiteSet, date: claim.booking_in_date || update?.created_date, user: update?.created_by };
      case 'on_site':
        // Dictated by the on-site marker (on_site_date), not the journey status.
        return {
          isCompleted: onSiteSet && currentRank >= 3,
          isActive: onSiteSet && currentRank < 3,
          date: claim.on_site_date,
          user: null,
        };
      case 'in_repair':
        return { isCompleted: currentRank >= 5, isActive: currentRank === 3 || currentRank === 4, date: update?.created_date, user: update?.created_by };
      case 'repairs_complete':
        return { isCompleted: currentRank >= 6, isActive: currentRank === 5, date: claim.completion_date || update?.created_date, user: update?.created_by };
      case 'returned':
        return { isCompleted: false, isActive: currentRank === 6, date: update?.created_date, user: update?.created_by };
      default:
        return { isCompleted: false, isActive: false, date: null, user: null };
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 overflow-x-auto">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Claim Journey</p>
      <div className="relative flex items-start" style={{ minWidth: 520 }}>
        {/* Background connector line segments */}
        <div className="absolute left-0 right-0 h-[2px] z-0" style={{ top: 18 }}>
          {MILESTONES.map((_, index) => {
            if (index === MILESTONES.length - 1) return null;
            const currentCompleted = getMilestoneInfo(MILESTONES[index].id).isCompleted;
            const segmentWidth = 100 / (MILESTONES.length - 1);
            return (
              <div
                key={`segment-${index}`}
                className={`absolute h-full transition-all duration-300 ${currentCompleted ? 'bg-green-500' : 'bg-border'}`}
                style={{ left: `${index * segmentWidth}%`, width: `${segmentWidth}%` }}
              />
            );
          })}
        </div>

        {MILESTONES.map((milestone) => {
          const info = getMilestoneInfo(milestone.id);
          return (
            <div key={milestone.id} className="flex-1 flex flex-col items-center relative z-10">
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
              <div className="text-center mt-1 px-1 max-w-[90px]">
                <p className={`text-[11px] font-semibold leading-tight ${
                  info.isActive ? 'text-primary' : info.isCompleted ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {milestone.id === 'in_repair' ? (onSiteSet ? (claim.secondary_status || 'In Repair') : 'In Repair') : milestone.label}
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