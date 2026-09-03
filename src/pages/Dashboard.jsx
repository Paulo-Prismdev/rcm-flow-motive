import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Search, User } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import AtAGlanceStrip from '@/components/dashboard/AtAGlanceStrip';
import NeedsActionPanel from '@/components/dashboard/NeedsActionPanel';
import PipelineOverview from '@/components/dashboard/PipelineOverview';
import TeamActivityFeed from '@/components/dashboard/TeamActivityFeed';
import {
  isOpenClaim, isOverdueClaim, getClaimValue, matchesHandler, getPipelineStage,
} from '@/components/dashboard/opsDashboardHelpers';
import { getUserInitials, getAvatarColor } from '@/components/layout/UserProfile';

const MOBILE_TABS = [
  { key: 'action', label: 'Needs Action' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'activity', label: 'Activity' },
];

export default function Dashboard() {
  const [persona, setPersona] = useState('handler');
  const [mobileTab, setMobileTab] = useState('action');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['claims'],
    queryFn: () => base44.entities.Claim.list('-created_date', 5000),
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const { data: recentUpdates = [] } = useQuery({
    queryKey: ['dashRecentUpdates'],
    queryFn: () => base44.entities.ClaimUpdate.list('-created_date', 200),
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 120000,
  });

  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'company_admin' || currentUser?.role === 'admin';

  React.useEffect(() => {
    if (isAdmin && persona === 'handler') setPersona('manager');
  }, [isAdmin]);

  const activeClaims = useMemo(() => claims.filter(isOpenClaim), [claims]);

  const scopedClaims = useMemo(() => {
    if (persona === 'handler' && currentUser) {
      return activeClaims.filter((c) => matchesHandler(c, currentUser));
    }
    return activeClaims;
  }, [activeClaims, persona, currentUser]);

  const stats = useMemo(() => ({
    open: scopedClaims.length,
    overdue: scopedClaims.filter(isOverdueClaim).length,
    invoice: scopedClaims.filter((c) => c.invoice_status === 'Ready to Invoice').length,
    authority: scopedClaims.filter((c) => ['Awaiting Authority', 'Awaiting Sup Authority'].includes(c.secondary_status)).length,
    onsite: scopedClaims.filter((c) => c.journey_status === 'On-Site' || (c.on_site_date && !c.hand_over_date)).length,
  }), [scopedClaims]);

  const valueTotal = useMemo(() => scopedClaims.reduce((s, c) => s + (getClaimValue(c) || 0), 0), [scopedClaims]);

  const starredClaimIds = useMemo(() => new Set(recentUpdates.filter((u) => u.starred).map((u) => u.claim_id)), [recentUpdates]);
  const activityUpdates = useMemo(() => recentUpdates.slice(0, 30), [recentUpdates]);

  const claimsById = useMemo(() => {
    const map = new Map();
    claims.forEach((c) => map.set(c.id, c));
    return map;
  }, [claims]);

  const usersById = useMemo(() => {
    const map = new Map();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  const onSearch = (e) => {
    if (e.key === 'Enter') navigate(createPageUrl('Claims'));
  };

  if (claimsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const personaToggle = (desktop) => (
    <div className={`inline-flex items-center rounded-[4px] border border-[#E2E8F0] overflow-hidden ${desktop ? '' : 'w-full'}`}>
      <button
        onClick={() => setPersona('handler')}
        className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${
          persona === 'handler' ? 'bg-[#0F172A] text-white' : 'bg-white text-[#64748B] hover:bg-slate-50 dark:bg-slate-900'
        }`}
      >
        Handler View
      </button>
      <button
        onClick={() => setPersona('manager')}
        className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${
          persona === 'manager' ? 'bg-[#0F172A] text-white' : 'bg-white text-[#64748B] hover:bg-slate-50 dark:bg-slate-900'
        }`}
      >
        Manager Overview
      </button>
    </div>
  );

  return (
    <div className="space-y-3 lg:space-y-4 font-body">
      {/* ── Header Rail ── */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-display font-bold text-[18px] text-[#0F172A] dark:text-slate-100 whitespace-nowrap">
              Claims Operations
            </h1>
            {!isMobile && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={onSearch}
                  placeholder="Search claims…"
                  className="w-48 h-8 pl-8 pr-3 text-[12px] bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] rounded-[4px] outline-none focus:border-[#0D9488] text-[#0F172A] dark:text-slate-100"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isMobile ? personaToggle(true) : (
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                className="h-8 px-2 text-[12px] bg-white dark:bg-slate-800 border border-[#E2E8F0] rounded-[4px] text-[#0F172A] dark:text-slate-100"
              >
                <option value="handler">Handler View</option>
                <option value="manager">Manager Overview</option>
              </select>
            )}
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              {currentUser?.profile_picture_url ? (
                <img src={currentUser.profile_picture_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${getAvatarColor(currentUser?.email)}`}>
                  <span className="text-[11px] font-bold text-white">{getUserInitials(currentUser)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── At a Glance Strip ── */}
      <AtAGlanceStrip stats={stats} valueTotal={valueTotal} />

      {/* ── Mobile tab switcher ── */}
      {isMobile && (
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-[#E2E8F0] rounded-[4px] p-1">
          {MOBILE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setMobileTab(t.key)}
              className={`flex-1 py-1.5 text-[12px] font-medium rounded-[4px] transition-colors ${
                mobileTab === t.key ? 'bg-[#0F172A] text-white' : 'text-[#64748B]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Main floor ── */}
      {!isMobile ? (
        <>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-8">
              <NeedsActionPanel
                claims={scopedClaims}
                starredClaimIds={starredClaimIds}
                emptyNote={persona === 'handler' ? 'No claims assigned to you need action' : 'Nothing overdue — all on track'}
              />
            </div>
            <div className="col-span-4">
              <PipelineOverview claims={scopedClaims} persona={persona} />
            </div>
          </div>
          <TeamActivityFeed updates={activityUpdates} claimsById={claimsById} usersById={usersById} />
        </>
      ) : (
        <div className="space-y-3">
          {mobileTab === 'action' && (
            <NeedsActionPanel
              claims={scopedClaims}
              starredClaimIds={starredClaimIds}
              emptyNote={persona === 'handler' ? 'No claims assigned to you need action' : 'Nothing overdue — all on track'}
            />
          )}
          {mobileTab === 'pipeline' && <PipelineOverview claims={scopedClaims} persona={persona} />}
          {mobileTab === 'activity' && <TeamActivityFeed updates={activityUpdates} claimsById={claimsById} usersById={usersById} />}
        </div>
      )}
    </div>
  );
}