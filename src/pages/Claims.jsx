import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Archive, Filter, X, AlertTriangle, Settings2, Clock, Upload, Package } from 'lucide-react';
import ClaimDetail from '../components/claims/ClaimDetail';
import ClaimFormWrapper from '../components/claims/ClaimFormWrapper';
import ImportClaimsModal from '../components/claims/ImportClaimsModal';
import StatusBadge from '../components/shared/StatusBadge';
import UpdateStatusBadge from '../components/shared/UpdateStatusBadge';
import { formatUKRegistration } from '../components/shared/formatRegistration';
import ClaimCardFieldsModal from '../components/claims/ClaimCardFieldsModal';
import { format } from 'date-fns';
import StatusMultiSelect from '../components/shared/StatusMultiSelect';

// Helper function to calculate update status
const calculateUpdateStatus = (claim) => {
  const now = new Date();
  const closedStatuses = ['Completed', 'Cancelled', 'Total Loss'];
  
  if (closedStatuses.includes(claim.job_status)) {
    return 'Gray';
  }
  
  if (claim.override_active && claim.override_expiry_at) {
    const overrideExpiry = new Date(claim.override_expiry_at);
    if (now < overrideExpiry) {
      return 'Blue';
    }
  }
  
  if (claim.next_update_due_at) {
    const dueDate = new Date(claim.next_update_due_at);
    const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);
    
    if (hoursUntilDue < 0) {
      return 'Red';
    } else if (hoursUntilDue < 24) {
      return 'Amber';
    } else {
      return 'Green';
    }
  }
  
  return 'Green';
};

// Helper function to get background style based on update status
const getStatusStyle = (status) => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  
  switch (status) {
    case 'Red':
      return {
        backgroundColor: isDark ? 'rgba(127, 29, 29, 0.3)' : 'rgba(254, 226, 226, 0.8)',
        borderTopColor: isDark ? 'rgba(185, 28, 28, 0.5)' : 'rgba(252, 165, 165, 0.8)',
        borderRightColor: isDark ? 'rgba(185, 28, 28, 0.5)' : 'rgba(252, 165, 165, 0.8)',
        borderBottomColor: isDark ? 'rgba(185, 28, 28, 0.5)' : 'rgba(252, 165, 165, 0.8)',
      };
    case 'Amber':
      return {
        backgroundColor: isDark ? 'rgba(120, 53, 15, 0.3)' : 'rgba(254, 243, 199, 0.8)',
        borderTopColor: isDark ? 'rgba(217, 119, 6, 0.5)' : 'rgba(253, 230, 138, 0.8)',
        borderRightColor: isDark ? 'rgba(217, 119, 6, 0.5)' : 'rgba(253, 230, 138, 0.8)',
        borderBottomColor: isDark ? 'rgba(217, 119, 6, 0.5)' : 'rgba(253, 230, 138, 0.8)',
      };
    case 'Green':
      return {
        backgroundColor: isDark ? 'rgba(20, 83, 45, 0.3)' : 'rgba(220, 252, 231, 0.8)',
        borderTopColor: isDark ? 'rgba(22, 163, 74, 0.5)' : 'rgba(134, 239, 172, 0.8)',
        borderRightColor: isDark ? 'rgba(22, 163, 74, 0.5)' : 'rgba(134, 239, 172, 0.8)',
        borderBottomColor: isDark ? 'rgba(22, 163, 74, 0.5)' : 'rgba(134, 239, 172, 0.8)',
      };
    case 'Blue':
      return {
        backgroundColor: isDark ? 'rgba(30, 58, 138, 0.3)' : 'rgba(219, 234, 254, 0.8)',
        borderTopColor: isDark ? 'rgba(37, 99, 235, 0.5)' : 'rgba(147, 197, 253, 0.8)',
        borderRightColor: isDark ? 'rgba(37, 99, 235, 0.5)' : 'rgba(147, 197, 253, 0.8)',
        borderBottomColor: isDark ? 'rgba(37, 99, 235, 0.5)' : 'rgba(147, 197, 253, 0.8)',
      };
    case 'Gray':
      return {
        backgroundColor: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(249, 250, 251, 0.8)',
        borderTopColor: isDark ? 'rgba(107, 114, 128, 0.5)' : 'rgba(229, 231, 235, 0.8)',
        borderRightColor: isDark ? 'rgba(107, 114, 128, 0.5)' : 'rgba(229, 231, 235, 0.8)',
        borderBottomColor: isDark ? 'rgba(107, 114, 128, 0.5)' : 'rgba(229, 231, 235, 0.8)',
      };
    default:
      return {};
  }
};

export default function ClaimsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState([]); // Now array for multi-select
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
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isInternalUser = currentUser?.user_type === 'internal' || currentUser?.role === 'admin';
  const MANDATORY_FIELDS = ['client_name', 'make_model', 'loss_date', 'referrer'];
  const savedFields = currentUser?.claim_card_fields || [];
  const userCardFields = [...MANDATORY_FIELDS, ...savedFields.filter(f => !MANDATORY_FIELDS.includes(f))];

  const updateUserFieldsMutation = useMutation({
    mutationFn: (fields) => base44.auth.updateMe({ claim_card_fields: fields }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['claims'],
    queryFn: () => base44.entities.Claim.list('-created_date', 5000),
  });

  // Fetch backordered parts to identify claims with outstanding backorders
  const { data: backorderedParts = [] } = useQuery({
    queryKey: ['backorderedParts'],
    queryFn: () => base44.entities.BackorderedPart.list(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Calculate which claims have outstanding backordered parts
  React.useEffect(() => {
    if (backorderedParts.length > 0) {
      const claimIdsWithOutstandingBackorders = new Set(
        backorderedParts
          .filter(part => !part.received_by_repairer)
          .map(part => part.claim_id)
      );
      setClaimIdsWithBackorders(claimIdsWithOutstandingBackorders);
    }
  }, [backorderedParts]);

  // Fetch custom claim statuses
  const { data: customStatuses = [], refetch: refetchStatuses } = useQuery({
    queryKey: ['ClaimStatusConfig'],
    queryFn: () => base44.entities.ClaimStatusConfig.list('sort_order'),
    staleTime: 0, // Always refetch to get latest
  });

  // Get active custom statuses sorted by sort_order
  const availableStatuses = React.useMemo(() => {
    const active = customStatuses
      .filter(s => s.is_active !== false) // Include statuses where is_active is not explicitly false
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(s => s.status_name);
    
    // Always ensure 'New' is first if not in list
    const withNew = active.includes('New') ? active : ['New', ...active];
    return withNew;
  }, [customStatuses]);

  // Get unique values for filters
  const uniqueInsurers = [...new Set(claims.map(c => c.insurer).filter(Boolean))].sort();
  const uniqueReferrers = [...new Set(claims.map(c => c.referrer).filter(Boolean))].sort();
  const uniqueRepairers = [...new Set(claims.map(c => c.bodyshop).filter(Boolean))].sort();

  // URL parameter handling - watch for changes
  const location = useLocation();
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const claimId = urlParams.get('id');
    
    if (claimId && claims.length > 0) {
      const claim = claims.find(c => c.id === claimId);
      if (claim) {
        setSelectedClaim(claim);
        // Clear the URL parameter after processing
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [claims, location.search]);

  const createMutation = useMutation({
    mutationFn: (newClaim) => base44.entities.Claim.create(newClaim),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Claim.update(id, data),
    onSuccess: (savedClaim, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      // Sync selectedClaim with the latest saved data
      if (savedClaim) {
        setSelectedClaim(savedClaim);
      }
    },
  });

  const handleSubmit = (claimData) => {
    createMutation.mutate(claimData);
  };

  const handleUpdate = (updatedClaim) => {
    updateMutation.mutate({ id: updatedClaim.id, data: updatedClaim });
    setSelectedClaim(updatedClaim);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter([]);
    setClaimTypeFilter('');
    setInsurerFilter('');
    setReferrerFilter('');
    setRepairerFilter('');
    setUpdateStatusFilter('');
    setRepairerAcceptanceFilter('');
    setHasBackorderedPartsFilter(false);
  };

  const activeFiltersCount = [(statusFilter?.length || 0) > 0, claimTypeFilter, insurerFilter, referrerFilter, repairerFilter, updateStatusFilter, repairerAcceptanceFilter, hasBackorderedPartsFilter].filter(Boolean).length;

  const allClaims = showArchived ? claims : claims.filter(c => !c.archived);

  const filteredClaims = allClaims
    .filter(c => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        c.reg?.toLowerCase().includes(searchLower) ||
        c.client_name?.toLowerCase().includes(searchLower) ||
        c.job_number?.toLowerCase().includes(searchLower) ||
        c.insurer?.toLowerCase().includes(searchLower);

      // Multi-status: match if ANY of the claim's statuses is in the filter array
      const matchesStatus = !statusFilter || statusFilter.length === 0 || (c.job_statuses || []).some(s => statusFilter.includes(s));
      const matchesClaimType = !claimTypeFilter || c.claim_type === claimTypeFilter;
      const matchesInsurer = !insurerFilter || c.insurer === insurerFilter;
      const matchesReferrer = !referrerFilter || c.referrer === referrerFilter;
      const matchesRepairer = !repairerFilter || c.bodyshop === repairerFilter;
      
      const updateStatus = calculateUpdateStatus(c);
      const matchesUpdateStatus = !updateStatusFilter || updateStatus === updateStatusFilter;
      
      // Repairer acceptance filter
      let matchesRepairerAcceptance = true;
      if (repairerAcceptanceFilter === 'awaiting') {
        matchesRepairerAcceptance = c.bodyshop_id && !c.repairer_accepted && !['Completed', 'Cancelled', 'Total Loss'].includes(c.job_status);
      } else if (repairerAcceptanceFilter === 'accepted') {
        matchesRepairerAcceptance = c.repairer_accepted === true;
      }
      
      // Backordered parts filter
      let matchesBackorderedParts = true;
      if (hasBackorderedPartsFilter) {
        matchesBackorderedParts = claimIdsWithBackorders.has(c.id);
      }

      return matchesSearch && matchesStatus && matchesClaimType && matchesInsurer && matchesReferrer && matchesRepairer && matchesUpdateStatus && matchesRepairerAcceptance && matchesBackorderedParts;
    })
    .sort((a, b) => {
      const statusA = calculateUpdateStatus(a);
      const statusB = calculateUpdateStatus(b);
      
      const priorityOrder = { 'Red': 1, 'Amber': 2, 'Green': 3, 'Blue': 3, 'Gray': 4 };
      const priorityA = priorityOrder[statusA] || 3;
      const priorityB = priorityOrder[statusB] || 3;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      if (statusA === 'Red' && statusB === 'Red') {
        const dueDateA = a.next_update_due_at ? new Date(a.next_update_due_at) : new Date();
        const dueDateB = b.next_update_due_at ? new Date(b.next_update_due_at) : new Date();
        return dueDateA - dueDateB;
      }
      
      return new Date(b.created_date) - new Date(a.created_date);
    });

  if (showForm) {
    return (
      <ClaimFormWrapper
        onSubmit={handleSubmit}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  // Field label mapping
  const FIELD_LABELS = {
    client_name: 'Client',
    make_model: 'Vehicle',
    insurer: 'Insurer',
    referrer: 'Referrer',
    bodyshop: 'Bodyshop',
    claim_type: 'Type',
    booking_in_date: 'Booking In',
    ecd: 'ECD',
    loss_date: 'Loss Date',
    authority_cost_gross: 'Authority',
    final_repair_cost: 'Final Cost',
    claim_ref: 'Claim Ref',
    policy_number: 'Policy No',
    client_phone: 'Phone',
    vehicle_location: 'Location',
  };

  const getFieldValue = (claim, fieldId) => {
    const value = claim[fieldId];
    if (!value) return 'N/A';
    
    // Format dates
    if (['booking_in_date', 'ecd', 'loss_date'].includes(fieldId)) {
      try {
        return format(new Date(value), 'dd/MM/yyyy');
      } catch {
        return value;
      }
    }
    
    // Format currency
    if (['authority_cost_gross', 'final_repair_cost'].includes(fieldId)) {
      return `£${Number(value).toLocaleString()}`;
    }
    
    return value;
  };

  // Render claim card
  const renderClaimCard = (claim) => {
    const updateStatus = calculateUpdateStatus(claim);
    const statuses = claim.job_statuses || [];
    const isClosedStatus = statuses.some(s => ['Completed', 'Cancelled', 'Total Loss'].includes(s));
    const statusStyle = getStatusStyle(updateStatus);
    const hasBackorder = claimIdsWithBackorders.has(claim.id);

    // Left border accent for alert flags
    const leftBorderStyle = hasBackorder
      ? { borderLeft: '4px solid #ef4444', ...statusStyle }
      : claim.bodyshop_id && !claim.repairer_accepted && !isClosedStatus
      ? { borderLeft: '4px solid #f59e0b', ...statusStyle }
      : claim.claim_type === 'Fault Claim' && claim.third_party_pursuit_status === 'Awaiting Details'
      ? { borderLeft: '4px solid #f59e0b', ...statusStyle }
      : statusStyle;

    const isSelected = selectedClaim?.id === claim.id;

    return (
      <div
        key={claim.id}
        onClick={() => setSelectedClaim(claim)}
        className={`px-3 py-2.5 hover:shadow-md transition-all cursor-pointer border rounded-xl ${
          isSelected
            ? 'bg-accent/10 border-accent/40 dark:border-accent/30'
            : updateStatus === 'Red'
            ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
            : 'bg-white dark:bg-surface border-black dark:border-gray-600'
        }`}
      >
        {/* Row 1: reg + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-base font-extrabold tracking-tight flex-shrink-0">
            {formatUKRegistration(claim.reg) || 'No Reg'}
          </h3>
          {claim.job_number && (
            <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-accent/20 text-accent font-semibold flex-shrink-0">
              {claim.job_number}
            </span>
          )}
          <div className="flex-shrink-0"><StatusBadge status={claim.job_statuses || []} /></div>
          {!isClosedStatus && updateStatus && (
            <div className="flex-shrink-0"><UpdateStatusBadge status={updateStatus} small /></div>
          )}
        </div>

        {/* Row 2: alert tags */}
        {(hasBackorder || (claim.bodyshop_id && !claim.repairer_accepted && !isClosedStatus) || (claim.claim_type === 'Fault Claim' && claim.third_party_pursuit_status === 'Awaiting Details')) && (
          <div className="flex flex-wrap gap-1 mt-1">
            {claim.claim_type === 'Fault Claim' && claim.third_party_pursuit_status === 'Awaiting Details' && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium animate-pulse">
                <AlertTriangle className="w-2.5 h-2.5" />3rd Party
              </span>
            )}
            {claim.bodyshop_id && !claim.repairer_accepted && !isClosedStatus && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-[10px] font-medium">
                <Clock className="w-2.5 h-2.5" />Awaiting
              </span>
            )}
            {hasBackorder && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[10px] font-medium animate-pulse">
                <Package className="w-2.5 h-2.5" />Backorder
              </span>
            )}
          </div>
        )}

        {/* Row 3: data fields */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px]">
          {userCardFields.map((fieldId, index) => {
            const val = getFieldValue(claim, fieldId);
            if (!val || val === 'N/A') return null;
            return (
              <span key={fieldId} className="whitespace-nowrap flex items-center gap-1">
                {index > 0 && <span className="text-foreground-muted opacity-40">·</span>}
                <span className="text-foreground-muted">{FIELD_LABELS[fieldId] || fieldId}:</span>
                <span className="font-medium">{val}</span>
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Claim list panel (always visible) ──────────────────────────────
  const claimListPanel = (
    <div className="flex flex-col h-full min-h-0">
      <ImportClaimsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['claims'] });
          setShowImportModal(false);
        }}
      />
      <ClaimCardFieldsModal
        isOpen={showFieldsModal}
        onClose={() => setShowFieldsModal(false)}
        selectedFields={userCardFields}
        onSave={(fields) => updateUserFieldsMutation.mutate(fields)}
      />

      {/* Header */}
      <div className="neomorph px-3 py-2 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-lg font-bold">Claims</h1>
            <p className="text-xs text-foreground-muted">
              {filteredClaims.length} of {allClaims.length} shown
            </p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Button onClick={() => setShowFieldsModal(true)} className="neomorph-flat h-8 w-8 p-0" title="Customise card fields">
              <Settings2 className="w-3.5 h-3.5" />
            </Button>
            {isInternalUser && (
              <>
                <Button onClick={() => setShowArchived(!showArchived)} className="neomorph-flat h-8 px-2 text-xs">
                  <Archive className="w-3.5 h-3.5 mr-1" />
                  {showArchived ? 'Hide' : 'Archived'}
                </Button>
                <Button onClick={() => setShowImportModal(true)} className="neomorph-flat h-8 px-2 text-xs" title="Import">
                  <Upload className="w-3.5 h-3.5 mr-1" />
                  Import
                </Button>
              </>
            )}
            <Button onClick={() => setShowForm(true)} className="neomorph-flat bg-accent/10 text-accent font-medium h-8 px-2 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" />
              New
            </Button>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="neomorph px-3 py-2 flex-shrink-0">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Reg, client, job no..."
                className="pl-9 neomorph-inset h-8 text-sm"
              />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              className={`neomorph-flat h-8 px-3 text-xs ${activeFiltersCount > 0 ? 'bg-accent/20' : ''}`}
            >
              <Filter className="w-3.5 h-3.5 mr-1" />
              {activeFiltersCount > 0 ? `(${activeFiltersCount})` : 'Filter'}
            </Button>
            {activeFiltersCount > 0 && (
              <Button onClick={clearAllFilters} className="neomorph-flat h-8 w-8 p-0">
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="neomorph-inset p-3 space-y-2">
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-xs text-foreground-muted mb-1">Job Status</label>
                  <StatusMultiSelect
                    selectedStatuses={statusFilter}
                    onStatusesChange={setStatusFilter}
                    availableStatuses={availableStatuses}
                    placeholder="All Statuses"
                  />
                </div>
                <div>
                  <label className="block text-xs text-foreground-muted mb-1">Claim Type</label>
                  <select value={claimTypeFilter} onChange={(e) => setClaimTypeFilter(e.target.value)} className="neomorph-inset w-full px-2 py-1.5 rounded-lg border-0 text-xs">
                    <option value="">All Types</option>
                    <option value="Credit Repair">Credit Repair</option>
                    <option value="Fault Claim">Fault Claim</option>
                    <option value="Non-Fault Claim">Non-Fault Claim</option>
                    <option value="Total Loss">Total Loss</option>
                    <option value="Glass Claim">Glass Claim</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-foreground-muted mb-1">Insurer</label>
                  <select value={insurerFilter} onChange={(e) => setInsurerFilter(e.target.value)} className="neomorph-inset w-full px-2 py-1.5 rounded-lg border-0 text-xs">
                    <option value="">All Insurers</option>
                    {uniqueInsurers.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-foreground-muted mb-1">Referrer</label>
                  <select value={referrerFilter} onChange={(e) => setReferrerFilter(e.target.value)} className="neomorph-inset w-full px-2 py-1.5 rounded-lg border-0 text-xs">
                    <option value="">All Referrers</option>
                    {uniqueReferrers.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-foreground-muted mb-1">Repairer</label>
                  <select value={repairerFilter} onChange={(e) => setRepairerFilter(e.target.value)} className="neomorph-inset w-full px-2 py-1.5 rounded-lg border-0 text-xs">
                    <option value="">All Repairers</option>
                    {uniqueRepairers.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-foreground-muted mb-1">Update Status</label>
                  <select value={updateStatusFilter} onChange={(e) => setUpdateStatusFilter(e.target.value)} className="neomorph-inset w-full px-2 py-1.5 rounded-lg border-0 text-xs">
                    <option value="">All Updates</option>
                    <option value="Red">🔴 Overdue</option>
                    <option value="Amber">🟠 Due Soon</option>
                    <option value="Green">🟢 On Track</option>
                    <option value="Blue">🔵 Override Active</option>
                    <option value="Gray">⚫ Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-foreground-muted mb-1">Repairer Acceptance</label>
                  <select value={repairerAcceptanceFilter} onChange={(e) => setRepairerAcceptanceFilter(e.target.value)} className="neomorph-inset w-full px-2 py-1.5 rounded-lg border-0 text-xs">
                    <option value="">All Claims</option>
                    <option value="awaiting">⏳ Awaiting Acceptance</option>
                    <option value="accepted">✓ Accepted</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-foreground-muted mb-1">Backordered Parts</label>
                  <select value={hasBackorderedPartsFilter ? 'true' : ''} onChange={(e) => setHasBackorderedPartsFilter(e.target.value === 'true')} className="neomorph-inset w-full px-2 py-1.5 rounded-lg border-0 text-xs">
                    <option value="">All Claims</option>
                    <option value="true">📦 Has Backorders</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Claims List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="text-center py-12 text-sm text-foreground-muted">Loading claims...</div>
        ) : filteredClaims.length === 0 ? (
          <div className="neomorph p-8 text-center m-2">
            <p className="text-foreground-muted text-sm mb-3">
              {activeFiltersCount > 0 ? 'No claims match your filters' : 'No claims found'}
            </p>
            {activeFiltersCount > 0 ? (
              <Button onClick={clearAllFilters} className="neomorph-flat text-xs h-8"><X className="w-3.5 h-3.5 mr-1" />Clear</Button>
            ) : (
              <Button onClick={() => setShowForm(true)} className="neomorph-flat text-xs h-8"><Plus className="w-3.5 h-3.5 mr-1" />New Claim</Button>
            )}
          </div>
        ) : (
          <div className="space-y-2 p-1">
            {availableStatuses.map(statusGroup => {
              const claimsInGroup = filteredClaims.filter(claim => (claim.job_statuses || []).includes(statusGroup));
              if (claimsInGroup.length === 0) return null;
              if (statusFilter.length > 0 && !statusFilter.includes(statusGroup)) return null;
              return (
                <div key={statusGroup} className="neomorph px-2 py-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <StatusBadge status={statusGroup} />
                    <span className="text-xs text-foreground-muted">{claimsInGroup.length}</span>
                  </div>
                  <div className="space-y-1">
                    {claimsInGroup.map(renderClaimCard)}
                  </div>
                </div>
              );
            })}
            {(() => {
              const knownStatuses = new Set(availableStatuses);
              const ungrouped = filteredClaims.filter(c => {
                const statuses = c.job_statuses || [];
                return statuses.length === 0 || !statuses.some(s => knownStatuses.has(s));
              });
              if (ungrouped.length === 0 || statusFilter.length > 0) return null;
              return (
                <div className="neomorph px-2 py-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-foreground-muted">Other</span>
                    <span className="text-xs text-foreground-muted">{ungrouped.length}</span>
                  </div>
                  <div className="space-y-1">{ungrouped.map(renderClaimCard)}</div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );

  // ── Split-panel layout ───────────────────────────────────────────────
  return (
    <div className="h-full flex gap-2 min-h-0">
      {/* Left panel: fixed-width list, hidden on mobile when detail open */}
      <div className={`flex-shrink-0 flex flex-col min-h-0 w-full lg:w-[360px] xl:w-[400px] ${selectedClaim ? 'hidden lg:flex' : 'flex'}`}>
        {claimListPanel}
      </div>

      {/* Right panel: detail or placeholder — always visible on desktop */}
      <div className={`flex-1 min-w-0 min-h-0 ${selectedClaim ? 'flex' : 'hidden lg:flex'} flex-col`}>
        {selectedClaim ? (
          <div className="h-full overflow-hidden">
            <ClaimDetail
              claim={selectedClaim}
              onClose={() => setSelectedClaim(null)}
              onUpdate={handleUpdate}
              isInternalUser={isInternalUser}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center neomorph text-center h-full">
            <div>
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <Search className="w-8 h-8 text-accent/60" />
              </div>
              <p className="text-foreground-muted text-sm font-medium">Select a claim to view details</p>
              <p className="text-foreground-subtle text-xs mt-1">Click any claim from the list</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}