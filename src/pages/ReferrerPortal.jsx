import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronRight,
  ChevronDown,
  AlertCircle,
  X,
  Filter,
  Package,
  Clock,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '../components/shared/StatusBadge';
import UpdateStatusBadge from '../components/shared/UpdateStatusBadge';
import { formatUKRegistration } from '../components/shared/formatRegistration';
import ReferrerLayout from '../components/referrer/ReferrerLayout';
import ReferrerClaimDetail from '../components/referrer/ReferrerClaimDetail';
import FeedbackModal from '../components/shared/FeedbackModal';
import { useStatusConfigs } from '../components/shared/StatusConfigContext';

export default function ReferrerPortal() {
  const [viewingClaim, setViewingClaim] = useState(null);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState([]);
  const [claimTypeFilter, setClaimTypeFilter] = useState('');
  const [insurerFilter, setInsurerFilter] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const { allStatuses: statusConfigs } = useStatusConfigs();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const referrerId = currentUser?.linked_referrer_id;
  const companyId = currentUser?.company_id;
  const isLinked = !!referrerId || !!companyId;

  const { data: referrer } = useQuery({
    queryKey: ['referrer', referrerId],
    queryFn: () => base44.entities.Referrer.get(referrerId),
    enabled: !!referrerId,
  });

  const { data: company } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => base44.entities.Company.get(companyId),
    enabled: !!companyId && !referrerId,
  });

  const displayName = referrer?.name || company?.name || 'Referrer';

  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['referrerClaims', referrerId, companyId],
    queryFn: async () => {
      const allClaims = await base44.entities.Claim.list('-created_date', 5000);
      return allClaims.filter(c =>
        (referrerId && c.referrer_id === referrerId) ||
        (companyId && c.referrer_id === companyId)
      );
    },
    enabled: isLinked,
    staleTime: 30000,
  });

  const { data: backorderedParts = [] } = useQuery({
    queryKey: ['backorderedParts'],
    queryFn: () => base44.entities.BackorderedPart.list(),
    staleTime: 5 * 60 * 1000,
  });

  const [claimIdsWithBackorders, setClaimIdsWithBackorders] = useState(new Set());

  useEffect(() => {
    if (backorderedParts.length > 0) {
      setClaimIdsWithBackorders(new Set(
        backorderedParts.filter(p => !p.received_by_repairer).map(p => p.claim_id)
      ));
    }
  }, [backorderedParts]);

  const isLoading = !currentUser || claimsLoading;

  const calculateUpdateStatus = (claim) => {
    const now = new Date();
    const closedStatuses = ['Completed', 'Cancelled', 'Total Loss'];
    if (closedStatuses.includes(claim.job_status)) return 'Gray';
    if (claim.override_active && claim.override_expiry_at && now < new Date(claim.override_expiry_at)) return 'Blue';
    if (claim.next_update_due_at) {
      const hours = (new Date(claim.next_update_due_at) - now) / 3600000;
      if (hours < 0) return 'Red';
      if (hours < 24) return 'Amber';
      return 'Green';
    }
    return 'Green';
  };

  const availableStatuses = useMemo(() => {
    const active = statusConfigs
      .filter(s => s.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(s => s.status_name);
    return active.includes('New') ? active : ['New', ...active];
  }, [statusConfigs]);

  useEffect(() => {
    if (availableStatuses.length > 0) {
      const collapsed = {};
      availableStatuses.forEach(s => { collapsed[s] = true; });
      collapsed['__other__'] = true;
      setCollapsedGroups(collapsed);
    }
  }, [availableStatuses.length]);

  const uniqueInsurers = [...new Set(claims.map(c => c.insurer).filter(Boolean))].sort();

  // Get unique statuses from actual claims, in order of availableStatuses
  const claimStatuses = useMemo(() => {
    const statuses = new Set(claims.map(c => c.job_status || 'New'));
    const ordered = availableStatuses.filter(s => statuses.has(s));
    const remaining = Array.from(statuses).filter(s => !ordered.includes(s));
    return [...ordered, ...remaining];
  }, [claims, availableStatuses]);

  const filteredClaims = claims.filter(c => {
    const s = search.toLowerCase();
    const matchesSearch = !search ||
      c.reg?.toLowerCase().includes(s) ||
      c.client_name?.toLowerCase().includes(s) ||
      c.job_number?.toLowerCase().includes(s) ||
      c.referrer_ref?.toLowerCase().includes(s) ||
      c.make_model?.toLowerCase().includes(s);
    
    const matchesStatus = !statusFilter.length || (c.job_statuses || []).some(st => statusFilter.includes(st));
    const matchesClaimType = !claimTypeFilter || c.claim_type === claimTypeFilter;
    const matchesInsurer = !insurerFilter || c.insurer === insurerFilter;
    
    return matchesSearch && matchesStatus && matchesClaimType && matchesInsurer;
  }).sort((a, b) => {
    const prio = { Red: 1, Amber: 2, Green: 3, Blue: 3, Gray: 4 };
    const pa = prio[calculateUpdateStatus(a)] || 3, pb = prio[calculateUpdateStatus(b)] || 3;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const toggleGroup = (status) => setCollapsedGroups(p => ({ ...p, [status]: !p[status] }));

  const getStatusDot = (statusName) => {
    const cfg = statusConfigs?.find(s => s.status_name === statusName);
    const STATUS_COLORS = {
      blue: '#3b82f6', green: '#22c55e', orange: '#f97316',
      red: '#ef4444', purple: '#a855f7', yellow: '#eab308', gray: '#6b7280',
    };
    return STATUS_COLORS[cfg?.color] || '#6b7280';
  };

  const formatDate = (val) => {
    if (!val) return '—';
    try { return format(new Date(val), 'dd/MM/yyyy'); } catch { return val; }
  };

  const renderRow = (claim) => {
    const updateStatus = calculateUpdateStatus(claim);
    const hasBackorder = claimIdsWithBackorders.has(claim.id);
    const isClosedStatus = ['Completed', 'Cancelled', 'Total Loss'].includes(claim.job_status);
    const isDraft = claim.draft === true;

    return (
      <tr
        key={claim.id}
        onClick={() => setViewingClaim(claim)}
        className="group border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50"
      >
        <td className="sticky left-0 z-10 px-4 py-2.5 whitespace-nowrap bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50">
          <span
            className="inline-flex items-center justify-center rounded-md bg-[#1e2d4a] text-white font-semibold uppercase"
            style={{ fontSize: '13px', width: '96px', height: '28px', letterSpacing: '0.05em' }}
          >
            {claim.reg ? formatUKRegistration(claim.reg) : ''}
          </span>
        </td>
        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[160px] truncate">
          {claim.client_name || '—'}
        </td>
        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {claim.make_model || '—'}
        </td>
        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {formatDate(claim.loss_date)}
        </td>
        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap max-w-[120px] truncate">
          {claim.insurer || '—'}
        </td>
        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap max-w-[120px] truncate">
          {claim.referrer || '—'}
        </td>
        <td className="sticky right-0 z-10 px-3 py-2.5 whitespace-nowrap bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50">
          <div className="flex items-center gap-1.5 justify-end flex-wrap">
            {isDraft && (
              <span className="px-2 py-1 rounded-md bg-yellow-100 text-yellow-700 text-[10px] font-medium">
                Draft
              </span>
            )}
            {claim.secondary_status && <StatusBadge status={claim.secondary_status} variant="secondary" />}
            {!isClosedStatus && <UpdateStatusBadge status={updateStatus} small />}
            {hasBackorder && (
              <span className="flex items-center gap-0.5 px-2 py-1 rounded-md bg-red-500 text-white text-[10px] font-semibold shadow-sm">
                <Package className="w-3 h-3" />BO
              </span>
            )}
            {claim.bodyshop_id && !claim.repairer_accepted && !isClosedStatus && (
              <span className="flex items-center gap-0.5 px-2 py-1 rounded-md bg-orange-500 text-white text-[10px] font-semibold shadow-sm">
                <Clock className="w-3 h-3" />
              </span>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const renderMobileCard = (claim) => {
    const updateStatus = calculateUpdateStatus(claim);
    const hasBackorder = claimIdsWithBackorders.has(claim.id);
    const isClosedStatus = ['Completed', 'Cancelled', 'Total Loss'].includes(claim.job_status);
    const isDraft = claim.draft === true;
    return (
      <div
        key={claim.id}
        onClick={() => setViewingClaim(claim)}
        className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/60 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center justify-center rounded-md bg-[#1e2d4a] text-white font-semibold uppercase flex-shrink-0"
            style={{ fontSize: '13px', width: '96px', height: '28px', letterSpacing: '0.05em' }}
          >
            {claim.reg ? formatUKRegistration(claim.reg) : '—'}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isDraft && (
              <span className="px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-medium">
                Draft
              </span>
            )}
            {!isClosedStatus && <UpdateStatusBadge status={updateStatus} small />}
            {hasBackorder && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-medium">
                <Package className="w-2.5 h-2.5" />BO
              </span>
            )}
            {claim.bodyshop_id && !claim.repairer_accepted && !isClosedStatus && (
              <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-medium">
                <Clock className="w-2.5 h-2.5 inline" />
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-gray-400 ml-1" />
          </div>
        </div>
        <div className="mt-1.5 flex flex-col gap-0.5">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{claim.client_name || '—'}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{claim.make_model || '—'} · {formatDate(claim.loss_date)}</span>
          {claim.referrer_ref && <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{claim.referrer_ref}</span>}
          {claim.secondary_status && <div className="mt-1"><StatusBadge status={claim.secondary_status} variant="secondary" /></div>}
        </div>
      </div>
    );
  };

  if (!currentUser) {
    return (
      <ReferrerLayout>
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto"></div>
        </div>
      </ReferrerLayout>
    );
  }

  if (!isLinked) {
    return (
      <ReferrerLayout>
        <div className="h-full flex items-center justify-center">
          <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Account Not Linked</h2>
          <p className="text-foreground-muted">
            Your account is not linked to a referrer. Please contact RCM Automotive to set up your referrer portal access.
          </p>
        </div>
      </ReferrerLayout>
    );
  }

  if (viewingClaim) {
    return (
      <ReferrerLayout>
        <ReferrerClaimDetail claim={viewingClaim} onClose={() => setViewingClaim(null)} />
      </ReferrerLayout>
    );
  }

  return (
    <ReferrerLayout>
      {currentUser?.show_feedback_prompt && (
        <FeedbackModal user={currentUser} onClose={() => {}} />
      )}
      <div className="flex flex-col h-full min-h-0 bg-white dark:bg-gray-900 rounded-[10px] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h1 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">{displayName}</h1>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {}}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /><span>Enquire</span>
            </button>
          </div>
        </div>

        {/* Search + filters bar */}
        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex-1">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by reg, client, job number..."
              className="w-full px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[10px] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 text-gray-900 dark:text-white placeholder-gray-400 transition-all"
            />
          </div>

          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium border transition-all ${
              showFilters ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300' : 
              'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
          </button>
          {(statusFilter.length > 0 || claimTypeFilter || insurerFilter) && (
            <button onClick={() => { setStatusFilter([]); setClaimTypeFilter(''); setInsurerFilter(''); }} 
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 flex-shrink-0">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { label: 'Claim Type', value: claimTypeFilter, onChange: setClaimTypeFilter, options: ['Credit Repair','Fault Claim','Non-Fault Claim','Total Loss','Glass Claim'] },
                { label: 'Insurer', value: insurerFilter, onChange: setInsurerFilter, options: uniqueInsurers },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-0.5">{f.label}</label>
                  <select value={f.value} onChange={e => f.onChange(e.target.value)}
                    className="w-full px-2 py-1 text-[11px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 focus:outline-none">
                    <option value="">All {f.label}s</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List / Table */}
        <div className="flex-1 overflow-auto min-h-0" style={{WebkitOverflowScrolling: 'touch'}}>
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">Loading claims...</div>
          ) : filteredClaims.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <p className="text-sm text-gray-400">No claims found</p>
            </div>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="lg:hidden">
                {claimStatuses.map(statusGroup => {
                  const claimsInGroup = filteredClaims.filter(c => (c.job_status || 'New') === statusGroup);
                  if (claimsInGroup.length === 0) return null;
                  const isCollapsed = collapsedGroups[statusGroup];
                  const dotColor = getStatusDot(statusGroup);
                  return (
                    <React.Fragment key={statusGroup}>
                      <div
                        className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/60 cursor-pointer select-none border-b border-gray-100 dark:border-gray-800"
                        onClick={() => toggleGroup(statusGroup)}
                      >
                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{statusGroup}</span>
                        <span className="text-xs text-gray-400 ml-1">{claimsInGroup.length}</span>
                      </div>
                      {!isCollapsed && claimsInGroup.map(renderMobileCard)}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Desktop table view */}
              <table className="hidden lg:table w-full min-w-[900px]">
                <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="sticky left-0 z-20 bg-white dark:bg-gray-900 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">REG</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">CLIENT</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">VEHICLE</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">LOSS DATE</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">INSURER</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">REFERRER</th>
                    <th className="sticky right-0 z-20 bg-white dark:bg-gray-900 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {claimStatuses.map(statusGroup => {
                    const claimsInGroup = filteredClaims.filter(c => (c.job_status || 'New') === statusGroup);
                    if (claimsInGroup.length === 0) return null;
                    const isCollapsed = collapsedGroups[statusGroup];
                    const dotColor = getStatusDot(statusGroup);
                    return (
                      <React.Fragment key={statusGroup}>
                        <tr
                          className="bg-gray-50 dark:bg-gray-800/60 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={() => toggleGroup(statusGroup)}
                        >
                          <td colSpan={7} className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{statusGroup}</span>
                              <span className="text-xs text-gray-400 font-normal ml-1">{claimsInGroup.length}</span>
                            </div>
                          </td>
                        </tr>
                        {!isCollapsed && claimsInGroup.map(renderRow)}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Footer count */}
        <div className="px-5 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 flex-shrink-0">
          {filteredClaims.length} of {claims.length} claims
        </div>
      </div>
    </ReferrerLayout>
  );
}