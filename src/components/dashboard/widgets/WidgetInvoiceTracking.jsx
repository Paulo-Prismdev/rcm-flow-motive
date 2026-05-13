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

  const thisMonth = claims.filter(c => {
    const date = new Date(c.created_date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const metrics = [
    { label: 'Ready to Invoice', value: isEditMode ? '–' : readyToInvoice, sub: `£${totalInvoiceValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, accent: 'text-emerald-600', bar: 'bg-emerald-500', barPct: Math.min(100, readyToInvoice * 5) },
    { label: 'Overdue', value: isEditMode ? '–' : overdueInvoices, sub: 'Requires attention', accent: 'text-rose-600', bar: 'bg-rose-500', barPct: Math.min(100, overdueInvoices * 10) },
    { label: 'New This Month', value: isEditMode ? '–' : thisMonth, sub: 'Cases opened', accent: 'text-blue-600', bar: 'bg-blue-500', barPct: Math.min(100, thisMonth * 4) },
  ];

  const content = (
    <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-200 p-5 col-span-1 md:col-span-2">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <h2 className="text-sm font-bold">Invoice Tracking</h2>
        </div>
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="bg-muted rounded-xl p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{m.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${m.accent} mb-1`}>{m.value}</p>
            <p className="text-[11px] text-muted-foreground mb-3">{m.sub}</p>
            <div className="w-full h-1 bg-border rounded-full overflow-hidden">
              <div className={`h-full ${m.bar} rounded-full transition-all duration-700`} style={{ width: `${m.barPct}%` }} />
            </div>
          </div>
        ))}
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