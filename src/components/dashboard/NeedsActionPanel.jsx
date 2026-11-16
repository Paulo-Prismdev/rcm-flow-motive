import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronRight, Clock } from 'lucide-react';
import UpdateStatusBadge from '@/components/shared/UpdateStatusBadge';
import StatusBadge from '@/components/shared/StatusBadge';
import { computeUpdateStatusFlag, computeClientCommStatusFlag } from '@/components/shared/claimStatusUpdate';
import { formatUKRegistration } from '@/components/shared/formatRegistration';
import {
  isOverdueClaim, isCommOverdue, isWarningClaim, getCountdownHours,
  getInactiveHours, getInitials, getAvatarColor,
} from './opsDashboardHelpers';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue Comms' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'inactive', label: 'Inactive 48h+' },
];

function Row({ claim, starred, onClick }) {
  const caseFlag = computeUpdateStatusFlag(claim);
  const clientFlag = computeClientCommStatusFlag(claim);
  const status = claim.secondary_status || claim.journey_status || claim.job_status || 'New';

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
    >
      {/* REG pill */}
      {claim.reg ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 text-white font-mono text-[11px] font-semibold whitespace-nowrap flex-shrink-0 min-w-[64px] justify-center">
          {formatUKRegistration(claim.reg)}
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 text-[11px] font-semibold flex-shrink-0 min-w-[64px] justify-center">—</span>
      )}

      {/* Client + vehicle */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">{claim.client_name || 'Unknown'}</span>
          {starred && <span className="text-[11px] text-amber-500">★</span>}
        </div>
        <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate block">{claim.make_model || '—'}</span>
      </div>

      {/* Case 48hrs */}
      <div className="hidden sm:block flex-shrink-0">
        <UpdateStatusBadge status={caseFlag} small />
      </div>
      {/* Client 48hrs */}
      <div className="hidden md:block flex-shrink-0">
        <UpdateStatusBadge status={clientFlag} small />
      </div>

      {/* Status */}
      <div className="hidden lg:block flex-shrink-0 max-w-[140px]">
        <StatusBadge status={status} compact />
      </div>

      {/* Handler avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${getAvatarColor(claim.file_handler)}`}>
        {getInitials(claim.file_handler)}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
    </button>
  );
}

export default function NeedsActionPanel({ claims, starredClaimIds, emptyNote }) {
  const [tab, setTab] = useState('all');
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    let list = claims.filter((c) => {
      if (isOverdueClaim(c) || isWarningClaim(c)) return true;
      if (starredClaimIds.has(c.id)) return true;
      if (getInactiveHours(c) >= 48) return true;
      return false;
    });
    if (tab === 'overdue') list = list.filter(isCommOverdue);
    if (tab === 'flagged') list = list.filter((c) => starredClaimIds.has(c.id));
    if (tab === 'inactive') list = list.filter((c) => getInactiveHours(c) >= 48);
    return list.sort((a, b) => (getCountdownHours(b) ?? Infinity) - (getCountdownHours(a) ?? Infinity));
  }, [claims, starredClaimIds, tab]);

  const openClaim = (claim) => navigate(createPageUrl('Claims') + '?id=' + claim.id);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[10px] shadow-sm flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">Needs Action Today</h2>
          <span className="text-[12px] text-gray-400">{filtered.length}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'bg-primary text-primary-foreground'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto min-h-[200px]" style={{ maxHeight: '520px' }}>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full py-12">
            <p className="text-[13px] text-gray-400">{emptyNote || 'Nothing overdue — all on track'}</p>
          </div>
        ) : (
          filtered.map((claim) => (
            <Row key={claim.id} claim={claim} starred={starredClaimIds.has(claim.id)} onClick={() => openClaim(claim)} />
          ))
        )}
      </div>
    </div>
  );
}