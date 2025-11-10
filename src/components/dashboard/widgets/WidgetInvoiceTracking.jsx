import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DollarSign, AlertCircle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function WidgetInvoiceTracking({ config, isEditMode }) {
  const { data: claims = [] } = useQuery({
    queryKey: ['claims'],
    queryFn: () => base44.entities.Claim.list('-updated_date', 1000),
    enabled: !isEditMode,
  });

  const { data: estimates = [] } = useQuery({
    queryKey: ['estimates'],
    queryFn: () => base44.entities.Estimate.list('-updated_date', 1000),
    enabled: !isEditMode,
  });

  const { data: engineering = [] } = useQuery({
    queryKey: ['engineering'],
    queryFn: () => base44.entities.Engineering.list('-updated_date', 1000),
    enabled: !isEditMode,
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts'],
    queryFn: () => base44.entities.Part.list('-updated_date', 1000),
    enabled: !isEditMode,
  });

  const allRecords = [...claims, ...estimates, ...engineering, ...parts];
  const readyToInvoice = allRecords.filter(r => r.invoice_status === 'Ready to Invoice').length;
  const overdueInvoices = allRecords.filter(r => r.invoice_status === 'Invoice Overdue').length;
  const totalInvoiceValue = allRecords
    .filter(r => r.invoice_status === 'Ready to Invoice' || r.invoice_status === 'Invoice Required - Pending')
    .reduce((sum, r) => sum + (r.invoice_amount || 0), 0);

  const content = (
    <div className="glass p-4 md:p-6 col-span-1 md:col-span-2 card-hover">
      <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-accent" />
        Invoice Tracking
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="glass-flat p-3 md:p-4">
          <p className="text-xs text-foreground-muted mb-1">Ready to Invoice</p>
          <p className="text-xl md:text-2xl font-bold text-green-600">{isEditMode ? '...' : readyToInvoice}</p>
          <p className="text-[10px] md:text-xs text-foreground-subtle mt-1">£{totalInvoiceValue.toFixed(2)}</p>
        </div>
        <div className="glass-flat p-3 md:p-4">
          <p className="text-xs text-foreground-muted mb-1">Overdue</p>
          <p className="text-xl md:text-2xl font-bold text-red-600">{isEditMode ? '...' : overdueInvoices}</p>
          <p className="text-[10px] md:text-xs text-foreground-subtle mt-1">Requires attention</p>
        </div>
        <div className="glass-flat p-3 md:p-4">
          <p className="text-xs text-foreground-muted mb-1">This Month</p>
          <p className="text-xl md:text-2xl font-bold text-blue-600">
            {isEditMode ? '...' : claims.filter(c => {
              const date = new Date(c.created_date);
              const now = new Date();
              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length}
          </p>
          <p className="text-[10px] md:text-xs text-foreground-subtle mt-1">New cases</p>
        </div>
      </div>
    </div>
  );

  if (isEditMode) {
    return content;
  }

  return (
    <Link to={createPageUrl('Invoicing')} className="block">
      {content}
    </Link>
  );
}