import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronRight,
  AlertCircle,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '../components/shared/StatusBadge';
import { formatUKRegistration } from '../components/shared/formatRegistration';
import ReferrerLayout from '../components/referrer/ReferrerLayout';
import ReferrerClaimDetail from '../components/referrer/ReferrerClaimDetail';
import FeedbackModal from '../components/shared/FeedbackModal';

export default function ReferrerPortal() {
  const [viewingClaim, setViewingClaim] = useState(null);
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const referrerId = currentUser?.linked_referrer_id;
  const companyId = currentUser?.company_id;
  const isLinked = !!referrerId || !!companyId;

  const { data: referrer } = useQuery({
    queryKey: ['referrer', referrerId],
    queryFn: () => base44.entities.Referrer.get(referrerId),
    enabled: !!referrerId,
  });

  const { data: company } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => base44.entities.Company.get(companyId),
    enabled: !!companyId && !referrerId,
  });

  const displayName = referrer?.name || company?.name || 'Referrer';

  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['referrerClaims', referrerId, companyId],
    queryFn: async () => {
      const allClaims = await base44.entities.Claim.list('-created_date', 5000);
      return allClaims.filter(c =>
        (referrerId && c.referrer_id === referrerId) ||
        (companyId && c.referrer_id === companyId)
      );
    },
    enabled: isLinked,
  });

  const isLoading = !currentUser || claimsLoading;

  if (!currentUser) {
    return (
      <ReferrerLayout>
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto"></div>
        </div>
      </ReferrerLayout>
    );
  }

  if (!isLinked) {
    return (
      <ReferrerLayout>
        <div className="h-full flex items-center justify-center">
          <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Account Not Linked</h2>
          <p className="text-foreground-muted">
            Your account is not linked to a referrer. Please contact RCM Automotive to set up your referrer portal access.
          </p>
        </div>
      </ReferrerLayout>
    );
  }

  if (viewingClaim) {
    return (
      <ReferrerLayout>
        <ReferrerClaimDetail claim={viewingClaim} onClose={() => setViewingClaim(null)} />
      </ReferrerLayout>
    );
  }

  const filteredClaims = claims.filter(c => {
    const matchesStatus =
      filter === 'active' ? !['Completed', 'Cancelled', 'Total Loss'].includes(c.job_status) :
      filter === 'completed' ? c.job_status === 'Completed' : true;
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      c.reg?.toLowerCase().includes(q) ||
      c.client_name?.toLowerCase().includes(q) ||
      c.job_number?.toLowerCase().includes(q) ||
      c.referrer_ref?.toLowerCase().includes(q) ||
      c.make_model?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const formatDate = (val) => {
    if (!val) return '—';
    try { return format(new Date(val), 'dd/MM/yyyy'); } catch { return val; }
  };

  return (
    <ReferrerLayout>
      {currentUser?.show_feedback_prompt && (
        <FeedbackModal user={currentUser} onClose={() => {}} />
      )}
      {/* Claims list - matching internal Claims page */}
      <div className="h-full flex flex-col min-h-0 bg-white dark:bg-gray-900 rounded-[10px] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
          {/* Search bar */}
          <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex-1 relative">
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

            {/* Status filter */}
            <select 
              value={filter} 
              onChange={e => setFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[10px] text-gray-700 dark:text-gray-300 focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="all">All</option>
            </select>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto min-h-0" style={{WebkitOverflowScrolling: 'touch'}}>
            {filteredClaims.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <p className="text-sm text-gray-400">{search ? 'No claims match your search.' : 'No claims found.'}</p>
              </div>
            ) : (
              <>
                {/* Mobile card view */}
                <div className="lg:hidden">
                  {filteredClaims.map(claim => {
                    const isClosedStatus = ['Completed', 'Cancelled', 'Total Loss'].includes(claim.job_status);
                    return (
                      <div
                        key={claim.id}
                        onClick={() => setViewingClaim(claim)}
                        className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/60 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="inline-flex items-center justify-center rounded-md bg-[#1e2d4a] text-white font-semibold uppercase flex-shrink-0"
                            style={{ fontSize: '13px', width: '96px', height: '28px', letterSpacing: '0.05em' }}
                          >
                            {claim.reg ? formatUKRegistration(claim.reg) : '—'}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!isClosedStatus && <StatusBadge status={claim.job_status} />}
                            {claim.secondary_status && <StatusBadge status={claim.secondary_status} variant="secondary" />}
                            <ChevronRight className="w-4 h-4 text-gray-400 ml-1" />
                          </div>
                        </div>
                        <div className="mt-1.5 flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{claim.client_name || '—'}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{claim.make_model || '—'} · {formatDate(claim.loss_date)}</span>
                          {claim.referrer_ref && <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{claim.referrer_ref}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table view */}
                <table className="hidden lg:table w-full min-w-[700px]">
                  <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="sticky left-0 z-20 bg-white dark:bg-gray-900 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">REG</th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">CLIENT</th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">VEHICLE</th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">LOSS DATE</th>
                      <th className="sticky right-0 z-20 bg-white dark:bg-gray-900 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClaims.map(claim => {
                      const isClosedStatus = ['Completed', 'Cancelled', 'Total Loss'].includes(claim.job_status);
                      return (
                        <tr
                          key={claim.id}
                          onClick={() => setViewingClaim(claim)}
                          className="group border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="sticky left-0 z-10 px-4 py-2.5 whitespace-nowrap bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50">
                            <span
                              className="inline-flex items-center justify-center rounded-md bg-[#1e2d4a] text-white font-semibold uppercase"
                              style={{ fontSize: '13px', width: '96px', height: '28px', letterSpacing: '0.05em' }}
                            >
                              {claim.reg ? formatUKRegistration(claim.reg) : ''}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[160px] truncate">
                            {claim.client_name || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {claim.make_model || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {formatDate(claim.loss_date)}
                          </td>
                          <td className="sticky right-0 z-10 px-3 py-2.5 whitespace-nowrap bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50">
                            <div className="flex items-center gap-1.5 justify-end flex-wrap">
                              {claim.secondary_status && <StatusBadge status={claim.secondary_status} variant="secondary" />}
                              {!isClosedStatus && <StatusBadge status={claim.job_status} />}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {/* Footer count */}
          <div className="px-5 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 flex-shrink-0">
            {filteredClaims.length} of {claims.length} claims
          </div>
        </div>
    </ReferrerLayout>
  );
}