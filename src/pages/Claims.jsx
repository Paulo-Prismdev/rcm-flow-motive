import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Archive, Filter, X, AlertTriangle, Clock, Upload, Package, ChevronDown, ChevronRight, Settings2 } from 'lucide-react';
import ClaimDetail from '../components/claims/ClaimDetail';
import ClaimFormWrapper from '../components/claims/ClaimFormWrapper';
import ImportClaimsModal from '../components/claims/ImportClaimsModal';
import ClaimCardFieldsModal from '../components/claims/ClaimCardFieldsModal';
import UpdateStatusBadge from '../components/shared/UpdateStatusBadge';
import { formatUKRegistration } from '../components/shared/formatRegistration';
import { format } from 'date-fns';
import { useStatusConfigs } from '../components/shared/StatusConfigContext';

// Status dot colour map
const STATUS_COLORS = {
  blue: '#3b82f6', green: '#22c55e', orange: '#f97316',
  red: '#ef4444', purple: '#a855f7', yellow: '#eab308', gray: '#6b7280',
};

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

export default function ClaimsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState([]);
  const [claimTypeFilter, setClaimTypeFilter] = useState('');
  const [insurerFilter, setInsurerFilter] = useState('');
  const [referrerFilter, setReferrerFilter] = useState('');
  const [updateStatusFilter, setUpdateStatusFilter] = useState('');
  const [repairerAcceptanceFilter, setRepairerAcceptanceFilter] = useState('');
  const [repairerFilter, setRepairerFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showFieldsModal, setShowFieldsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [hasBackorderedPartsFilter, setHasBackorderedPartsFilter] = useState(false);
  const [claimIdsWithBackorders, setClaimIdsWithBackorders] = useState(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const queryClient = useQueryClient();
  const { allStatuses: statusConfigs } = useStatusConfigs();

  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const isInternalUser = currentUser?.user_type === 'internal' || currentUser?.role === 'admin';
  const MANDATORY_FIELDS = ['client_name', 'make_model', 'loss_date', 'referrer'];
  const savedFields = currentUser?.claim_card_fields || [];
  const userCardFields = [...MANDATORY_FIELDS, ...savedFields.filter(f => !MANDATORY_FIELDS.includes(f))];

  const updateUserFieldsMutation = useMutation({
    mutationFn: (fields) => base44.auth.updateMe({ claim_card_fields: fields }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currentUser'] }),
  });

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['claims'],
    queryFn: () => base44.entities.Claim.list('-created_date', 5000),
  });

  const { data: backorderedParts = [] } = useQuery({
    queryKey: ['backorderedParts'],
    queryFn: () => base44.entities.BackorderedPart.list(),
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (backorderedParts.length > 0) {
      setClaimIdsWithBackorders(new Set(
        backorderedParts.filter(p => !p.received_by_repairer).map(p => p.claim_id)
      ));
    }
  }, [backorderedParts]);

  const { data: customStatuses = [] } = useQuery({
    queryKey: ['ClaimStatusConfig'],
    queryFn: () => base44.entities.ClaimStatusConfig.list('sort_order'),
    staleTime: 0,
  });

  const availableStatuses = useMemo(() => {
    const active = customStatuses
      .filter(s => s.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(s => s.status_name);
    return active.includes('New') ? active : ['New', ...active];
  }, [customStatuses]);

  // Collapse all groups by default on load
  useEffect(() => {
    if (availableStatuses.length > 0) {
      const collapsed = {};
      availableStatuses.forEach(s => { collapsed[s] = true; });
      collapsed['__other__'] = true;
      setCollapsedGroups(collapsed);
    }
  }, [availableStatuses.length]);

  const uniqueInsurers = [...new Set(claims.map(c => c.insurer).filter(Boolean))].sort();
  const uniqueReferrers = [...new Set(claims.map(c => c.referrer).filter(Boolean))].sort();
  const uniqueRepairers = [...new Set(claims.map(c => c.bodyshop).filter(Boolean))].sort();

  const location = useLocation();
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const claimId = urlParams.get('id');
    if (claimId && claims.length > 0) {
      const claim = claims.find(c => c.id === claimId);
      if (claim) {
        setSelectedClaim(claim);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [claims, location.search]);

  const createMutation = useMutation({
    mutationFn: (newClaim) => base44.entities.Claim.create(newClaim),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['claims'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Claim.update(id, data),
    onSuccess: (savedClaim) => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      if (savedClaim) setSelectedClaim(savedClaim);
    },
  });

  const handleUpdate = (updatedClaim) => {
    updateMutation.mutate({ id: updatedClaim.id, data: updatedClaim });
    setSelectedClaim(updatedClaim);
  };

  const clearAllFilters = () => {
    setSearchTerm(''); setStatusFilter([]); setClaimTypeFilter('');
    setInsurerFilter(''); setReferrerFilter(''); setRepairerFilter('');
    setUpdateStatusFilter(''); setRepairerAcceptanceFilter(''); setHasBackorderedPartsFilter(false);
  };

  const activeFiltersCount = [(statusFilter?.length || 0) > 0, claimTypeFilter, insurerFilter, referrerFilter, repairerFilter, updateStatusFilter, repairerAcceptanceFilter, hasBackorderedPartsFilter].filter(Boolean).length;

  const allClaims = showArchived ? claims : claims.filter(c => !c.archived);

  const filteredClaims = allClaims.filter(c => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      c.reg?.toLowerCase().includes(s) || c.client_name?.toLowerCase().includes(s) ||
      c.job_number?.toLowerCase().includes(s) || c.insurer?.toLowerCase().includes(s) ||
      c.referrer?.toLowerCase().includes(s);
    const matchesStatus = !statusFilter.length || (c.job_statuses || []).some(st => statusFilter.includes(st));
    const matchesClaimType = !claimTypeFilter || c.claim_type === claimTypeFilter;
    const matchesInsurer = !insurerFilter || c.insurer === insurerFilter;
    const matchesReferrer = !referrerFilter || c.referrer === referrerFilter;
    const matchesRepairer = !repairerFilter || c.bodyshop === repairerFilter;
    const matchesUpdateStatus = !updateStatusFilter || calculateUpdateStatus(c) === updateStatusFilter;
    let matchesRepairerAcceptance = true;
    if (repairerAcceptanceFilter === 'awaiting') matchesRepairerAcceptance = c.bodyshop_id && !c.repairer_accepted && !['Completed','Cancelled','Total Loss'].includes(c.job_status);
    else if (repairerAcceptanceFilter === 'accepted') matchesRepairerAcceptance = c.repairer_accepted === true;
    const matchesBackorders = !hasBackorderedPartsFilter || claimIdsWithBackorders.has(c.id);
    return matchesSearch && matchesStatus && matchesClaimType && matchesInsurer && matchesReferrer && matchesRepairer && matchesUpdateStatus && matchesRepairerAcceptance && matchesBackorders;
  }).sort((a, b) => {
    const prio = { Red: 1, Amber: 2, Green: 3, Blue: 3, Gray: 4 };
    const pa = prio[calculateUpdateStatus(a)] || 3, pb = prio[calculateUpdateStatus(b)] || 3;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_date) - new Date(a.created_date);
  });

  // Hide the global layout header on mobile when a claim detail is open
  useEffect(() => {
    if (selectedClaim) {
      document.body.classList.add('claim-detail-open');
    } else {
      document.body.classList.remove('claim-detail-open');
    }
    return () => document.body.classList.remove('claim-detail-open');
  }, [selectedClaim]);

  const toggleGroup = (status) => setCollapsedGroups(p => ({ ...p, [status]: !p[status] }));

  const getStatusDot = (statusName) => {
    const cfg = statusConfigs?.find(s => s.status_name === statusName);
    return STATUS_COLORS[cfg?.color] || '#6b7280';
  };

  const formatDate = (val) => {
    if (!val) return '—';
    try { return format(new Date(val), 'dd/MM/yyyy'); } catch { return val; }
  };

  if (showForm) {
    return <ClaimFormWrapper onSubmit={(d) => createMutation.mutate(d)} onCancel={() => setShowForm(false)} />;
  }

  // The claims table row (desktop)
  const renderRow = (claim) => {
    const updateStatus = calculateUpdateStatus(claim);
    const isSelected = selectedClaim?.id === claim.id;
    const hasBackorder = claimIdsWithBackorders.has(claim.id);
    const isClosedStatus = (claim.job_statuses || []).some(s => ['Completed','Cancelled','Total Loss'].includes(s));

    return (
      <tr
        key={claim.id}
        onClick={() => setSelectedClaim(claim)}
        className={`group border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors text-sm ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/20'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }`}
      >
        {/* Sticky left: Reg */}
        <td className={`sticky left-0 z-10 px-4 py-2.5 whitespace-nowrap ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50'}`}>
          <span
            className="inline-flex items-center justify-center w-[118px] h-[28px] rounded-sm px-2 text-black bg-yellow-400 border-2 border-yellow-600 shadow-sm uppercase"
            style={{ fontFamily: "'UK Number Plate', 'Arial Black', 'Franklin Gothic Heavy', Impact, sans-serif", fontWeight: 900, fontSize: '14px', letterSpacing: '0.12em' }}
          >
            {claim.reg ? formatUKRegistration(claim.reg) : ''}
          </span>
        </td>
        {/* Scrollable columns */}
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
        {/* Sticky right: Status + alerts */}
        <td className={`sticky right-0 z-10 px-4 py-2.5 whitespace-nowrap ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50'}`}>
          <div className="flex items-center gap-1">
            {!isClosedStatus && <UpdateStatusBadge status={updateStatus} small />}
            {hasBackorder && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[10px] font-medium">
                <Package className="w-2.5 h-2.5" />BO
              </span>
            )}
            {claim.bodyshop_id && !claim.repairer_accepted && !isClosedStatus && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-medium">
                <Clock className="w-2.5 h-2.5" />
              </span>
            )}
            {claim.claim_type === 'Fault Claim' && claim.third_party_pursuit_status === 'Awaiting Details' && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium">
                <AlertTriangle className="w-2.5 h-2.5 inline" />
              </span>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // Mobile card view for a single claim
  const renderMobileCard = (claim) => {
    const updateStatus = calculateUpdateStatus(claim);
    const hasBackorder = claimIdsWithBackorders.has(claim.id);
    const isClosedStatus = (claim.job_statuses || []).some(s => ['Completed','Cancelled','Total Loss'].includes(s));
    return (
      <div
        key={claim.id}
        onClick={() => setSelectedClaim(claim)}
        className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/60 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center justify-center h-[26px] px-2 rounded-sm text-black bg-yellow-400 border-2 border-yellow-600 shadow-sm uppercase flex-shrink-0"
            style={{ fontFamily: "'UK Number Plate', 'Arial Black', Impact, sans-serif", fontWeight: 900, fontSize: '13px', letterSpacing: '0.12em', minWidth: '100px' }}
          >
            {claim.reg ? formatUKRegistration(claim.reg) : '—'}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
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
          {claim.referrer && <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{claim.referrer}</span>}
        </div>
      </div>
    );
  };

  const claimsListView = (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <ImportClaimsModal isOpen={showImportModal} onClose={() => setShowImportModal(false)}
        onImportComplete={() => { queryClient.invalidateQueries({ queryKey: ['claims'] }); setShowImportModal(false); }} />
      <ClaimCardFieldsModal isOpen={showFieldsModal} onClose={() => setShowFieldsModal(false)}
        selectedFields={userCardFields} onSave={(fields) => updateUserFieldsMutation.mutate(fields)} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <h1 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">Claims</h1>
        <div className="flex items-center gap-1.5">
          {/* Desktop-only buttons */}
          <button onClick={() => setShowFieldsModal(true)} className="hidden lg:flex p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="Customise columns">
            <Settings2 className="w-4 h-4" />
          </button>
          {isInternalUser && (
            <>
              <button onClick={() => setShowArchived(!showArchived)}
                className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showArchived ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <Archive className="w-3.5 h-3.5" />{showArchived ? 'Hide Archived' : 'Archived'}
              </button>
              <button onClick={() => setShowImportModal(true)}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Upload className="w-3.5 h-3.5" />Import
              </button>
            </>
          )}
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#131d47] text-white hover:bg-[#1a2660] transition-colors">
            <Plus className="w-3.5 h-3.5" /><span>New Claim</span>
          </button>
        </div>
      </div>

      {/* Search + filters bar */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by reg, client, job number..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>

        {/* Quick filter dropdowns */}
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${activeFiltersCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800'}`}>
          <Filter className="w-3.5 h-3.5" />
          Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
        </button>
        {activeFiltersCount > 0 && (
          <button onClick={clearAllFilters} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-3.5 h-3.5" /></button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 flex-shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: 'Claim Type', value: claimTypeFilter, onChange: setClaimTypeFilter, options: ['Credit Repair','Fault Claim','Non-Fault Claim','Total Loss','Glass Claim'] },
              { label: 'Insurer', value: insurerFilter, onChange: setInsurerFilter, options: uniqueInsurers },
              { label: 'Referrer', value: referrerFilter, onChange: setReferrerFilter, options: uniqueReferrers },
              { label: 'Repairer', value: repairerFilter, onChange: setRepairerFilter, options: uniqueRepairers },
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
            <div>
              <label className="block text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-0.5">Update Status</label>
              <select value={updateStatusFilter} onChange={e => setUpdateStatusFilter(e.target.value)}
                className="w-full px-2 py-1 text-[11px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 focus:outline-none">
                <option value="">All</option>
                <option value="Red">Overdue</option>
                <option value="Amber">Due Soon</option>
                <option value="Green">On Track</option>
                <option value="Blue">Override</option>
                <option value="Gray">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-0.5">Repairer Acceptance</label>
              <select value={repairerAcceptanceFilter} onChange={e => setRepairerAcceptanceFilter(e.target.value)}
                className="w-full px-2 py-1 text-[11px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 focus:outline-none">
                <option value="">All</option>
                <option value="awaiting">Awaiting</option>
                <option value="accepted">Accepted</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-0.5">Backordered Parts</label>
              <select value={hasBackorderedPartsFilter ? 'true' : ''} onChange={e => setHasBackorderedPartsFilter(e.target.value === 'true')}
                className="w-full px-2 py-1 text-[11px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 focus:outline-none">
                <option value="">All</option>
                <option value="true">Has Backorders</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* List / Table */}
      <div className="flex-1 overflow-auto min-h-0" style={{WebkitOverflowScrolling: 'touch'}}>
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">Loading claims...</div>
        ) : filteredClaims.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <p className="text-sm text-gray-400">{activeFiltersCount > 0 ? 'No claims match your filters' : 'No claims found'}</p>
            {activeFiltersCount > 0
              ? <button onClick={clearAllFilters} className="text-xs text-blue-600 hover:underline">Clear filters</button>
              : <button onClick={() => setShowForm(true)} className="text-xs text-blue-600 hover:underline">Create first claim</button>
            }
          </div>
        ) : (
          <>
            {/* ── MOBILE / TABLET card list (< lg) ── */}
            <div className="lg:hidden">
              {availableStatuses.map(statusGroup => {
                const claimsInGroup = filteredClaims.filter(c => (c.job_statuses || []).includes(statusGroup));
                if (claimsInGroup.length === 0) return null;
                if (statusFilter.length > 0 && !statusFilter.includes(statusGroup)) return null;
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
              {(() => {
                const known = new Set(availableStatuses);
                const ungrouped = filteredClaims.filter(c => {
                  const st = c.job_statuses || [];
                  return st.length === 0 || !st.some(s => known.has(s));
                });
                if (ungrouped.length === 0 || statusFilter.length > 0) return null;
                const isCollapsed = collapsedGroups['__other__'];
                return (
                  <React.Fragment>
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/60 cursor-pointer select-none border-b border-gray-100 dark:border-gray-800" onClick={() => toggleGroup('__other__')}>
                      {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                      <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Other</span>
                      <span className="text-xs text-gray-400 ml-1">{ungrouped.length}</span>
                    </div>
                    {!isCollapsed && ungrouped.map(renderMobileCard)}
                  </React.Fragment>
                );
              })()}
            </div>

            {/* ── DESKTOP table (≥ lg) ── */}
            <table className="hidden lg:table w-full min-w-[700px]">
              <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="sticky left-0 z-20 bg-white dark:bg-gray-900 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">Reg</th>
                  {['Client', 'Vehicle', 'Loss Date', 'Insurer', 'Referrer'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                  <th className="sticky right-0 z-20 bg-white dark:bg-gray-900 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {availableStatuses.map(statusGroup => {
                  const claimsInGroup = filteredClaims.filter(c => (c.job_statuses || []).includes(statusGroup));
                  if (claimsInGroup.length === 0) return null;
                  if (statusFilter.length > 0 && !statusFilter.includes(statusGroup)) return null;
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
                {(() => {
                  const known = new Set(availableStatuses);
                  const ungrouped = filteredClaims.filter(c => {
                    const st = c.job_statuses || [];
                    return st.length === 0 || !st.some(s => known.has(s));
                  });
                  if (ungrouped.length === 0 || statusFilter.length > 0) return null;
                  const isCollapsed = collapsedGroups['__other__'];
                  return (
                    <React.Fragment>
                      <tr className="bg-gray-50 dark:bg-gray-800/60 cursor-pointer select-none" onClick={() => toggleGroup('__other__')}>
                        <td colSpan={7} className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                            <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Other</span>
                            <span className="text-xs text-gray-400 ml-1">{ungrouped.length}</span>
                          </div>
                        </td>
                      </tr>
                      {!isCollapsed && ungrouped.map(renderRow)}
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
        {filteredClaims.length} of {allClaims.length} claims
      </div>
    </div>
  );

  return (
    <div className="h-full flex gap-3 min-h-0 overflow-hidden">
      {/* Left: claims list — hidden on mobile when a claim is selected */}
      <div className={`flex flex-col min-h-0 flex-shrink-0 ${selectedClaim ? 'hidden lg:flex lg:w-[640px] xl:w-[800px] 2xl:w-[900px]' : 'flex w-full'}`}>
        {claimsListView}
      </div>

      {/* Right: detail panel — full screen on mobile, side panel on desktop */}
      {selectedClaim && (
        <div className="flex-1 min-w-0 min-h-0 flex flex-col w-full lg:w-auto">
          <div className="h-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
            <ClaimDetail
              key={selectedClaim.id}
              claim={selectedClaim}
              onClose={() => setSelectedClaim(null)}
              onUpdate={handleUpdate}
              isInternalUser={isInternalUser}
            />
          </div>
        </div>
      )}
    </div>
  );
}