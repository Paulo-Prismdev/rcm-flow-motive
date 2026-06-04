import React, { useMemo } from 'react';
import { FileText, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function ReferrerDashboard() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: claims = [] } = useQuery({
    queryKey: ['referrerClaims', currentUser?.linked_referrer_id, currentUser?.company_id],
    queryFn: async () => {
      const allClaims = await base44.entities.Claim.list('-created_date', 1000);
      return allClaims.filter(c =>
        (currentUser?.linked_referrer_id && c.referrer_id === currentUser.linked_referrer_id) ||
        (currentUser?.company_id && c.referrer_id === currentUser.company_id)
      );
    },
    enabled: !!(currentUser?.linked_referrer_id || currentUser?.company_id),
  });

  // Calculate stats
  const stats = React.useMemo(() => {
    const total = claims.length;
    const active = claims.filter(c => !['Completed', 'Cancelled', 'Total Loss'].includes(c.job_status)).length;
    const completed = claims.filter(c => c.job_status === 'Completed').length;
    const thisMonth = claims.filter(c => {
      const claimDate = new Date(c.created_date);
      const now = new Date();
      return claimDate.getMonth() === now.getMonth() && claimDate.getFullYear() === now.getFullYear();
    }).length;

    return { total, active, completed, thisMonth };
  }, [claims]);

  const statCards = [
    {
      title: 'Total Claims',
      value: stats.total,
      icon: FileText,
      color: 'bg-blue-500',
      trend: 'All time'
    },
    {
      title: 'Active Claims',
      value: stats.active,
      icon: Clock,
      color: 'bg-orange-500',
      trend: 'In progress'
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'bg-green-500',
      trend: 'Successfully closed'
    },
    {
      title: 'This Month',
      value: stats.thisMonth,
      icon: TrendingUp,
      color: 'bg-purple-500',
      trend: 'New claims'
    }
  ];

  // Recent claims
  const recentClaims = claims.slice(0, 5);

  return (
    <div className="h-full overflow-auto p-4 lg:p-6 space-y-6">
      {/* Welcome header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Overview of your claims activity
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="bg-white dark:bg-gray-900 rounded-[10px] border border-gray-100 dark:border-gray-800 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {stat.value}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {stat.title}
            </div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              {stat.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Recent claims */}
      <div className="bg-white dark:bg-gray-900 rounded-[10px] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Recent Claims
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  REG
                </th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  Client
                </th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {recentClaims.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                    No claims yet
                  </td>
                </tr>
              ) : (
                recentClaims.map((claim) => (
                  <tr
                    key={claim.id}
                    className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center rounded-md bg-[#1e2d4a] text-white font-semibold uppercase text-xs"
                        style={{ width: '80px', height: '24px', letterSpacing: '0.05em' }}>
                        {claim.reg || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {claim.client_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {claim.job_status || 'New'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(claim.created_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}