import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/shared/PageHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import AtAGlanceStrip from '@/components/dashboard/AtAGlanceStrip';
import NeedsActionPanel from '@/components/dashboard/NeedsActionPanel';
import PipelineOverview from '@/components/dashboard/PipelineOverview';
import TeamActivityFeed from '@/components/dashboard/TeamActivityFeed';
import {
  isOpenClaim, isOverdueClaim, getClaimValue, matchesHandler,
} from '@/components/dashboard/opsDashboardHelpers';

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

  const isAdmin = currentUser?.user_type === 'internal' && ['super_admin', 'company_admin', 'admin'].includes(currentUser?.role);

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
    // Shapes of the page while it loads, so nothing jumps when the numbers arrive.
    return (
      <div className="space-y-3 lg:space-y-4" aria-busy="true" aria-label="Loading the dashboard">
        <div className="h-12 w-56 rounded-lg bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[104px] rounded-xl bg-muted animate-pulse" />)}
        </div>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8 h-80 rounded-xl bg-muted animate-pulse" />
          <div className="hidden lg:block lg:col-span-4 h-80 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  // Handler / manager switch as a segmented control (same two choices as before).
  const personaToggle = (
    <div role="group" aria-label="Whose claims to show" className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {[['handler', 'My claims'], ['manager', 'Everyone']].map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setPersona(key)}
          aria-pressed={persona === key}
          className={`h-7 px-3 rounded-md text-[13px] font-medium transition-colors ${
            persona === key ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const subtitle = persona === 'handler'
    ? `${stats.open} open claim${stats.open === 1 ? '' : 's'} assigned to you`
    : `${stats.open} open claim${stats.open === 1 ? '' : 's'} across the team`;

  return (
    <div className="space-y-3 lg:space-y-4">
      {/* Search lives in the top bar (Cmd+K) and your profile in the sidebar, so the page header is just the title */}
      <PageHeader title="Dashboard" subtitle={subtitle} actions={personaToggle} />

      {/* ── At a Glance Strip ── */}
      <AtAGlanceStrip stats={stats} valueTotal={valueTotal} />

      {/* ── Mobile tab switcher ── */}
      {isMobile && (
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5" role="tablist" aria-label="Dashboard sections">
          {MOBILE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setMobileTab(t.key)}
              role="tab"
              aria-selected={mobileTab === t.key}
              className={`flex-1 h-9 text-[13px] font-medium rounded-md transition-colors ${
                mobileTab === t.key ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground'
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