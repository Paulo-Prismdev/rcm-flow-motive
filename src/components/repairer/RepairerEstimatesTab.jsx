import React, { useState } from 'react';
import { format } from 'date-fns';
import StatusBadge from '@/components/shared/StatusBadge';
import RepairerEstimateForm from './RepairerEstimateForm';

export default function RepairerEstimatesTab({ estimates, bodyshopId, bodyshopName }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="neomorph p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Estimate Requests</h3>
        <button
          onClick={() => setShowForm(true)}
          className="neomorph-flat px-4 py-2 text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 rounded-xl"
        >
          + Request New Estimate
        </button>
      </div>

      {showForm ? (
        <RepairerEstimateForm
          bodyshopId={bodyshopId}
          bodyshopName={bodyshopName}
          onClose={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
        />
      ) : (
        <div className="space-y-3">
          {estimates.map(est => (
            <div key={est.id} className="neomorph-flat p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-bold">{est.name || est.job_number}</h4>
                    <StatusBadge status={est.status} />
                  </div>
                  <p className="text-sm text-foreground-muted">{est.make_model}</p>
                  <p className="text-xs text-foreground-muted mt-1">
                    Requested: {est.date_received ? format(new Date(est.date_received), 'dd/MM/yyyy') : 'N/A'}
                  </p>
                </div>
                {est.estimate_value && (
                  <p className="font-bold text-lg">£{est.estimate_value.toFixed(2)}</p>
                )}
              </div>
            </div>
          ))}
          {estimates.length === 0 && (
            <p className="text-center text-foreground-muted py-8">No estimate requests yet</p>
          )}
        </div>
      )}
    </div>
  );
}