import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { formatUKRegistration } from '@/components/shared/formatRegistration';
import StatusBadge from '@/components/shared/StatusBadge';
import ClaimCardFieldsModal from '@/components/claims/ClaimCardFieldsModal';
import { Settings2, FileText, ChevronRight } from 'lucide-react';

const FILTERS = ['active', 'completed', 'all'];

export default function RepairerClaimsList({ claims }) {
  const [filter, setFilter] = useState('active');
  const [showFieldsModal, setShowFieldsModal] = useState(false);
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
  };

  const formatDate = (val) => {
    if (!val) return '—';
    try { return format(new Date(val), 'dd/MM/yyyy'); } catch { return val; }
  };

  const renderFieldValue = (claim, fieldId) => {
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

  const displayFields = userCardFields.length > 0 ? userCardFields : ['client_name', 'make_model', 'loss_date', 'insurer'];

  const filteredClaims = claims.filter(c => {
    if (filter === 'active') return !['Completed', 'Cancelled', 'Total Loss'].includes(c.job_status);
    if (filter === 'completed') return c.job_status === 'Completed';
    return true;
  });

  return (
    <div className="neomorph p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
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
        </div>
        <button
          onClick={() => setShowFieldsModal(true)}
          className="p-2 text-foreground-muted hover:text-foreground transition-colors"
          title="Customise columns"
        >
          <Settings2 className="w-4 h-4" />
        </button>
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
                  <td key={fieldId} className="px-4 py-2.5 text-foreground-muted whitespace-nowrap max-w-[160px] truncate">
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
      />
    </div>
  );
}