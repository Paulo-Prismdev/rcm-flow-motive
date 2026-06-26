import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Archive, Filter, X, AlertTriangle, Clock, Upload, Package, ChevronDown, ChevronRight, Settings2, ArrowUpDown } from 'lucide-react';
import ClaimDetail from '../components/claims/ClaimDetail';
import ClaimFormWrapper from '../components/claims/ClaimFormWrapper';
import ImportClaimsModal from '../components/claims/ImportClaimsModal';
import ClaimCardFieldsModal from '../components/claims/ClaimCardFieldsModal';
import UpdateStatusBadge from '../components/shared/UpdateStatusBadge';
import StatusBadge from '../components/shared/StatusBadge';
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
  // 48-hour update tracker: based on time since last update or status change
  const lastUpdate = claim.last_updated_at;
  if (lastUpdate) {
    const hours = (now - new Date(lastUpdate)) / 3600000;
    if (hours >= 48) return 'Red';
    if (hours >= 24) return 'Amber';
    return 'Green';
  }
  // No update has ever been logged — never show Green
  const sinceCreated = claim.created_date ? (now - new Date(claim.created_date)) / 3600000 : 48;
  return sinceCreated >= 48 ? 'Red' : 'Amber';
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
  const [businessDivisionFilter, setBusinessDivisionFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showFieldsModal, setShowFieldsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [hasBackorderedPartsFilter, setHasBackorderedPartsFilter] = useState(false);
  const [claimIdsWithBackorders, setClaimIdsWithBackorders] = useState(new Set());
  const [sortBy, setSortBy] = useState('priority');
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const containerRef = React.useRef(null);
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
    staleTime: 30000,
  });

  const { data: backorderedParts = [] } = useQuery({
    queryKey: ['backorderedParts'],
    queryFn: () => base44.entities.BackorderedPart.list(),
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
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
  const uniqueBusinessDivisions = [...new Set(claims.map(c => c.business_division).filter(Boolean))].sort();

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

  const [createError, setCreateError] = useState(null);

  const createMutation = useMutation({
    mutationFn: (newClaim) => base44.entities.Claim.create(newClaim),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['claims'] }); 
      setShowForm(false); 
      setCreateError(null);
    },
    onError: (error) => {
      setCreateError(error?.response?.data?.message || error?.message || 'Failed to create claim. Please try again.');
    },
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
    setBusinessDivisionFilter('');
  };

  const activeFiltersCount = [(statusFilter?.length || 0) > 0, claimTypeFilter, insurerFilter, referrerFilter, repairerFilter, businessDivisionFilter, updateStatusFilter, repairerAcceptanceFilter, hasBackorderedPartsFilter].filter(Boolean).length;

  const allClaims = showArchived ? claims : claims.filter(c => !c.archived);

  const filteredClaims = allClaims.filter(c => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      c.reg?.toLowerCase().includes(s) || c.client_name?.toLowerCase().includes(s) ||
      c.job_number?.toLowerCase().includes(s) || c.insurer?.toLowerCase().includes(s) ||
      c.referrer?.toLowerCase().includes(s) ||
      c.business_division?.toLowerCase().includes(s) ||
      c.driver_contact_name?.toLowerCase().includes(s);
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
    const matchesBusinessDivision = !businessDivisionFilter || c.business_division === businessDivisionFilter;
    return matchesSearch && matchesStatus && matchesClaimType && matchesInsurer && matchesReferrer && matchesRepairer && matchesUpdateStatus && matchesRepairerAcceptance && matchesBackorders && matchesBusinessDivision;
  }).sort((a, b) => {
    if (sortBy === 'created_asc') return new Date(a.created_date) - new Date(b.created_date);
    if (sortBy === 'created_desc') return new Date(b.created_date) - new Date(a.created_date);
    if (sortBy === 'loss_asc') return new Date(a.loss_date || 0) - new Date(b.loss_date || 0);
    if (sortBy === 'loss_desc') return new Date(b.loss_date || 0) - new Date(a.loss_date || 0);
    if (sortBy === 'updated_desc') return new Date(b.last_updated_at || b.created_date) - new Date(a.last_updated_at || a.created_date);
    // Default: priority sort
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

  const CARD_FIELD_CONFIG = {
    client_name: { label: 'Client', render: (c) => c.client_name || '—' },
    make_model: { label: 'Vehicle', render: (c) => c.make_model || '—' },
    loss_date: { label: 'Loss Date', render: (c) => formatDate(c.loss_date) },
    referrer: { label: 'Referrer', render: (c) => c.referrer || '—' },
    insurer: { label: 'Insurer', render: (c) => c.insurer || '—' },
    bodyshop: { label: 'Bodyshop', render: (c) => c.bodyshop || '—' },
    driver_contact_name: { label: 'Driver', render: (c) => c.driver_contact_name || '—' },
    claim_type: { label: 'Type', render: (c) => c.claim_type || '—' },
    booking_in_date: { label: 'Booking In', render: (c) => formatDate(c.booking_in_date) },
    ecd: { label: 'ECD', render: (c) => formatDate(c.ecd) },
    authority_cost_gross: { label: 'Auth Cost', render: (c) => c.authority_cost_gross ? `£${c.authority_cost_gross.toLocaleString()}` : '—' },
    final_repair_cost: { label: 'Final Cost', render: (c) => c.final_repair_cost ? `£${c.final_repair_cost.toLocaleString()}` : '—' },
    claim_ref: { label: 'Claim Ref', render: (c) => c.claim_ref || '—' },
    policy_number: { label: 'Policy No', render: (c) => c.policy_number || '—' },
    client_phone: { label: 'Phone', render: (c) => c.client_phone || '—' },
    business_division: { label: 'Division', render: (c) => c.business_division || '—' },
    vehicle_location: { label: 'Location', render: (c) => c.vehicle_location || '—' },
    documents: { label: 'Docs', render: (c) => { const n = c.file_urls?.length || 0; return n > 0 ? `${n} file${n === 1 ? '' : 's'}` : '—'; } },
    vehicle_damage: { label: 'Damage', render: (c) => c.vehicle_damage || '—' },
    referrer_ref: { label: 'Referrer Ref', render: (c) => c.referrer_ref || '—' },
  };



  if (showForm) {
    return (
      <div className="h-full overflow-y-auto bg-background p-4">
        {createError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
            <span className="font-semibold">Error:</span> {createError}
          </div>
        )}
        <ClaimFormWrapper 
          onSubmit={(d) => { setCreateError(null); createMutation.mutate(d); }} 
          onCancel={() => { setShowForm(false); setCreateError(null); }}
          isSubmitting={createMutation.isPending}
        />
      </div>
    );
  }

  // The claims table row (desktop)
  const renderRow = (claim) => {
    const updateStatus = calculateUpdateStatus(claim);
    const isSelected = selectedClaim?.id === claim.id;
    const hasBackorder = claimIdsWithBackorders.has(claim.id);
    const closedList = ['Completed', 'Cancelled', 'Total Loss'];
    const isClosedStatus = closedList.includes(claim.job_status);
    const isDraft = claim.draft === true;

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
            className="inline-flex items-center justify-center rounded-md bg-[#1e2d4a] text-white font-semibold uppercase"
            style={{ fontSize: '13px', width: '96px', height: '28px', letterSpacing: '0.05em' }}
          >
            {claim.reg ? formatUKRegistration(claim.reg) : ''}
          </span>
        </td>
        {/* Scrollable columns — dynamic based on user's customised fields */}
        {userCardFields.map(fieldId => {
          const cfg = CARD_FIELD_CONFIG[fieldId];
          return (
            <td key={fieldId} className="px-4 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap max-w-[160px] truncate">
              {cfg ? cfg.render(claim) : '—'}
            </td>
          );
        })}
        {/* 48 Hour Update badge */}
        <td className={`px-3 py-2.5 whitespace-nowrap ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50'}`}>
          <UpdateStatusBadge status={updateStatus} small />
        </td>
        {/* Sticky right: Status + alerts */}
        <td className={`sticky right-0 z-10 px-3 py-2.5 whitespace-nowrap ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50'}`}>
          <div className="flex items-center gap-1.5 justify-end flex-wrap">
            {isDraft && (
              <span className="px-2 py-1 rounded-md bg-yellow-100 text-yellow-700 text-[10px] font-medium">
                Draft
              </span>
            )}
            <StatusBadge status={claim.job_status || 'New'} />
            {claim.secondary_status && <StatusBadge status={claim.secondary_status} variant="secondary" />}
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
            {claim.claim_type === 'Fault Claim' && claim.third_party_pursuit_status === 'Awaiting Details' && !isClosedStatus && (
              <span className="flex items-center gap-0.5 px-2 py-1 rounded-md bg-amber-500 text-white text-[10px] font-semibold shadow-sm">
                <AlertTriangle className="w-3 h-3" />
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
    const closedList = ['Completed', 'Cancelled', 'Total Loss'];
    const isClosedStatus = closedList.includes(claim.job_status);
    const isDraft = claim.draft === true;
    return (
      <div
        key={claim.id}
        onClick={() => setSelectedClaim(claim)}
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
          {claim.referrer && <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{claim.referrer}</span>}
          {claim.secondary_status && <div className="mt-1"><StatusBadge status={claim.secondary_status} variant="secondary" /></div>}
        </div>
      </div>
    );
  };

  const claimsListView = (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-gray-900 lg:rounded-[10px] lg:border lg:border-gray-100 dark:lg:border-gray-800 overflow-hidden lg:shadow-sm">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" /><span>New Claim</span>
          </button>
        </div>
      </div>

      {/* Search + filters bar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 px-5 py-2.5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex-1 w-full">
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by reg, client, job number, driver..."
            className="w-full pl-10 pr-6 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[10px] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 text-gray-900 dark:text-white placeholder-gray-400 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          {/* Sort dropdown */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="px-2 py-1.5 text-[11px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[10px] text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-400 cursor-pointer">
            <option value="priority">Sort: Priority</option>
            <option value="created_desc">Sort: Created (Newest)</option>
            <option value="created_asc">Sort: Created (Oldest)</option>
            <option value="loss_desc">Sort: Accident Date (Newest)</option>
            <option value="loss_asc">Sort: Accident Date (Oldest)</option>
            <option value="updated_desc">Sort: Last Updated</option>
          </select>

          {/* Quick filter dropdowns */}
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium border transition-all ${activeFiltersCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300'}`}>
            <Filter className="w-3.5 h-3.5" />
            Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
          </button>
          {activeFiltersCount > 0 && (
            <button onClick={clearAllFilters} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-3.5 h-3.5" /></button>
          )}
        </div>
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
              { label: 'Business Division', value: businessDivisionFilter, onChange: setBusinessDivisionFilter, options: uniqueBusinessDivisions },
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
                const claimsInGroup = filteredClaims.filter(c => (c.job_status || 'New') === statusGroup);
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
                 const st = c.job_status || 'New';
                 return !known.has(st);
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
                  {userCardFields.map(fieldId => (
                    <th key={fieldId} className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">{CARD_FIELD_CONFIG[fieldId]?.label || fieldId}</th>
                  ))}
                  <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">48 Hour Update</th>
                  <th className="sticky right-0 z-20 bg-white dark:bg-gray-900 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {availableStatuses.map(statusGroup => {
                  const claimsInGroup = filteredClaims.filter(c => (c.job_status || 'New') === statusGroup);
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
                        <td colSpan={userCardFields.length + 3} className="px-4 py-2">
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
                  const ungrouped = filteredClaims.filter(c => !known.has(c.job_status || 'New'));
                  if (ungrouped.length === 0 || statusFilter.length > 0) return null;
                  const isCollapsed = collapsedGroups['__other__'];
                  return (
                    <React.Fragment>
                      <tr className="bg-gray-50 dark:bg-gray-800/60 cursor-pointer select-none" onClick={() => toggleGroup('__other__')}>
                        <td colSpan={userCardFields.length + 3} className="px-4 py-2">
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
    <div ref={containerRef} className="h-full flex gap-0 min-h-0 overflow-hidden">
      {/* Claims list — hidden when a claim is selected */}
      {!selectedClaim && (
        <div className="flex flex-col min-h-0 w-full">
          {claimsListView}
        </div>
      )}

      {/* Detail panel — full width, replacing the list */}
      {selectedClaim && (
        <div className="flex-1 min-w-0 min-h-0 flex flex-col w-full">
          <div className="h-full lg:rounded-xl lg:border lg:border-gray-200 dark:lg:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
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