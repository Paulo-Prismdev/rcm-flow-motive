import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronRight } from 'lucide-react';
import {
  isOverdueClaim, isCommOverdue, isWarningClaim, getCountdownHours,
  getInactiveHours, getInitials, getAvatarColor,
} from './opsDashboardHelpers';
import { formatUKRegistration } from '@/components/shared/formatRegistration';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue Comms' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'inactive', label: 'Inactive 48h+' },
];

function UrgencyPill({ claim }) {
  const overdue = isOverdueClaim(claim);
  const warning = isWarningClaim(claim);
  if (overdue) {
    return <span className="inline-flex items-center rounded-[4px] bg-[#FEE2E2] px-1.5 py-0.5 text-[10px] font-semibold text-[#DC2626]">OVERDUE</span>;
  }
  if (warning) {
    return <span className="inline-flex items-center rounded-[4px] bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-semibold text-[#D97706]">DUE SOON</span>;
  }
  return <span className="inline-flex items-center rounded-[4px] bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B]">ON TRACK</span>;
}

function CountdownCell({ claim }) {
  const hours = getCountdownHours(claim);
  if (hours === null) return <span className="text-[11px] text-[#64748B]">—</span>;
  if (hours <= 0) {
    return <span className="font-mono-ops text-[11px] font-semibold text-[#DC2626]">{Math.abs(Math.round(hours))}h over</span>;
  }
  if (hours <= 12) {
    return <span className="font-mono-ops text-[11px] font-semibold text-[#D97706]">{Math.round(hours)}h left</span>;
  }
  return <span className="font-mono-ops text-[11px] text-[#64748B]">{Math.round(hours)}h left</span>;
}

function Row({ claim, starred, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-[#E2E8F0] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
    >
      <CountdownCell claim={claim} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono-ops text-[12px] font-semibold text-[#0F172A] dark:text-slate-100">
            {claim.job_number || '—'}
          </span>
          {starred && <span className="text-[10px] text-[#D97706]">★</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[12px] text-[#64748B] truncate">{claim.client_name || 'Unknown'}</span>
          {claim.reg && (
            <span className="font-mono-ops text-[10px] text-[#94A3B8] hidden sm:inline">
              {formatUKRegistration(claim.reg)}
            </span>
          )}
        </div>
      </div>
      <UrgencyPill claim={claim} />
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${getAvatarColor(claim.file_handler)}`}>
        {getInitials(claim.file_handler)}
      </div>
      <ChevronRight className="w-4 h-4 text-[#94A3B8] flex-shrink-0" />
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
    <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-bold text-[15px] text-[#0F172A] dark:text-slate-100">Needs Action Today</h2>
          <span className="font-mono-ops text-[11px] text-[#64748B]">{filtered.length}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[#E2E8F0] overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-[4px] whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'bg-[#0F172A] text-white'
                : 'text-[#64748B] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto min-h-[200px]" style={{ maxHeight: '520px' }}>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full py-12">
            <p className="text-[12px] text-[#64748B]">{emptyNote || 'Nothing overdue — all on track'}</p>
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