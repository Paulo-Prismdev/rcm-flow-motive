import React, { useState, useEffect, useMemo } from 'react';
import { FileText, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePortalClaims } from '@/components/shared/usePortalClaims';
import ClaimStatusBadges from '@/components/shared/ClaimStatusBadges';
import { isCancelledClaim, isClaimClosed, isClaimClosedForLists } from '@/components/shared/claimOutcome';
import { activateOnKey } from '@/lib/a11y';

export default function ClientDashboard() {
  const [activeTab, setActiveTab] = React.useState('dashboard');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  React.useEffect(() => {
    const handleNav = (e) => {
      if (e.detail === 'claims') setActiveTab('claims');
      if (e.detail === 'dashboard') setActiveTab('dashboard');
    };
    window.addEventListener('client-nav', handleNav);
    return () => window.removeEventListener('client-nav', handleNav);
  }, []);

  const { data: claims = [] } = usePortalClaims({ enabled: !!currentUser?.company_id });

  const stats = React.useMemo(() => {
    const total = claims.length;
    const active = claims.filter(c => !isClaimClosedForLists(c)).length;
    const completed = claims.filter(c => !isCancelledClaim(c) && isClaimClosed(c)).length;
    const thisMonth = claims.filter(c => {
      const d = new Date(c.created_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { total, active, completed, thisMonth };
  }, [claims]);

  const statCards = [
    { title: 'Total Claims', value: stats.total, icon: FileText, color: 'bg-info', trend: 'All time' },
    { title: 'Active Claims', value: stats.active, icon: Clock, color: 'bg-warning', trend: 'In progress' },
    { title: 'Completed', value: stats.completed, icon: CheckCircle, color: 'bg-success', trend: 'Successfully closed' },
    { title: 'This Month', value: stats.thisMonth, icon: TrendingUp, color: 'bg-purple-500', trend: 'New claims' },
  ];

  const recentClaims = claims.slice(0, 5);

  return (
    <div className="h-full overflow-auto p-4 lg:p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your claims</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div role="button" tabIndex={0} onKeyDown={activateOnKey}
            key={stat.title}
            onClick={() => window.dispatchEvent(new CustomEvent('client-nav', { detail: 'claims' }))}
            className="bg-card rounded-xl border border-border p-4 shadow-card cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
            <div className="text-xs text-muted-foreground font-medium">{stat.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{stat.trend}</div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Recent Claims</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">REG</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">Vehicle</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentClaims.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">No claims yet</td>
                </tr>
              ) : recentClaims.map((claim) => (
                <tr
                  key={claim.id}
                  onClick={() => window.dispatchEvent(new CustomEvent('client-nav', { detail: 'claims' }))}
                  className="border-b border-border last:border-0 hover:bg-muted cursor-pointer"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center justify-center rounded-md bg-[#1e2d4a] text-white font-semibold uppercase text-xs"
                      style={{ width: '80px', height: '24px', letterSpacing: '0.05em' }}>
                      {claim.reg || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{claim.make_model || '—'}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <ClaimStatusBadges claim={claim} journeyOnly />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(claim.created_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}