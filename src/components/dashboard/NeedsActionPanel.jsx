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
  { key: 'overdue', label: 'Overdue comms' },
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
      className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-border hover:bg-muted transition-colors text-left"
    >
      {/* REG pill */}
      {claim.reg ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-foreground text-background font-mono text-xs font-semibold whitespace-nowrap flex-shrink-0 min-w-[64px] justify-center">
          {formatUKRegistration(claim.reg)}
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold flex-shrink-0 min-w-[64px] justify-center">—</span>
      )}

      {/* Client + vehicle */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium text-foreground truncate">{claim.client_name || 'Unknown'}</span>
          {starred && <span className="text-xs text-warning-fg">★</span>}
        </div>
        <span className="text-xs text-muted-foreground truncate block">{claim.make_model || '—'}</span>
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
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getAvatarColor(claim.file_handler)}`}>
        {getInitials(claim.file_handler)}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/70 flex-shrink-0" />
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
    <div className="bg-card border border-border rounded-xl shadow-card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-[15px] font-semibold text-foreground">Needs action today</h2>
          <span className="text-[12px] text-muted-foreground">{filtered.length}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto min-h-[200px]" style={{ maxHeight: '520px' }}>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full py-12">
            <p className="text-[13px] text-muted-foreground">{emptyNote || 'Nothing overdue — all on track'}</p>
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