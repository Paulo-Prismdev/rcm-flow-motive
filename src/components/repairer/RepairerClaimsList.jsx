import React, { useState } from 'react';
import { format } from 'date-fns';
import { formatUKRegistration } from '@/components/shared/formatRegistration';
import StatusBadge from '@/components/shared/StatusBadge';

const FILTERS = ['active', 'completed', 'all'];

export default function RepairerClaimsList({ claims }) {
  const [filter, setFilter] = useState('active');

  const filteredClaims = claims.filter(c => {
    if (filter === 'active') return !['Completed', 'Cancelled', 'Total Loss'].includes(c.job_status);
    if (filter === 'completed') return c.job_status === 'Completed';
    return true;
  });

  return (
    <div className="neomorph p-4 space-y-4">
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

      <div className="space-y-3">
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
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-foreground-muted">Client:</span>{' '}
                    <span className="font-medium">{claim.client_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-foreground-muted">Vehicle:</span>{' '}
                    <span className="font-medium">{claim.make_model || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-foreground-muted">Booking In:</span>{' '}
                    <span className="font-medium">
                      {claim.booking_in_date ? format(new Date(claim.booking_in_date), 'dd/MM/yyyy') : 'TBC'}
                    </span>
                  </div>
                  <div>
                    <span className="text-foreground-muted">ECD:</span>{' '}
                    <span className="font-medium">
                      {claim.ecd ? format(new Date(claim.ecd), 'dd/MM/yyyy') : 'TBC'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredClaims.length === 0 && (
          <p className="text-center text-foreground-muted py-8">No claims found</p>
        )}
      </div>
    </div>
  );
}