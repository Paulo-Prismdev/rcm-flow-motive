import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { timeAgo, getInitials, getAvatarColor } from './opsDashboardHelpers';

const TYPE_COLORS = {
  'Status Change': 'bg-info-bg text-info-fg',
  'Client Communication': 'bg-success-bg text-link',
  'Bodyshop Communication': 'bg-info-bg text-info-fg',
  'Insurer Communication': 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'Referrer Communication': 'bg-warning-bg text-warning-fg',
  'Credit Repair Communication': 'bg-danger-bg text-danger-fg',
  'Parts': 'bg-warning-bg text-warning-fg',
  'Other': 'bg-muted text-muted-foreground',
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
    <div className="bg-card border border-border rounded-xl shadow-card flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-[15px] font-semibold text-foreground">Recent team activity</h2>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[700px] max-md:min-w-0">
          {rows.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[13px] text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            rows.map((row) => {
              const u = row.update;
              const typeColor = TYPE_COLORS[u.update_type] || TYPE_COLORS['Other'];
              return (
                <button
                  key={u.id}
                  onClick={() => openClaim(u.claim_id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-border hover:bg-muted transition-colors text-left"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getAvatarColor(row.userName)}`}>
                    {getInitials(row.userName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-foreground">{row.userName}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold ${typeColor}`}>
                        {u.update_type || 'Other'}
                      </span>
                      {u.direction && (
                        <span className="text-xs text-muted-foreground">{u.direction}</span>
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground truncate mt-0.5">{u.description || '—'}</p>
                  </div>
                  <span className="font-mono text-[12px] font-semibold text-link flex-shrink-0">
                    {row.claim.job_number || '—'}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 w-16 text-right">
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