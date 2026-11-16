import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { isClaimClosed } from '@/components/shared/claimOutcome';

export default function WidgetStatCard({ config, isEditMode }) {
  const { title = 'Stat Card', entity = 'Claim', color = 'blue' } = config;

  const { data: records = [], isLoading } = useQuery({
    queryKey: [entity.toLowerCase(), 'count'],
    queryFn: () => base44.entities[entity].list('-created_date', 1000),
    enabled: !isEditMode,
  });

  const openCount = records.filter(r => {
    if (entity === 'Claim') return !isClaimClosed(r);
    if (entity === 'Estimate') return r.status !== 'Completed' && r.status !== 'Cancelled';
    if (entity === 'Engineering') return r.status !== 'Completed' && r.status !== 'Cancelled';
    if (entity === 'Part') return r.sourcing_status !== 'Delivered' && r.sourcing_status !== 'Cancelled';
    return true;
  }).length;

  const total = records.length;
  const pct = total > 0 ? Math.round((openCount / total) * 100) : 0;

  const colorMap = {
    blue:   { bar: 'bg-info',   pill: 'bg-info-bg text-info-fg',   dot: 'bg-info' },
    green:  { bar: 'bg-success', pill: 'bg-success-bg text-success-fg', dot: 'bg-success' },
    orange: { bar: 'bg-warning', pill: 'bg-warning-bg text-warning-fg', dot: 'bg-warning' },
    red:    { bar: 'bg-danger',   pill: 'bg-danger-bg text-danger-fg',   dot: 'bg-danger' },
    purple: { bar: 'bg-violet-500', pill: 'bg-violet-50 text-violet-600', dot: 'bg-violet-500' },
    gray:   { bar: 'bg-slate-400',  pill: 'bg-muted text-muted-foreground',  dot: 'bg-slate-400' },
  };
  const c = colorMap[color] || colorMap.blue;

  const pageMap = { 'Claim': 'Claims', 'Estimate': 'Estimating', 'Engineering': 'Engineering', 'Part': 'Parts' };
  const pageName = pageMap[entity] || 'Dashboard';

  const content = (
    <div className="h-full bg-card text-card-foreground rounded-2xl border border-border shadow-card hover:shadow-md transition-all duration-200 p-5 flex flex-col gap-4 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-bold tabular-nums">
            {isLoading ? <span className="inline-block w-12 h-8 bg-muted rounded animate-pulse" /> : openCount}
          </h3>
        </div>
        <span className={`w-8 h-8 rounded-full ${c.dot} opacity-10 group-hover:opacity-20 transition-opacity`} />
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Active vs Total</span>
          <span className="text-xs font-semibold text-muted-foreground">{pct}%</span>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full ${c.bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.pill}`}>{total} total</span>
        <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
      </div>
    </div>
  );

  if (isEditMode) return content;
  return <Link to={createPageUrl(pageName)} className="block h-full">{content}</Link>;
}