import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function WidgetStatCard({ config, isEditMode }) {
  const { title = 'Stat Card', entity = 'Claim', color = 'blue' } = config;

  const { data: records = [], isLoading } = useQuery({
    queryKey: [entity.toLowerCase(), 'count'],
    queryFn: () => base44.entities[entity].list('-created_date', 1000),
    enabled: !isEditMode,
  });

  const openCount = records.filter(r => {
    if (entity === 'Claim') return r.job_status !== 'Completed' && r.job_status !== 'Cancelled';
    if (entity === 'Estimate') return r.status !== 'Completed' && r.status !== 'Cancelled';
    if (entity === 'Engineering') return r.status !== 'Completed' && r.status !== 'Cancelled';
    if (entity === 'Part') return r.sourcing_status !== 'Delivered' && r.sourcing_status !== 'Cancelled';
    return true;
  }).length;

  const total = records.length;
  const pct = total > 0 ? Math.round((openCount / total) * 100) : 0;

  const colorMap = {
    blue:   { bar: 'bg-blue-500',   pill: 'bg-blue-50 text-blue-600',   dot: 'bg-blue-500' },
    green:  { bar: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' },
    orange: { bar: 'bg-orange-500', pill: 'bg-orange-50 text-orange-600', dot: 'bg-orange-500' },
    red:    { bar: 'bg-rose-500',   pill: 'bg-rose-50 text-rose-600',   dot: 'bg-rose-500' },
    purple: { bar: 'bg-violet-500', pill: 'bg-violet-50 text-violet-600', dot: 'bg-violet-500' },
    gray:   { bar: 'bg-slate-400',  pill: 'bg-slate-50 text-slate-600',  dot: 'bg-slate-400' },
  };
  const c = colorMap[color] || colorMap.blue;

  const pageMap = { 'Claim': 'Claims', 'Estimate': 'Estimating', 'Engineering': 'Engineering', 'Part': 'Parts' };
  const pageName = pageMap[entity] || 'Dashboard';

  const content = (
    <div className="h-full bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col gap-4 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-800 tabular-nums">
            {isLoading ? <span className="inline-block w-12 h-8 bg-slate-100 rounded animate-pulse" /> : openCount}
          </h3>
        </div>
        <span className={`w-8 h-8 rounded-full ${c.dot} opacity-10 group-hover:opacity-20 transition-opacity`} />
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-slate-400">Active vs Total</span>
          <span className="text-[11px] font-semibold text-slate-500">{pct}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${c.bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${c.pill}`}>{total} total</span>
        <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
      </div>
    </div>
  );

  if (isEditMode) return content;
  return <Link to={createPageUrl(pageName)} className="block h-full">{content}</Link>;
}