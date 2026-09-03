import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { timeAgo, getInitials, getAvatarColor } from './opsDashboardHelpers';

const TYPE_COLORS = {
  'Status Change': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Client Communication': 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  'Bodyshop Communication': 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  'Insurer Communication': 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'Referrer Communication': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'Parts': 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'Other': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
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
        };
      });
  }, [updates, claimsById, usersById]);

  const openClaim = (claimId) => navigate(createPageUrl('Claims') + '?id=' + claimId);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[10px] shadow-sm flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">Recent Team Activity</h2>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {rows.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[13px] text-gray-400">No recent activity</p>
            </div>
          ) : (
            rows.map((row) => {
              const u = row.update;
              const typeColor = TYPE_COLORS[u.update_type] || TYPE_COLORS['Other'];
              return (
                <button
                  key={u.id}
                  onClick={() => openClaim(u.claim_id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${getAvatarColor(row.userName)}`}>
                    {getInitials(row.userName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{row.userName}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${typeColor}`}>
                        {u.update_type || 'Other'}
                      </span>
                      {u.direction && (
                        <span className="text-[10px] text-gray-400">{u.direction}</span>
                      )}
                    </div>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{u.description || '—'}</p>
                  </div>
                  <span className="font-mono text-[12px] font-semibold text-teal-600 dark:text-teal-400 flex-shrink-0">
                    {row.claim.job_number || '—'}
                  </span>
                  <span className="text-[11px] text-gray-400 flex-shrink-0 w-16 text-right">
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