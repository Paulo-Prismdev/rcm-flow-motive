import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { PIPELINE_STAGES, getPipelineStage, getClaimValue, formatCompactGBP, isOverdueClaim, getInitials, getAvatarColor } from './opsDashboardHelpers';

export default function PipelineOverview({ claims, persona }) {
  const navigate = useNavigate();

  const stages = useMemo(() => {
    return PIPELINE_STAGES.map((stage) => {
      const stageClaims = claims.filter((c) => getPipelineStage(c) === stage.key);
      return {
        ...stage,
        count: stageClaims.length,
        value: stageClaims.reduce((s, c) => s + (getClaimValue(c) || 0), 0),
      };
    });
  }, [claims]);

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  const handlerOverdue = useMemo(() => {
    if (persona !== 'manager') return [];
    const map = {};
    claims.filter(isOverdueClaim).forEach((c) => {
      const h = c.file_handler || 'Unassigned';
      map[h] = (map[h] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [claims, persona]);

  const invoiceBreakdown = useMemo(() => {
    const order = ['Ready to Invoice', 'Invoice Required - Pending', 'Invoiced', 'Invoice Paid', 'Invoice Overdue', 'Not Ready for Invoicing'];
    const map = {};
    claims.forEach((c) => {
      const s = c.invoice_status || 'Not Ready for Invoicing';
      map[s] = (map[s] || 0) + 1;
    });
    return order.filter((s) => map[s]).map((s) => ({ label: s, count: map[s] }));
  }, [claims]);

  const goClaims = () => navigate(createPageUrl('Claims'));

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[10px] shadow-sm flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">Pipeline Overview</h2>
      </div>
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: '520px' }}>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {stages.map((stage) => (
            <button
              key={stage.key}
              onClick={goClaims}
              className="w-full px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{stage.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-gray-900 dark:text-white">{stage.count}</span>
                  <span className="font-mono text-[11px] text-gray-400">{formatCompactGBP(stage.value)}</span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: (stage.count / maxCount) * 100 + '%', backgroundColor: stage.color }}
                />
              </div>
            </button>
          ))}
        </div>

        {persona === 'manager' && handlerOverdue.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Handler Overdue Matrix</p>
            <div className="space-y-1.5">
              {handlerOverdue.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${getAvatarColor(name)}`}>
                      {getInitials(name)}
                    </div>
                    <span className="text-[12px] text-gray-700 dark:text-gray-300">{name}</span>
                  </div>
                  <span className="text-[12px] font-semibold text-red-600 dark:text-red-400">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Invoice Status</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {invoiceBreakdown.map((inv) => (
              <div key={inv.label} className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{inv.label}</span>
                <span className="text-[12px] font-semibold text-gray-900 dark:text-gray-100">{inv.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}