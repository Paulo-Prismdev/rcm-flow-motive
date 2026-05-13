import React from 'react';
import { FileText, Calculator, Package, Gift, ChevronRight } from 'lucide-react';
import { formatUKRegistration } from '@/components/shared/formatRegistration';
import StatusBadge from '@/components/shared/StatusBadge';
import NewJobsBanner from './NewJobsBanner';
import AdvertBanner from './AdvertBanner';

export default function RepairerDashboard({ claims, estimates, parts, activeClaims, pendingEstimates, activeParts, onNavigate, bodyshopName, bodyshopId }) {
  const stats = [
    { label: 'Active Claims', count: activeClaims.length, icon: FileText, color: 'bg-blue-100 text-blue-600', tab: 'claims' },
    { label: 'Pending Estimates', count: pendingEstimates.length, icon: Calculator, color: 'bg-green-100 text-green-600', tab: 'estimates' },
    { label: 'Parts Requests', count: activeParts.length, icon: Package, color: 'bg-orange-100 text-orange-600', tab: 'parts' },
    { label: 'ARTURA Products', count: 'New', icon: Gift, color: 'bg-purple-100 text-purple-600', tab: 'products' },
  ];

  const quickActions = [
    { label: 'Request an Estimate', icon: Calculator, tab: 'estimates' },
    { label: 'Request Parts Support', icon: Package, tab: 'parts' },
    { label: 'Explore ARTURA Products', icon: Gift, tab: 'products' },
  ];

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      <div className="flex-shrink-0">
        <NewJobsBanner bodyshopId={bodyshopId} />
      </div>

      <div className="neomorph p-4 flex-shrink-0">
        <h2 className="text-xl font-bold">Welcome back, {bodyshopName || 'Repairer'}!</h2>
        <p className="text-sm text-foreground-muted">Here's an overview of your current activity</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-shrink-0">
        {stats.map(({ label, count, icon: Icon, color, tab }) => (
          <div key={tab} className="neomorph p-4 cursor-pointer hover:shadow-lg transition-all" onClick={() => onNavigate(tab)}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-foreground-muted">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 flex-1 min-h-0">
        <div className="neomorph p-4 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="font-bold">Recent Claims</h3>
            <button onClick={() => onNavigate('claims')} className="text-sm text-accent hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
            {claims.slice(0, 10).map(claim => (
              <div key={claim.id} className="neomorph-flat p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{formatUKRegistration(claim.reg)}</p>
                  <p className="text-xs text-foreground-muted">{claim.client_name}</p>
                </div>
                <StatusBadge status={claim.job_status} />
              </div>
            ))}
            {claims.length === 0 && (
              <p className="text-center text-foreground-muted py-4">No claims yet</p>
            )}
          </div>
        </div>

        <div className="neomorph p-4 flex flex-col min-h-0 overflow-hidden">
          <h3 className="font-bold mb-4 flex-shrink-0">Quick Actions</h3>
          <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
            {quickActions.map(({ label, icon: Icon, tab }) => (
              <button
                key={tab}
                onClick={() => onNavigate(tab)}
                className="w-full neomorph-flat p-4 flex items-center justify-between hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-accent" />
                  <span className="font-medium">{label}</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0">
        <AdvertBanner />
      </div>
    </div>
  );
}