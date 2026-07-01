import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClientClaims } from '@/functions/getClientClaims';
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
import ClientLayout from '../components/client/ClientLayout';
import ReferrerClaimDetail from '../components/referrer/ReferrerClaimDetail';
import ClientDashboard from '../components/client/ClientDashboard';
import ClaimCardFieldsModal from '../components/claims/ClaimCardFieldsModal';

export default function ClientPortal() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewingClaim, setViewingClaim] = useState(null);
  const [initialSection, setInitialSection] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [claimTypeFilter, setClaimTypeFilter] = useState('');
  const [businessDivisionFilter, setBusinessDivisionFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [showFieldsModal, setShowFieldsModal] = useState(false);
  const [sortBy, setSortBy] = useState('created_desc');
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleNav = (e) => {
      if (e.detail === 'claims') setActiveTab('claims');
      if (e.detail === 'dashboard') setActiveTab('dashboard');
    };
    window.addEventListener('client-nav', handleNav);
    return () => window.removeEventListener('client-nav', handleNav);
  }, []);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const companyId = currentUser?.company_id;

  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['clientClaimsFn', companyId],
    queryFn: async () => {
      const res = await getClientClaims({});
      return res.data?.claims || [];
    },
    enabled: !!companyId,
    staleTime: 0,
  });

  const { data: customStatuses = [] } = useQuery({
    queryKey: ['ClaimStatusConfig'],
    queryFn: () => base44.entities.ClaimStatusConfig.list('sort_order'),
    staleTime: 5 * 60 * 1000,
  });

  const availableStatuses = useMemo(() => {
    const active = customStatuses
      .filter(s => s.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(s => s.status_name);
    return active.includes('New') ? active : ['New', ...active];
  }, [customStatuses]);

  useEffect(() => {
    if (availableStatuses.length > 0) {
      const collapsed = {};
      availableStatuses.forEach(s => { collapsed[s] = false; });
      collapsed['__other__'] = false;
      setCollapsedGroups(collapsed);
    }
  }, [availableStatuses.length]);

  const uniqueInsurers = useMemo(() => {
    const insurers = [...new Set(claims.map(c => c.insurer).filter(Boolean))];
    return insurers.sort();
  }, [claims]);

  const uniqueBusinessDivisions = useMemo(() => {
    const divisions = [...new Set(claims.map(c => c.business_division).filter(Boolean))];
    return divisions.sort();
  }, [claims]);

  const filteredClaims = claims.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      c.reg?.toLowerCase().includes(q) ||
      c.client_name?.toLowerCase().includes(q) ||
      c.job_number?.toLowerCase().includes(q) ||
      c.make_model?.toLowerCase().includes(q) ||
      c.insurer?.toLowerCase().includes(q) ||
      c.business_division?.toLowerCase().includes(q) ||
      c.driver_contact_name?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || (c.job_status || 'New') === statusFilter;
    const matchesClaimType = !claimTypeFilter || c.claim_type === claimTypeFilter;
    const matchesBusinessDivision = !businessDivisionFilter || c.business_division === businessDivisionFilter;
    return matchesSearch && matchesStatus && matchesClaimType && matchesBusinessDivision;
  }).sort((a, b) => {
    if (sortBy === 'created_asc') return new Date(a.created_date) - new Date(b.created_date);
    if (sortBy === 'loss_asc') return new Date(a.loss_date || 0) - new Date(b.loss_date || 0);
    if (sortBy === 'loss_desc') return new Date(b.loss_date || 0) - new Date(a.loss_date || 0);
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const activeFiltersCount = [statusFilter !== 'all', claimTypeFilter, businessDivisionFilter].filter(Boolean).length;

  const savedFields = currentUser?.claim_card_fields || [];
  const userCardFields = [...savedFields.filter(f => f !== 'referrer')];

  const updateUserFieldsMutation = useMutation({
    mutationFn: (fields) => base44.auth.updateMe({ claim_card_fields: fields }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currentUser'] }),
  });

  const isLoading = !currentUser || claimsLoading;

  if (!currentUser) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  if (!companyId) {
    return (
      <ClientLayout>
        <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
          <AlertCircle className="w-16 h-16 text-amber-500" />
          <h2 className="text-xl font-bold">Account Not Linked</h2>
          <p className="text-gray-500 max-w-sm">
            Your account is not linked to a client record. Please contact RCM Automotive to set up your client portal access.
          </p>
        </div>
      </ClientLayout>
    );
  }

  const getStatusDot = (statusName) => {
    const cfg = customStatuses?.find(s => s.status_name === statusName);
    const colors = { blue: '#3b82f6', green: '#22c55e', orange: '#f97316', red: '#ef4444', purple: '#a855f7', yellow: '#eab308', gray: '#6b7280' };
    return colors[cfg?.color] || '#6b7280';
  };

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
    driver_contact_name: 'Driver',
    business_division: 'Business Division',
    referrer_ref: 'Ref',
    claim_type: 'Claim Type',
    claim_ref: 'Claim Ref',
    policy_number: 'Policy No',
    vehicle_location: 'Location',
    booking_in_date: 'Booking In',
    ecd: 'ECD',
    documents: 'Docs',
    vehicle_damage: 'Damage',
    client_ref: 'Client Ref',
  };

  const renderFieldValue = (claim, fieldId) => {
    if (fieldId === 'vehicle_damage') {
      const val = claim.vehicle_damage;
      if (!val) return '—';
      return (
        <span className="relative group cursor-default">
          <span className="truncate max-w-[120px] inline-block">{val}</span>
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 max-w-xs break-words shadow-lg">
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
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
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

  const displayFields = userCardFields;

  if (viewingClaim) {
    return (
      <ClientLayout>
        <ReferrerClaimDetail claim={viewingClaim} onClose={() => { setViewingClaim(null); setInitialSection(null); }} initialSection={initialSection} />
      </ClientLayout>
    );
  }

  if (activeTab === 'dashboard') {
    return (
      <ClientLayout>
        <ClientDashboard />
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="h-full flex flex-col min-h-0 bg-white dark:bg-gray-900 rounded-[10px] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm m-4 mt-0">
        {/* Search bar with filters */}
        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-gray-50 dark:bg-gray-900/50 flex-wrap gap-y-2">
          <div className="flex-1 min-w-[200px] relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by reg, client, job number, vehicle..."
              className="w-full px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[10px] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 text-gray-900 dark:text-white placeholder-gray-400 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="px-2 py-1.5 text-[11px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[10px] text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-400 cursor-pointer">
              <option value="created_desc">Created (Newest)</option>
              <option value="created_asc">Created (Oldest)</option>
              <option value="loss_desc">Accident Date (Newest)</option>
              <option value="loss_asc">Accident Date (Oldest)</option>
            </select>
            <button
              onClick={() => setShowFieldsModal(true)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Customise columns"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium border transition-all ${activeFiltersCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300'}`}>
              <Filter className="w-3.5 h-3.5" />
              Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
            </button>
            {activeFiltersCount > 0 && (
              <button onClick={() => { setStatusFilter('all'); setClaimTypeFilter(''); setBusinessDivisionFilter(''); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-3.5 h-3.5" /></button>
            )}
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 flex-shrink-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-0.5">Status</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 focus:outline-none">
                  <option value="all">All Statuses</option>
                  {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-0.5">Claim Type</label>
                <select value={claimTypeFilter} onChange={e => setClaimTypeFilter(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 focus:outline-none">
                  <option value="">All Types</option>
                  <option value="Fault Claim">Fault Claim</option>
                  <option value="3rd Party Direct">3rd Party Direct</option>
                  <option value="Credit Repair">Credit Repair</option>
                  <option value="Glass Claim">Glass Claim</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-0.5">Business Division</label>
                <select value={businessDivisionFilter} onChange={e => setBusinessDivisionFilter(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 focus:outline-none">
                  <option value="">All Divisions</option>
                  {uniqueBusinessDivisions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Table/List with status grouping */}
        <div className="flex-1 overflow-auto min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">Loading claims...</div>
          ) : filteredClaims.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <p className="text-sm text-gray-400">{search ? 'No claims match your search.' : 'No claims found.'}</p>
            </div>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="lg:hidden">
                {availableStatuses.map(statusGroup => {
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
                      {!isCollapsed && claimsInGroup.map(claim => (
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
                              <StatusBadge status={claim.job_status} />
                              {claim.secondary_status && <StatusBadge status={claim.secondary_status} variant="secondary" />}
                              <ChevronRight className="w-4 h-4 text-gray-400 ml-1" />
                            </div>
                          </div>
                          <div className="mt-1.5 flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{claim.make_model || '—'}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(claim.loss_date)}</span>
                            {claim.insurer && <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{claim.insurer}</span>}
                          </div>
                        </div>
                      ))}
                    </React.Fragment>
                  );
                })}
                {(() => {
                  const known = new Set(availableStatuses);
                  const ungrouped = filteredClaims.filter(c => !known.has(c.job_status || 'New'));
                  if (ungrouped.length === 0) return null;
                  const isCollapsed = collapsedGroups['__other__'];
                  return (
                    <React.Fragment>
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/60 cursor-pointer select-none border-b border-gray-100 dark:border-gray-800" onClick={() => toggleGroup('__other__')}>
                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                        <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Other</span>
                        <span className="text-xs text-gray-400 ml-1">{ungrouped.length}</span>
                      </div>
                      {!isCollapsed && ungrouped.map(claim => (
                        <div key={claim.id} onClick={() => setViewingClaim(claim)} className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/60 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center justify-center rounded-md bg-[#1e2d4a] text-white font-semibold uppercase flex-shrink-0" style={{ fontSize: '13px', width: '96px', height: '28px', letterSpacing: '0.05em' }}>
                              {claim.reg ? formatUKRegistration(claim.reg) : '—'}
                            </span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <StatusBadge status={claim.job_status} />
                              <ChevronRight className="w-4 h-4 text-gray-400 ml-1" />
                            </div>
                          </div>
                          <div className="mt-1.5 flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{claim.make_model || '—'}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(claim.loss_date)}</span>
                          </div>
                        </div>
                      ))}
                    </React.Fragment>
                  );
                })()}
              </div>

              {/* Desktop table view */}
              <table className="hidden lg:table w-full min-w-[700px]">
                <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="sticky left-0 z-20 bg-white dark:bg-gray-900 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">REG</th>
                    {displayFields.map(fieldId => (
                      <th key={fieldId} className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {FIELD_LABELS[fieldId] || fieldId}
                      </th>
                    ))}
                    <th className="sticky right-0 z-20 bg-white dark:bg-gray-900 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {availableStatuses.map(statusGroup => {
                    const claimsInGroup = filteredClaims.filter(c => (c.job_status || 'New') === statusGroup);
                    if (claimsInGroup.length === 0) return null;
                    const isCollapsed = collapsedGroups[statusGroup];
                    const dotColor = getStatusDot(statusGroup);
                    const colSpan = displayFields.length + 2;
                    return (
                      <React.Fragment key={statusGroup}>
                        <tr
                          className="bg-gray-50 dark:bg-gray-800/60 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={() => toggleGroup(statusGroup)}
                        >
                          <td colSpan={colSpan} className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{statusGroup}</span>
                              <span className="text-xs text-gray-400 font-normal ml-1">{claimsInGroup.length}</span>
                            </div>
                          </td>
                        </tr>
                        {!isCollapsed && claimsInGroup.map(claim => (
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
                            {displayFields.map(fieldId => (
                              <td key={fieldId} className={`px-4 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap max-w-[160px] ${fieldId === 'vehicle_damage' ? 'overflow-visible' : 'overflow-hidden text-ellipsis'}`}>
                                {renderFieldValue(claim, fieldId)}
                              </td>
                            ))}
                            <td className="sticky right-0 z-10 px-3 py-2.5 whitespace-nowrap bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50">
                              <div className="flex items-center gap-1.5 justify-end flex-wrap">
                                {claim.secondary_status && <StatusBadge status={claim.secondary_status} variant="secondary" />}
                                <StatusBadge status={claim.job_status} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  {(() => {
                    const known = new Set(availableStatuses);
                    const ungrouped = filteredClaims.filter(c => !known.has(c.job_status || 'New'));
                    if (ungrouped.length === 0) return null;
                    const isCollapsed = collapsedGroups['__other__'];
                    const colSpan = displayFields.length + 2;
                    return (
                      <React.Fragment>
                        <tr className="bg-gray-50 dark:bg-gray-800/60 cursor-pointer select-none" onClick={() => toggleGroup('__other__')}>
                          <td colSpan={colSpan} className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                              <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Other</span>
                              <span className="text-xs text-gray-400 ml-1">{ungrouped.length}</span>
                            </div>
                          </td>
                        </tr>
                        {!isCollapsed && ungrouped.map(claim => (
                          <tr key={claim.id} onClick={() => setViewingClaim(claim)} className="group border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="sticky left-0 z-10 px-4 py-2.5 whitespace-nowrap bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50">
                              <span className="inline-flex items-center justify-center rounded-md bg-[#1e2d4a] text-white font-semibold uppercase" style={{ fontSize: '13px', width: '96px', height: '28px', letterSpacing: '0.05em' }}>
                                {claim.reg ? formatUKRegistration(claim.reg) : ''}
                              </span>
                            </td>
                            {displayFields.map(fieldId => (
                              <td key={fieldId} className={`px-4 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap max-w-[160px] ${fieldId === 'vehicle_damage' ? 'overflow-visible' : 'overflow-hidden text-ellipsis'}`}>
                                {renderFieldValue(claim, fieldId)}
                              </td>
                            ))}
                            <td className="sticky right-0 z-10 px-3 py-2.5 whitespace-nowrap bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50">
                              <div className="flex items-center gap-1.5 justify-end flex-wrap">
                                <StatusBadge status={claim.job_status} />
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
        <div className="px-5 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 flex-shrink-0">
          {filteredClaims.length} of {claims.length} claims
        </div>
      </div>
      <ClaimCardFieldsModal
        isOpen={showFieldsModal}
        onClose={() => setShowFieldsModal(false)}
        selectedFields={savedFields}
        onSave={(fields) => updateUserFieldsMutation.mutate(fields)}
        mandatoryFields={[]}
      />
    </ClientLayout>
  );
}