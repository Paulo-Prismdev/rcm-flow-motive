import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Archive, Filter, X, AlertTriangle, Settings2 } from 'lucide-react';
import ClaimDetail from '../components/claims/ClaimDetail';
import ClaimForm from '../components/claims/ClaimForm';
import StatusBadge from '../components/shared/StatusBadge';
import UpdateStatusBadge from '../components/shared/UpdateStatusBadge';
import { formatUKRegistration } from '../components/shared/formatRegistration';
import ClaimCardFieldsModal from '../components/claims/ClaimCardFieldsModal';
import { format } from 'date-fns';

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
        borderColor: isDark ? 'rgba(185, 28, 28, 0.5)' : 'rgba(252, 165, 165, 0.8)',
      };
    case 'Amber':
      return {
        backgroundColor: isDark ? 'rgba(120, 53, 15, 0.3)' : 'rgba(254, 243, 199, 0.8)',
        borderColor: isDark ? 'rgba(217, 119, 6, 0.5)' : 'rgba(253, 230, 138, 0.8)',
      };
    case 'Green':
      return {
        backgroundColor: isDark ? 'rgba(20, 83, 45, 0.3)' : 'rgba(220, 252, 231, 0.8)',
        borderColor: isDark ? 'rgba(22, 163, 74, 0.5)' : 'rgba(134, 239, 172, 0.8)',
      };
    case 'Blue':
      return {
        backgroundColor: isDark ? 'rgba(30, 58, 138, 0.3)' : 'rgba(219, 234, 254, 0.8)',
        borderColor: isDark ? 'rgba(37, 99, 235, 0.5)' : 'rgba(147, 197, 253, 0.8)',
      };
    case 'Gray':
      return {
        backgroundColor: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(249, 250, 251, 0.8)',
        borderColor: isDark ? 'rgba(107, 114, 128, 0.5)' : 'rgba(229, 231, 235, 0.8)',
      };
    default:
      return {};
  }
};

export default function ClaimsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [claimTypeFilter, setClaimTypeFilter] = useState('');
  const [insurerFilter, setInsurerFilter] = useState('');
  const [referrerFilter, setReferrerFilter] = useState('');
  const [updateStatusFilter, setUpdateStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showFieldsModal, setShowFieldsModal] = useState(false);
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

  // Fetch custom claim statuses
  const { data: customStatuses = [] } = useQuery({
    queryKey: ['ClaimStatusConfig'],
    queryFn: () => base44.entities.ClaimStatusConfig.list('sort_order'),
  });

  // Get active custom statuses sorted by sort_order
  const availableStatuses = React.useMemo(() => {
    const active = customStatuses
      .filter(s => s.is_active)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(s => s.status_name);
    
    if (!active.includes('New')) {
      return ['New', ...active];
    }
    return active;
  }, [customStatuses]);

  // Get unique values for filters
  const uniqueInsurers = [...new Set(claims.map(c => c.insurer).filter(Boolean))].sort();
  const uniqueReferrers = [...new Set(claims.map(c => c.referrer).filter(Boolean))].sort();

  // URL parameter handling
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const claimId = urlParams.get('id');
    if (claimId && claims.length > 0) {
      const claim = claims.find(c => c.id === claimId);
      if (claim) {
        setSelectedClaim(claim);
      }
    }
  }, [claims]);

  const createMutation = useMutation({
    mutationFn: (newClaim) => base44.entities.Claim.create(newClaim),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Claim.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
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
    setStatusFilter('');
    setClaimTypeFilter('');
    setInsurerFilter('');
    setReferrerFilter('');
    setUpdateStatusFilter('');
  };

  const activeFiltersCount = [statusFilter, claimTypeFilter, insurerFilter, referrerFilter, updateStatusFilter].filter(Boolean).length;

  const allClaims = showArchived ? claims : claims.filter(c => !c.archived);

  const filteredClaims = allClaims
    .filter(c => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        c.reg?.toLowerCase().includes(searchLower) ||
        c.client_name?.toLowerCase().includes(searchLower) ||
        c.job_number?.toLowerCase().includes(searchLower) ||
        c.insurer?.toLowerCase().includes(searchLower);

      const matchesStatus = !statusFilter || c.job_status === statusFilter;
      const matchesClaimType = !claimTypeFilter || c.claim_type === claimTypeFilter;
      const matchesInsurer = !insurerFilter || c.insurer === insurerFilter;
      const matchesReferrer = !referrerFilter || c.referrer === referrerFilter;
      
      const updateStatus = calculateUpdateStatus(c);
      const matchesUpdateStatus = !updateStatusFilter || updateStatus === updateStatusFilter;

      return matchesSearch && matchesStatus && matchesClaimType && matchesInsurer && matchesReferrer && matchesUpdateStatus;
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

  if (selectedClaim) {
    return (
      <ClaimDetail
        claim={selectedClaim}
        onClose={() => setSelectedClaim(null)}
        onUpdate={handleUpdate}
        isInternalUser={isInternalUser}
      />
    );
  }

  if (showForm) {
    return (
      <ClaimForm
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
    const isClosedStatus = ['Completed', 'Cancelled', 'Total Loss'].includes(claim.job_status);
    const statusStyle = getStatusStyle(updateStatus);
    
    return (
      <div
        key={claim.id}
        onClick={() => setSelectedClaim(claim)}
        className="p-4 hover:shadow-lg transition-all cursor-pointer border-2 rounded-xl"
        style={statusStyle}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="font-bold text-lg">{formatUKRegistration(claim.reg) || 'No Reg'}</h3>
              {claim.job_number && (
                <span className="text-xs font-mono px-2 py-1 rounded bg-accent/20 text-accent font-semibold">
                  {claim.job_number}
                </span>
              )}
              <StatusBadge status={claim.job_status || 'New'} />
              {!isClosedStatus && updateStatus && (
                <UpdateStatusBadge status={updateStatus} small />
              )}
              {claim.claim_type === 'Fault Claim' && 
               claim.third_party_pursuit_status === 'Awaiting Details' && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  3rd Party Pending
                </span>
              )}
            </div>
            
            <div className={`grid grid-cols-1 md:grid-cols-${Math.min(userCardFields.length, 4)} gap-2 text-sm`}>
              {userCardFields.map(fieldId => (
                <div key={fieldId}>
                  <span className="text-foreground-muted">{FIELD_LABELS[fieldId] || fieldId}:</span>{' '}
                  <span className="font-medium">{getFieldValue(claim, fieldId)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-4 md:gap-6">
      <ClaimCardFieldsModal
        isOpen={showFieldsModal}
        onClose={() => setShowFieldsModal(false)}
        selectedFields={userCardFields}
        onSave={(fields) => updateUserFieldsMutation.mutate(fields)}
      />

      {/* Header */}
      <div className="neomorph p-4 md:p-6 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Claims</h1>
            <p className="text-sm text-foreground-muted mt-1">
              Manage and track insurance claims • {filteredClaims.length} of {allClaims.length} shown
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowFieldsModal(true)}
              className="neomorph-flat"
              title="Customise card fields"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
            {isInternalUser && (
              <>
                <Button
                  onClick={() => setShowArchived(!showArchived)}
                  className="neomorph-flat"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  {showArchived ? 'Hide' : 'Show'} Archived
                </Button>
                <Button
                  onClick={() => setShowForm(true)}
                  className="neomorph-flat bg-accent/10 text-accent font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Claim
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="neomorph p-4 flex-shrink-0">
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by reg, client, job number, or insurer..."
                className="pl-10 neomorph-inset"
              />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              className={`neomorph-flat px-4 ${activeFiltersCount > 0 ? 'bg-accent/20' : ''}`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                onClick={clearAllFilters}
                className="neomorph-flat px-3"
                title="Clear all filters"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="neomorph-inset p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-foreground-muted mb-1">Job Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="neomorph-inset w-full px-3 py-2 rounded-lg border-0 text-sm"
                  >
                    <option value="">All Statuses</option>
                    {availableStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-foreground-muted mb-1">Claim Type</label>
                  <select
                    value={claimTypeFilter}
                    onChange={(e) => setClaimTypeFilter(e.target.value)}
                    className="neomorph-inset w-full px-3 py-2 rounded-lg border-0 text-sm"
                  >
                    <option value="">All Types</option>
                    <option value="Own Damage">Own Damage</option>
                    <option value="Third Party">Third Party</option>
                    <option value="Fault Claim">Fault Claim</option>
                    <option value="Non-Fault Claim">Non-Fault Claim</option>
                    <option value="Total Loss">Total Loss</option>
                    <option value="Glass Claim">Glass Claim</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-foreground-muted mb-1">Insurer</label>
                  <select
                    value={insurerFilter}
                    onChange={(e) => setInsurerFilter(e.target.value)}
                    className="neomorph-inset w-full px-3 py-2 rounded-lg border-0 text-sm"
                  >
                    <option value="">All Insurers</option>
                    {uniqueInsurers.map(insurer => (
                      <option key={insurer} value={insurer}>{insurer}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-foreground-muted mb-1">Referrer</label>
                  <select
                    value={referrerFilter}
                    onChange={(e) => setReferrerFilter(e.target.value)}
                    className="neomorph-inset w-full px-3 py-2 rounded-lg border-0 text-sm"
                  >
                    <option value="">All Referrers</option>
                    {uniqueReferrers.map(referrer => (
                      <option key={referrer} value={referrer}>{referrer}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-foreground-muted mb-1">Update Status</label>
                  <select
                    value={updateStatusFilter}
                    onChange={(e) => setUpdateStatusFilter(e.target.value)}
                    className="neomorph-inset w-full px-3 py-2 rounded-lg border-0 text-sm"
                  >
                    <option value="">All Updates</option>
                    <option value="Red">🔴 Overdue</option>
                    <option value="Amber">🟠 Due Soon</option>
                    <option value="Green">🟢 On Track</option>
                    <option value="Blue">🔵 Override Active</option>
                    <option value="Gray">⚫ Closed</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Claims List - Grouped by Status */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="text-center py-12">Loading claims...</div>
        ) : filteredClaims.length === 0 ? (
          <div className="neomorph p-12 text-center">
            <p className="text-foreground-muted mb-4">
              {activeFiltersCount > 0 ? 'No claims match your filters' : 'No claims found'}
            </p>
            {activeFiltersCount > 0 ? (
              <Button onClick={clearAllFilters} className="neomorph-flat">
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            ) : isInternalUser && (
              <Button onClick={() => setShowForm(true)} className="neomorph-flat">
                <Plus className="w-4 h-4 mr-2" />
                Create First Claim
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {availableStatuses.map(statusGroup => {
              const claimsInGroup = filteredClaims.filter(claim => claim.job_status === statusGroup);
              
              // Only show groups that have claims (unless a specific status is filtered)
              if (claimsInGroup.length === 0 && !statusFilter) return null;

              return (
                <div key={statusGroup} className="neomorph p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <StatusBadge status={statusGroup} />
                    <span className="text-sm text-foreground-muted">
                      {claimsInGroup.length} claim{claimsInGroup.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {claimsInGroup.length === 0 ? (
                    <div className="neomorph-inset p-4 text-center text-foreground-muted text-sm">
                      No claims in this status
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {claimsInGroup.map(renderClaimCard)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}