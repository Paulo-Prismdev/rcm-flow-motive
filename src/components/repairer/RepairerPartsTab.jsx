import React, { useState } from 'react';
import { format } from 'date-fns';
import StatusBadge from '@/components/shared/StatusBadge';
import RepairerPartsForm from './RepairerPartsForm';

export default function RepairerPartsTab({ parts, bodyshopId, bodyshopName }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="neomorph p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Parts Support Requests</h3>
        <button
          onClick={() => setShowForm(true)}
          className="neomorph-flat px-4 py-2 text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 rounded-xl"
        >
          + Request Parts Support
        </button>
      </div>

      {showForm ? (
        <RepairerPartsForm
          bodyshopId={bodyshopId}
          bodyshopName={bodyshopName}
          onClose={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
        />
      ) : (
        <div className="space-y-3">
          {parts.map(part => (
            <div key={part.id} className="neomorph-flat p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-bold">{part.part_description || part.job_number}</h4>
                    <StatusBadge status={part.sourcing_status} />
                  </div>
                  <p className="text-sm text-foreground-muted">
                    {part.manufacturer} - {part.vehicle_ref}
                  </p>
                  <p className="text-xs text-foreground-muted mt-1">
                    Requested: {part.date_requested ? format(new Date(part.date_requested), 'dd/MM/yyyy') : 'N/A'}
                  </p>
                </div>
                {part.net_price && (
                  <p className="font-bold text-lg">£{part.net_price.toFixed(2)}</p>
                )}
              </div>
            </div>
          ))}
          {parts.length === 0 && (
            <p className="text-center text-foreground-muted py-8">No parts requests yet</p>
          )}
        </div>
      )}
    </div>
  );
}