import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { timeAgo, getInitials, getAvatarColor } from './opsDashboardHelpers';

const TYPE_COLORS = {
  'Status Change': 'bg-blue-100 text-blue-700',
  'Client Communication': 'bg-teal-100 text-teal-700',
  'Bodyshop Communication': 'bg-cyan-100 text-cyan-700',
  'Insurer Communication': 'bg-purple-100 text-purple-700',
  'Referrer Communication': 'bg-amber-100 text-amber-700',
  'Parts': 'bg-orange-100 text-orange-700',
  'Other': 'bg-slate-100 text-slate-600',
};

export default function TeamActivityFeed({ updates, claimsById, usersById }) {
  const navigate = useNavigate();

  const rows = useMemo(() => {
    return updates
      .filter((u) => u.claim_id && claimsById.has(u.claim_id))
      .map((u) => {
        const claim = claimsById.get(u.claim_id);
        const user = usersById.get(u.created_by_id);
        return {
          update: u,
          claim,
          userName: user?.full_name || 'Unknown',
          userEmail: user?.email,
        };
      });
  }, [updates, claimsById, usersById]);

  const openClaim = (claimId) => navigate(createPageUrl('Claims') + '?id=' + claimId);

  return (
    <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] flex flex-col">
      <div className="px-4 py-3 border-b border-[#E2E8F0]">
        <h2 className="font-display font-bold text-[15px] text-[#0F172A] dark:text-slate-100">Recent Team Activity</h2>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {rows.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[12px] text-[#64748B]">No recent activity</p>
            </div>
          ) : (
            rows.map((row) => {
              const u = row.update;
              const typeColor = TYPE_COLORS[u.update_type] || TYPE_COLORS['Other'];
              return (
                <button
                  key={u.id}
                  onClick={() => openClaim(u.claim_id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-[#E2E8F0] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${getAvatarColor(row.userName)}`}>
                    {getInitials(row.userName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-[#0F172A] dark:text-slate-100">{row.userName}</span>
                      <span className={`inline-flex items-center rounded-[4px] px-1.5 py-0.5 text-[9px] font-semibold ${typeColor}`}>
                        {u.update_type || 'Other'}
                      </span>
                      {u.direction && (
                        <span className="text-[10px] text-[#94A3B8]">{u.direction}</span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#64748B] truncate mt-0.5">{u.description || '—'}</p>
                  </div>
                  <span className="font-mono-ops text-[11px] font-semibold text-[#0D9488] flex-shrink-0">
                    {row.claim.job_number || '—'}
                  </span>
                  <span className="text-[11px] text-[#94A3B8] flex-shrink-0 w-16 text-right">
                    {timeAgo(u.created_date)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}