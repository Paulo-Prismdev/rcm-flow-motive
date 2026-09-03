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
    <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[#E2E8F0]">
        <h2 className="font-display font-bold text-[15px] text-[#0F172A] dark:text-slate-100">Pipeline Overview</h2>
      </div>
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: '520px' }}>
        <div className="divide-y divide-[#E2E8F0]">
          {stages.map((stage) => (
            <button
              key={stage.key}
              onClick={goClaims}
              className="w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-[12px] font-medium text-[#0F172A] dark:text-slate-100">{stage.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono-ops text-[12px] font-semibold text-[#0F172A] dark:text-slate-100">{stage.count}</span>
                  <span className="font-mono-ops text-[11px] text-[#64748B]">{formatCompactGBP(stage.value)}</span>
                </div>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: (stage.count / maxCount) * 100 + '%', backgroundColor: stage.color }}
                />
              </div>
            </button>
          ))}
        </div>

        {persona === 'manager' && handlerOverdue.length > 0 && (
          <div className="border-t border-[#E2E8F0] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B] mb-2">Handler Overdue Matrix</p>
            <div className="space-y-1.5">
              {handlerOverdue.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${getAvatarColor(name)}`}>
                      {getInitials(name)}
                    </div>
                    <span className="text-[11px] text-[#0F172A] dark:text-slate-200">{name}</span>
                  </div>
                  <span className="font-mono-ops text-[11px] font-semibold text-[#DC2626]">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-[#E2E8F0] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B] mb-2">Invoice Status</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {invoiceBreakdown.map((inv) => (
              <div key={inv.label} className="flex items-center justify-between">
                <span className="text-[11px] text-[#64748B] truncate">{inv.label}</span>
                <span className="font-mono-ops text-[11px] font-semibold text-[#0F172A] dark:text-slate-200">{inv.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}