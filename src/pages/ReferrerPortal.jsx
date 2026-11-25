import LoadingRows from '@/components/shared/LoadingRows';
import PayingPrivatelyFilter, { isPrivateJob } from '@/components/shared/PayingPrivatelyFilter';
import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ChevronRight,
  ChevronDown,
  AlertCircle,
  X,
  FileText,
  Settings2,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '../components/shared/StatusBadge';
import { formatUKRegistration } from '../components/shared/formatRegistration';
import { getJourneyGroupKey, JOURNEY_GROUP_STATUSES, getJourneyStatusDot } from '../components/shared/claimGrouping';
import ClaimStatusBadges from '../components/shared/ClaimStatusBadges';
import ReferrerLayout from '../components/referrer/ReferrerLayout';
import ReferrerClaimDetail from '../components/referrer/ReferrerClaimDetail';
import ReferrerDashboard from '../components/referrer/ReferrerDashboard';
import FeedbackModal from '../components/shared/FeedbackModal';
import ClaimCardFieldsModal from '../components/claims/ClaimCardFieldsModal';
import { usePortalClaims, useOpenClaimFromUrl } from '@/components/shared/usePortalClaims';
import { activateOnKey } from '@/lib/a11y';

export default function ReferrerPortal() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewingClaim, setViewingClaim] = useState(null);
  const [initialSection, setInitialSection] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [insurerFilter, setInsurerFilter] = useState('');
  const [claimTypeFilter, setClaimTypeFilter] = useState('');
  const [businessDivisionFilter, setBusinessDivisionFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [showFieldsModal, setShowFieldsModal] = useState(false);
  const [sortBy, setSortBy] = useState('created_desc');
  const [privateOnly, setPrivateOnly] = useState(false);
  const queryClient = useQueryClient();

  // Listen for navigation events from layout
  useEffect(() => {
    const handleNav = (e) => {
      if (e.detail === 'claims') setActiveTab('claims');
      if (e.detail === 'dashboard') setActiveTab('dashboard');
    };
    window.addEventListener('referrer-nav', handleNav);
    return () => window.removeEventListener('referrer-nav', handleNav);
  }, []);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const savedFields = currentUser?.claim_card_fields || [];
  const userCardFields = [...savedFields.filter(f => f !== 'referrer')];

  const updateUserFieldsMutation = useMutation({
    mutationFn: (fields) => base44.auth.updateMe({ claim_card_fields: fields }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currentUser'] }),
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

  const { data: claims = [], isLoading: claimsLoading } = usePortalClaims({ enabled: isLinked });
  useOpenClaimFromUrl(claims, setViewingClaim);

  const availableStatuses = useMemo(() => JOURNEY_GROUP_STATUSES, []);

  useEffect(() => {
    if (availableStatuses.length > 0) {
      const collapsed = {};
      availableStatuses.forEach(s => { collapsed[s] = true; });
      collapsed['__other__'] = true;
      setCollapsedGroups(collapsed);
    }
  }, [availableStatuses.length]);

  const isLoading = !currentUser || claimsLoading;

  // Get unique insurers for filter dropdown
  const uniqueInsurers = useMemo(() => {
    const insurers = [...new Set(claims.map(c => c.insurer).filter(Boolean))];
    return insurers.sort();
  }, [claims]);

  const uniqueBusinessDivisions = useMemo(() => {
    const divisions = [...new Set(claims.map(c => c.business_division).filter(Boolean))];
    return divisions.sort();
  }, [claims]);

  // All jobs in one list; the Paying Privately button narrows it to private jobs.
  const privateCount = claims.filter(isPrivateJob).length;
  const tabClaims = privateOnly ? claims.filter(isPrivateJob) : claims;

  const filteredClaims = tabClaims.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      c.reg?.toLowerCase().includes(q) ||
      c.client_name?.toLowerCase().includes(q) ||
      c.job_number?.toLowerCase().includes(q) ||
      c.referrer_ref?.toLowerCase().includes(q) ||
      c.make_model?.toLowerCase().includes(q) ||
      c.insurer?.toLowerCase().includes(q) ||
      c.business_division?.toLowerCase().includes(q) ||
      c.driver_contact_name?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || getJourneyGroupKey(c) === statusFilter;
    const matchesInsurer = !insurerFilter || c.insurer === insurerFilter;
    const matchesClaimType = !claimTypeFilter || c.claim_type === claimTypeFilter;
    const matchesBusinessDivision = !businessDivisionFilter || c.business_division === businessDivisionFilter;
    return matchesSearch && matchesStatus && matchesInsurer && matchesClaimType && matchesBusinessDivision;
  }).sort((a, b) => {
    if (sortBy === 'created_asc') return new Date(a.created_date) - new Date(b.created_date);
    if (sortBy === 'loss_asc') return new Date(a.loss_date || 0) - new Date(b.loss_date || 0);
    if (sortBy === 'loss_desc') return new Date(b.loss_date || 0) - new Date(a.loss_date || 0);
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const activeFiltersCount = [privateOnly, statusFilter !== 'all', insurerFilter, claimTypeFilter, businessDivisionFilter].filter(Boolean).length;

  const displayName = referrer?.name || company?.name || 'Referrer';

  if (!currentUser) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  if (!isLinked) {
    return (
      <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
        <AlertCircle className="w-16 h-16 mx-auto text-warning-fg mb-4" />
        <h2 className="text-xl font-bold mb-2">Account not linked</h2>
        <p className="text-foreground-muted">
          Your account is not linked to a referrer. Please contact RCM Automotive to set up your referrer portal access.
        </p>
      </div>
    );
  }

  // Claim detail view takes highest priority
  if (viewingClaim) {
    return (
      <ReferrerLayout>
        <ReferrerClaimDetail claim={viewingClaim} onClose={() => { setViewingClaim(null); setInitialSection(null); }} initialSection={initialSection} />
      </ReferrerLayout>
    );
  }

  // Dashboard view (default)
  if (activeTab === 'dashboard') {
    return (
      <ReferrerLayout>
        <ReferrerDashboard />
      </ReferrerLayout>
    );
  }

  // Claims list view

  const getStatusDot = (statusName) => getJourneyStatusDot(statusName);

  const toggleGroup = (status) => setCollapsedGroups(p => ({ ...p, [status]: !p[status] }));

  const formatDate = (val) => {
    if (!val) return '—';
    try { return format(new Date(val), 'dd/MM/yyyy'); } catch { return val; }
  };

  const FIELD_LABELS = {
    client_name: 'Client',
    make_model: 'Vehicle',
    loss_date: 'Loss Date',
    insurer: 'Insurer',
    referrer_ref: 'Ref',
    driver_contact_name: 'Driver',
    business_division: 'Business Division',
    claim_type: 'Claim Type',
    claim_ref: 'Claim Ref',
    policy_number: 'Policy No',
    vehicle_location: 'Location',
    booking_in_date: 'Booking In',
    ecd: 'ECD',
    documents: 'Docs',
    vehicle_damage: 'Damage',
  };

  const renderFieldValue = (claim, fieldId) => {
    if (fieldId === 'vehicle_damage') {
      const val = claim.vehicle_damage;
      if (!val) return '—';
      return (
        <span className="relative group cursor-default">
          <span className="truncate max-w-[120px] inline-block">{val}</span>
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 bg-foreground text-background text-xs rounded-lg px-3 py-2 max-w-xs break-words shadow-lg">
            {val}
          </span>
        </span>
      );
    }
    if (fieldId === 'documents') {
      const docCount = (claim.file_urls?.length || 0) + (claim.image_urls?.length || 0);
      return (
        <button
          onClick={(e) => { e.stopPropagation(); setInitialSection('documents'); setViewingClaim(claim); }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-info-bg text-info-fg text-xs font-medium hover:bg-info-bg transition-colors"
        >
          <FileText className="w-3 h-3" />
          {docCount}
        </button>
      );
    }
    const val = claim[fieldId];
    if (fieldId === 'loss_date' || fieldId === 'booking_in_date' || fieldId === 'ecd') return formatDate(val);
    if (val === null || val === undefined || val === '') return '—';
    return String(val);
  };

  // Default fields if none saved yet
  const displayFields = userCardFields;

  return (
    <ReferrerLayout>
      {currentUser?.show_feedback_prompt && (
        <FeedbackModal user={currentUser} onClose={() => {}} />
      )}
      {/* Claims list */}
      <div className="h-full flex flex-col min-h-0 bg-card rounded-xl border border-border overflow-hidden shadow-card m-4 mt-0 max-md:m-0">
            {/* Search bar with filters */}
            <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border flex-shrink-0 bg-muted flex-wrap gap-y-2">
              <div className="flex-1 min-w-[200px] relative">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by reg, client, job number, driver..."
                  className="w-full px-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-ring focus:ring-2 focus:ring-blue-500/15 text-foreground placeholder-gray-400 transition-all"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="px-2 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-ring cursor-pointer">
                  <option value="created_desc">Created (Newest)</option>
                  <option value="created_asc">Created (Oldest)</option>
                  <option value="loss_desc">Accident Date (Newest)</option>
                  <option value="loss_asc">Accident Date (Oldest)</option>
                </select>
                <button
                  onClick={() => setShowFieldsModal(true)}
                  className="p-2 text-muted-foreground hover:text-muted-foreground transition-colors"
                  title="Customise columns"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
<PayingPrivatelyFilter active={privateOnly} onChange={setPrivateOnly} count={privateCount} />
                <button onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${activeFiltersCount > 0 ? 'bg-info-bg border-info/30 text-info-fg' : 'border-border text-muted-foreground hover:bg-card hover:border-border'}`}>
                  <Filter className="w-3.5 h-3.5" />
                  Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
                </button>
                {activeFiltersCount > 0 && (
                        <button onClick={() => { setStatusFilter('all'); setInsurerFilter(''); setClaimTypeFilter(''); setBusinessDivisionFilter(''); setPrivateOnly(false); }}
                          className="p-1.5 text-muted-foreground hover:text-muted-foreground transition-colors"><X className="w-3.5 h-3.5" /></button>
                      )}
              </div>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="px-5 py-3 border-b border-border bg-muted flex-shrink-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-0.5">Status</label>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-card border border-border rounded text-foreground focus:outline-none">
                      <option value="all">All Statuses</option>
                      {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-0.5">Claim Type</label>
                    <select value={claimTypeFilter} onChange={e => setClaimTypeFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-card border border-border rounded text-foreground focus:outline-none">
                      <option value="">All Types</option>
                      <option value="Fault Claim">Fault Claim</option>
                      <option value="Non-Fault - Own Insurer">Non-Fault - Own Insurer</option>
                      <option value="3rd Party Insurer Direct">3rd Party Insurer Direct</option>
                      <option value="3rd Party Paying Privately">3rd Party Paying Privately</option>
                      <option value="Credit Repair">Credit Repair</option>
                      <option value="Glass Claim">Glass Claim</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-0.5">Insurer</label>
                    <select value={insurerFilter} onChange={e => setInsurerFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-card border border-border rounded text-foreground focus:outline-none">
                      <option value="">All Insurers</option>
                      {uniqueInsurers.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-0.5">Business Division</label>
                    <select value={businessDivisionFilter} onChange={e => setBusinessDivisionFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-card border border-border rounded text-foreground focus:outline-none">
                      <option value="">All Divisions</option>
                      {uniqueBusinessDivisions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Table/List with status grouping */}
            <div className="flex-1 overflow-auto min-h-0" style={{WebkitOverflowScrolling: 'touch'}}>
              {isLoading ? (
                <LoadingRows label="Loading claims" />
              ) : filteredClaims.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <p className="text-sm text-muted-foreground">{search ? 'No claims match your search.' : 'No claims found.'}</p>
                </div>
              ) : (
                <>
                  {/* Mobile card view with grouping */}
                  <div className="lg:hidden">
                    {availableStatuses.map(statusGroup => {
                      const claimsInGroup = filteredClaims.filter(c => getJourneyGroupKey(c) === statusGroup);
                      if (claimsInGroup.length === 0) return null;
                      const isCollapsed = collapsedGroups[statusGroup];
                      const dotColor = getStatusDot(statusGroup);
                      return (
                        <React.Fragment key={statusGroup}>
                          <div role="button" tabIndex={0} onKeyDown={activateOnKey}
                            className="flex items-center gap-2 px-4 py-2 bg-muted cursor-pointer select-none border-b border-border"
                            onClick={() => toggleGroup(statusGroup)}
                          >
                            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                            <span className="text-sm font-semibold text-foreground">{statusGroup}</span>
                            <span className="text-xs text-muted-foreground ml-1">{claimsInGroup.length}</span>
                          </div>
                          {!isCollapsed && claimsInGroup.map(claim => {
                            return (
                              <div role="button" tabIndex={0} onKeyDown={activateOnKey}
                                key={claim.id}
                                onClick={() => setViewingClaim(claim)}
                                className="px-4 py-3 border-b border-border cursor-pointer active:bg-muted transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className="inline-flex items-center justify-center rounded-md bg-[#1e2d4a] text-white font-semibold uppercase flex-shrink-0"
                                    style={{ fontSize: '13px', width: '96px', height: '28px', letterSpacing: '0.05em' }}
                                  >
                                    {claim.reg ? formatUKRegistration(claim.reg) : '—'}
                                  </span>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <ClaimStatusBadges claim={claim} journeyOnly />
                                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-1" />
                                  </div>
                                </div>
                                <div className="mt-1.5 flex flex-col gap-0.5">
                                  <span className="text-sm font-medium text-foreground truncate">{claim.client_name || '—'}</span>
                                  <span className="text-xs text-muted-foreground truncate">{claim.make_model || '—'}</span>
                                  <span className="text-xs text-muted-foreground">{formatDate(claim.loss_date)}</span>
                                  {claim.insurer && <span className="text-xs text-muted-foreground truncate">{claim.insurer}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                    {(() => {
                      const known = new Set(availableStatuses);
                      const ungrouped = filteredClaims.filter(c => {
                        const st = getJourneyGroupKey(c);
                        return !known.has(st);
                      });
                      if (ungrouped.length === 0) return null;
                      const isCollapsed = collapsedGroups['__other__'];
                      return (
                        <React.Fragment>
                          <div role="button" tabIndex={0} onKeyDown={activateOnKey} className="flex items-center gap-2 px-4 py-2 bg-muted cursor-pointer select-none border-b border-border" onClick={() => toggleGroup('__other__')}>
                            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                            <span className="w-2 h-2 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                            <span className="text-sm font-semibold text-foreground">Other</span>
                            <span className="text-xs text-muted-foreground ml-1">{ungrouped.length}</span>
                          </div>
                          {!isCollapsed && ungrouped.map(claim => (
                            <div role="button" tabIndex={0} onKeyDown={activateOnKey} key={claim.id} onClick={() => setViewingClaim(claim)} className="px-4 py-3 border-b border-border cursor-pointer active:bg-muted transition-colors">
                              <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center justify-center rounded-md bg-[#1e2d4a] text-white font-semibold uppercase flex-shrink-0" style={{ fontSize: '13px', width: '96px', height: '28px', letterSpacing: '0.05em' }}>
                                  {claim.reg ? formatUKRegistration(claim.reg) : '—'}
                                </span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <ClaimStatusBadges claim={claim} journeyOnly />
                                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-1" />
                                </div>
                              </div>
                              <div className="mt-1.5 flex flex-col gap-0.5">
                                <span className="text-sm font-medium text-foreground truncate">{claim.client_name || '—'}</span>
                                <span className="text-xs text-muted-foreground truncate">{claim.make_model || '—'}</span>
                                <span className="text-xs text-muted-foreground">{formatDate(claim.loss_date)}</span>
                              </div>
                            </div>
                          ))}
                        </React.Fragment>
                      );
                    })()}
                  </div>

                  {/* Desktop table view with grouping */}
                  <table className="hidden lg:table w-full min-w-[700px]">
                    <thead className="sticky top-0 bg-card z-10">
                      <tr className="border-b border-border">
                        <th className="sticky left-0 z-20 bg-card px-4 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">REG</th>
                        {displayFields.map(fieldId => (
                          <th key={fieldId} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                            {FIELD_LABELS[fieldId] || fieldId}
                          </th>
                        ))}
                        <th className="sticky right-0 z-20 bg-card px-4 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableStatuses.map(statusGroup => {
                        const claimsInGroup = filteredClaims.filter(c => getJourneyGroupKey(c) === statusGroup);
                        if (claimsInGroup.length === 0) return null;
                        const isCollapsed = collapsedGroups[statusGroup];
                        const dotColor = getStatusDot(statusGroup);
                        const colSpan = displayFields.length + 2;
                        return (
                          <React.Fragment key={statusGroup}>
                            <tr
                              className="bg-muted cursor-pointer select-none hover:bg-muted"
                              onClick={() => toggleGroup(statusGroup)}
                            >
                              <td colSpan={colSpan} className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                                  <span className="text-sm font-semibold text-foreground">{statusGroup}</span>
                                  <span className="text-xs text-muted-foreground font-normal ml-1">{claimsInGroup.length}</span>
                                </div>
                              </td>
                            </tr>
                            {!isCollapsed && claimsInGroup.map(claim => {
                              return (
                                <tr
                                  key={claim.id}
                                  onClick={() => setViewingClaim(claim)}
                                  className="group border-b border-border cursor-pointer transition-colors text-sm hover:bg-muted"
                                >
                                  <td className="sticky left-0 z-10 px-4 py-2.5 whitespace-nowrap bg-card group-hover:bg-muted">
                                    <span
                                      className="inline-flex items-center justify-center rounded-md bg-[#1e2d4a] text-white font-semibold uppercase"
                                      style={{ fontSize: '13px', width: '96px', height: '28px', letterSpacing: '0.05em' }}
                                    >
                                      {claim.reg ? formatUKRegistration(claim.reg) : ''}
                                    </span>
                                  </td>
                                  {displayFields.map(fieldId => (
                                    <td key={fieldId} className={`px-4 py-2.5 text-muted-foreground whitespace-nowrap max-w-[160px] ${fieldId === 'vehicle_damage' ? 'overflow-visible' : 'overflow-hidden text-ellipsis'}`}>
                                      {renderFieldValue(claim, fieldId)}
                                    </td>
                                  ))}
                                  <td className="sticky right-0 z-10 px-3 py-2.5 whitespace-nowrap bg-card group-hover:bg-muted">
                                    <div className="flex items-center gap-1.5 justify-end flex-wrap">
                                      <ClaimStatusBadges claim={claim} journeyOnly />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                      {(() => {
                        const known = new Set(availableStatuses);
                        const ungrouped = filteredClaims.filter(c => !known.has(getJourneyGroupKey(c)));
                        if (ungrouped.length === 0) return null;
                        const isCollapsed = collapsedGroups['__other__'];
                        const colSpan = displayFields.length + 2;
                        return (
                          <React.Fragment>
                            <tr className="bg-muted cursor-pointer select-none" onClick={() => toggleGroup('__other__')}>
                              <td colSpan={colSpan} className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                                  <span className="text-sm font-semibold text-foreground">Other</span>
                                  <span className="text-xs text-muted-foreground ml-1">{ungrouped.length}</span>
                                </div>
                              </td>
                            </tr>
                            {!isCollapsed && ungrouped.map(claim => (
                              <tr key={claim.id} onClick={() => setViewingClaim(claim)} className="group border-b border-border cursor-pointer transition-colors text-sm hover:bg-muted">
                                <td className="sticky left-0 z-10 px-4 py-2.5 whitespace-nowrap bg-card group-hover:bg-muted">
                                  <span className="inline-flex items-center justify-center rounded-md bg-[#1e2d4a] text-white font-semibold uppercase" style={{ fontSize: '13px', width: '96px', height: '28px', letterSpacing: '0.05em' }}>
                                    {claim.reg ? formatUKRegistration(claim.reg) : ''}
                                  </span>
                                </td>
                                {displayFields.map(fieldId => (
                                  <td key={fieldId} className={`px-4 py-2.5 text-muted-foreground whitespace-nowrap max-w-[160px] ${fieldId === 'vehicle_damage' ? 'overflow-visible' : 'overflow-hidden text-ellipsis'}`}>
                                    {renderFieldValue(claim, fieldId)}
                                  </td>
                                ))}
                                <td className="sticky right-0 z-10 px-3 py-2.5 whitespace-nowrap bg-card group-hover:bg-muted">
                                  <div className="flex items-center gap-1.5 justify-end flex-wrap">
                                    <ClaimStatusBadges claim={claim} journeyOnly />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })()}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            {/* Footer count */}
            <div className="px-5 py-2 border-t border-border text-xs text-muted-foreground flex-shrink-0">
              {filteredClaims.length} of {claims.length} claims{privateOnly ? ' · paying privately only' : ''}
            </div>
          </div>
      <ClaimCardFieldsModal
        isOpen={showFieldsModal}
        onClose={() => setShowFieldsModal(false)}
        selectedFields={savedFields}
        onSave={(fields) => updateUserFieldsMutation.mutate(fields)}
        mandatoryFields={[]}
      />
    </ReferrerLayout>
  );
}