import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { formatUKRegistration } from '@/components/shared/formatRegistration';
import StatusBadge from '@/components/shared/StatusBadge';
import ClaimCardFieldsModal from '@/components/claims/ClaimCardFieldsModal';
import { Settings2, FileText, ChevronRight, Filter, X } from 'lucide-react';

const FILTERS = ['active', 'completed', 'all'];

export default function RepairerClaimsList({ claims }) {
  const [filter, setFilter] = useState('active');
  const [showFieldsModal, setShowFieldsModal] = useState(false);
  const [search, setSearch] = useState('');
  const [insurerFilter, setInsurerFilter] = useState('');
  const [claimTypeFilter, setClaimTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const savedFields = currentUser?.claim_card_fields || [];
  const userCardFields = [...savedFields.filter(f => f !== 'referrer' && f !== 'bodyshop')];

  const updateUserFieldsMutation = useMutation({
    mutationFn: (fields) => base44.auth.updateMe({ claim_card_fields: fields }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currentUser'] }),
  });

  const FIELD_LABELS = {
    client_name: 'Client',
    make_model: 'Vehicle',
    loss_date: 'Loss Date',
    insurer: 'Insurer',
    driver_contact_name: 'Driver',
    claim_type: 'Claim Type',
    claim_ref: 'Claim Ref',
    policy_number: 'Policy No',
    vehicle_location: 'Location',
    booking_in_date: 'Booking In',
    ecd: 'ECD',
    documents: 'Docs',
    vehicle_damage: 'Damage',
  };

  const formatDate = (val) => {
    if (!val) return '—';
    try { return format(new Date(val), 'dd/MM/yyyy'); } catch { return val; }
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
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium">
          <FileText className="w-3 h-3" />
          {docCount}
        </span>
      );
    }
    const val = claim[fieldId];
    if (fieldId === 'loss_date' || fieldId === 'booking_in_date' || fieldId === 'ecd') return formatDate(val);
    if (val === null || val === undefined || val === '') return '—';
    return String(val);
  };

  const displayFields = userCardFields;

  const filteredClaims = claims.filter(c => {
    if (filter === 'active') {
      if (['Completed', 'Cancelled', 'Total Loss'].includes(c.job_status)) return false;
    } else if (filter === 'completed') {
      if (c.job_status !== 'Completed') return false;
    }
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      c.reg?.toLowerCase().includes(q) ||
      c.client_name?.toLowerCase().includes(q) ||
      c.job_number?.toLowerCase().includes(q) ||
      c.make_model?.toLowerCase().includes(q) ||
      c.insurer?.toLowerCase().includes(q);
    const matchesInsurer = !insurerFilter || c.insurer === insurerFilter;
    const matchesClaimType = !claimTypeFilter || c.claim_type === claimTypeFilter;
    return matchesSearch && matchesInsurer && matchesClaimType;
  });

  const uniqueInsurers = [...new Set(claims.map(c => c.insurer).filter(Boolean))].sort();
  const activeFiltersCount = [search, insurerFilter, claimTypeFilter].filter(Boolean).length;

  return (
    <div className="neomorph p-4 space-y-4">
      {/* Toolbar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                filter === f ? 'bg-accent text-accent-foreground' : 'neomorph-flat hover:shadow-md'
              }`}
            >
              {f}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => setShowFieldsModal(true)}
            className="p-2 text-foreground-muted hover:text-foreground transition-colors"
            title="Customise columns"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by reg, client, job number..."
              className="w-full px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[10px] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 text-gray-900 dark:text-white placeholder-gray-400 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium border transition-all ${activeFiltersCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300'}`}>
            <Filter className="w-3.5 h-3.5" />
            Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
          </button>
          {activeFiltersCount > 0 && (
            <button onClick={() => { setSearch(''); setInsurerFilter(''); setClaimTypeFilter(''); }}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-3.5 h-3.5" /></button>
          )}
        </div>
        {/* Filter panel */}
        {showFilters && (
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-2 gap-2">
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
                <label className="block text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-0.5">Insurer</label>
                <select value={insurerFilter} onChange={e => setInsurerFilter(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 focus:outline-none">
                  <option value="">All Insurers</option>
                  {uniqueInsurers.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-muted whitespace-nowrap">REG</th>
              {displayFields.map(fieldId => (
                <th key={fieldId} className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-muted whitespace-nowrap">
                  {FIELD_LABELS[fieldId] || fieldId}
                </th>
              ))}
              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-muted whitespace-nowrap">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredClaims.map(claim => (
              <tr key={claim.id} className="border-b border-border hover:bg-surface-hover transition-colors text-sm">
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span
                    className="inline-flex items-center justify-center rounded-md bg-[#1e2d4a] text-white font-semibold uppercase"
                    style={{ fontSize: '13px', width: '96px', height: '28px', letterSpacing: '0.05em' }}
                  >
                    {claim.reg ? formatUKRegistration(claim.reg) : ''}
                  </span>
                </td>
                {displayFields.map(fieldId => (
                  <td key={fieldId} className={`px-4 py-2.5 text-foreground-muted whitespace-nowrap max-w-[160px] ${fieldId === 'vehicle_damage' ? 'overflow-visible' : 'overflow-hidden text-ellipsis'}`}>
                    {renderFieldValue(claim, fieldId)}
                  </td>
                ))}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {claim.secondary_status && <StatusBadge status={claim.secondary_status} variant="secondary" />}
                    <StatusBadge status={claim.job_status} />
                  </div>
                </td>
              </tr>
            ))}
            {filteredClaims.length === 0 && (
              <tr>
                <td colSpan={displayFields.length + 2} className="px-4 py-8 text-center text-foreground-muted text-sm">No claims found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="lg:hidden space-y-3">
        {filteredClaims.map(claim => (
          <div key={claim.id} className="neomorph-flat p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h4 className="font-bold">{formatUKRegistration(claim.reg)}</h4>
                  {claim.job_number && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent/20 text-accent">
                      {claim.job_number}
                    </span>
                  )}
                  <StatusBadge status={claim.job_status} />
                  {claim.secondary_status && <StatusBadge status={claim.secondary_status} variant="secondary" />}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {displayFields.map(fieldId => (
                    <div key={fieldId}>
                      <span className="text-foreground-muted">{FIELD_LABELS[fieldId] || fieldId}:</span>{' '}
                      <span className="font-medium">{renderFieldValue(claim, fieldId)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredClaims.length === 0 && (
          <p className="text-center text-foreground-muted py-8">No claims found</p>
        )}
      </div>

      <ClaimCardFieldsModal
        isOpen={showFieldsModal}
        onClose={() => setShowFieldsModal(false)}
        selectedFields={savedFields}
        onSave={(fields) => updateUserFieldsMutation.mutate(fields)}
        mandatoryFields={[]}
      />
    </div>
  );
}