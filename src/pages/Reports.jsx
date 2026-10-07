import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Download, Filter, TrendingUp, BarChart3, PieChart as PieChartIcon, X } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, differenceInDays, parseISO } from 'date-fns';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function Reports() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterClaimType, setFilterClaimType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReferrer, setFilterReferrer] = useState('all');
  const [filterInsurer, setFilterInsurer] = useState('all');

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['claims'],
    queryFn: () => base44.entities.Claim.list('-created_date', 10000),
  });

  const { data: referrers = [] } = useQuery({
    queryKey: ['referrers'],
    queryFn: () => base44.entities.Referrer.list(),
  });

  const { data: insurers = [] } = useQuery({
    queryKey: ['insurers'],
    queryFn: () => base44.entities.Insurer.list(),
  });

  const filteredClaims = useMemo(() => {
    return claims.filter(claim => {
      if (claim.archived) return false;
      
      if (dateFrom && claim.created_date && new Date(claim.created_date) < new Date(dateFrom)) return false;
      if (dateTo && claim.created_date && new Date(claim.created_date) > new Date(dateTo)) return false;
      if (filterClaimType !== 'all' && claim.claim_type !== filterClaimType) return false;
      if (filterStatus !== 'all' && claim.job_status !== filterStatus) return false;
      if (filterReferrer !== 'all' && claim.referrer !== filterReferrer) return false;
      if (filterInsurer !== 'all' && claim.insurer !== filterInsurer) return false;
      
      return true;
    });
  }, [claims, dateFrom, dateTo, filterClaimType, filterStatus, filterReferrer, filterInsurer]);

  const metrics = useMemo(() => {
    const total = filteredClaims.length;
    
    const byStatus = filteredClaims.reduce((acc, claim) => {
      const status = claim.job_status || 'New';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const byType = filteredClaims.reduce((acc, claim) => {
      const type = claim.claim_type || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const byReferrer = filteredClaims.reduce((acc, claim) => {
      const ref = claim.referrer || 'Direct';
      acc[ref] = (acc[ref] || 0) + 1;
      return acc;
    }, {});

    const byInsurer = filteredClaims.reduce((acc, claim) => {
      const ins = claim.insurer || 'Unknown';
      acc[ins] = (acc[ins] || 0) + 1;
      return acc;
    }, {});

    const completedClaims = filteredClaims.filter(c => 
      c.completion_date && c.date_received
    );

    const avgResolutionTime = completedClaims.length > 0
      ? completedClaims.reduce((sum, claim) => {
          const days = differenceInDays(
            new Date(claim.completion_date),
            new Date(claim.date_received)
          );
          return sum + days;
        }, 0) / completedClaims.length
      : 0;

    const totalValue = filteredClaims.reduce((sum, claim) => {
      return sum + (claim.authority_cost_net || 0);
    }, 0);

    const avgValue = total > 0 ? totalValue / total : 0;

    const invoiceBreakdown = filteredClaims.reduce((acc, claim) => {
      const status = claim.invoice_status || 'Not Ready for Invoicing';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const claimsByMonth = filteredClaims.reduce((acc, claim) => {
      if (claim.created_date) {
        const month = format(new Date(claim.created_date), 'MMM yyyy');
        acc[month] = (acc[month] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      total,
      byStatus,
      byType,
      byReferrer,
      byInsurer,
      avgResolutionTime,
      totalValue,
      avgValue,
      invoiceBreakdown,
      claimsByMonth,
      completedClaims: completedClaims.length
    };
  }, [filteredClaims]);

  const statusChartData = Object.entries(metrics.byStatus).map(([name, value]) => ({ name, value }));
  const typeChartData = Object.entries(metrics.byType).map(([name, value]) => ({ name, value }));
  const referrerChartData = Object.entries(metrics.byReferrer)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));
  const invoiceChartData = Object.entries(metrics.invoiceBreakdown).map(([name, value]) => ({ name, value }));
  const monthlyChartData = Object.entries(metrics.claimsByMonth)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([name, value]) => ({ name, value }));

  const handleExport = () => {
    const headers = ['Job Number', 'Client', 'Reg', 'Status', 'Type', 'Referrer', 'Insurer', 'Value', 'Created Date', 'Completion Date'];
    const rows = filteredClaims.map(c => [
      c.job_number || '',
      c.client_name || '',
      c.reg || '',
      c.job_status || '',
      c.claim_type || '',
      c.referrer || '',
      c.insurer || '',
      c.final_repair_cost || c.authority_cost_gross || '',
      c.created_date ? format(new Date(c.created_date), 'dd/MM/yyyy') : '',
      c.completion_date ? format(new Date(c.completion_date), 'dd/MM/yyyy') : '',
    ]);
    const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const table = `<table border="1"><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Claims Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>${table}</body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claims-report-${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const uniqueStatuses = [...new Set(claims.map(c => c.job_status).filter(Boolean))];
  const uniqueReferrers = [...new Set(claims.map(c => c.referrer).filter(Boolean))];
  const uniqueInsurers = [...new Set(claims.map(c => c.insurer).filter(Boolean))];

  const hasActiveFilters = dateFrom || dateTo || filterClaimType !== 'all' || filterStatus !== 'all' || filterReferrer !== 'all' || filterInsurer !== 'all';

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setFilterClaimType('all');
    setFilterStatus('all');
    setFilterReferrer('all');
    setFilterInsurer('all');
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="glass p-4 lg:p-6 flex-shrink-0">
        <div className="flex items-start justify-between mb-4 gap-2">
          <div>
            <h1 className="text-base lg:text-2xl font-bold">Claims Reports & Analytics</h1>
            <p className="text-xs lg:text-sm text-foreground-muted mt-1">Comprehensive insights into your claims data</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasActiveFilters && (
              <Button onClick={clearFilters} size="sm" className="glass-button flex items-center gap-1.5 text-xs">
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Filters</span>
              </Button>
            )}
            <Button onClick={handleExport} size="sm" className="glass-button flex items-center gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 lg:gap-3">
          <div>
            <label className="block text-xs text-foreground-muted mb-1">From Date</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="glass-inset text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-foreground-muted mb-1">To Date</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="glass-inset text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-foreground-muted mb-1">Claim Type</label>
            <select
              value={filterClaimType}
              onChange={(e) => setFilterClaimType(e.target.value)}
              className="glass-inset w-full px-3 py-2 text-sm rounded-xl border-0"
            >
              <option value="all">All Types</option>
              <option value="Own Damage">Own Damage</option>
              <option value="Third Party">Third Party</option>
              <option value="Fault Claim">Fault Claim</option>
              <option value="Non-Fault - Own Insurer">Non-Fault - Own Insurer</option>
              <option value="Non-Fault Claim">Non-Fault Claim</option>
              <option value="Total Loss">Total Loss</option>
              <option value="Glass Claim">Glass Claim</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-foreground-muted mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="glass-inset w-full px-3 py-2 text-sm rounded-xl border-0"
            >
              <option value="all">All Statuses</option>
              {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-foreground-muted mb-1">Referrer</label>
            <select
              value={filterReferrer}
              onChange={(e) => setFilterReferrer(e.target.value)}
              className="glass-inset w-full px-3 py-2 text-sm rounded-xl border-0"
            >
              <option value="all">All Referrers</option>
              {uniqueReferrers.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-foreground-muted mb-1">Insurer</label>
            <select
              value={filterInsurer}
              onChange={(e) => setFilterInsurer(e.target.value)}
              className="glass-inset w-full px-3 py-2 text-sm rounded-xl border-0"
            >
              <option value="all">All Insurers</option>
              {uniqueInsurers.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <div className="glass p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm text-foreground-muted">Total Claims</h3>
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold">{metrics.total}</p>
            </div>

            <div className="glass p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs lg:text-sm text-foreground-muted">Avg Repair Value</h3>
                <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-green-500" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold">£{metrics.avgValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
              <p className="text-xs text-foreground-muted mt-1">Total: £{metrics.totalValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            </div>

            <div className="glass p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs lg:text-sm text-foreground-muted">Avg Resolution</h3>
                <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-purple-500" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold">{metrics.avgResolutionTime.toFixed(1)}</p>
              <p className="text-xs text-foreground-muted mt-1">days</p>
            </div>

            <div className="glass p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs lg:text-sm text-foreground-muted">Completed</h3>
                <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-orange-500" />
              </div>
              <p className="text-2xl lg:text-3xl font-bold">{metrics.completedClaims}</p>
              <p className="text-xs text-foreground-muted mt-1">{((metrics.completedClaims / metrics.total) * 100 || 0).toFixed(1)}% of total</p>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Claims by Status
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--foreground-muted)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--foreground-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5" />
                Claims by Type
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {typeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass p-6">
              <h3 className="font-bold mb-4">Top 10 Referrers by Volume</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={referrerChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--foreground-muted)" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} stroke="var(--foreground-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                  <Bar dataKey="value" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass p-6">
              <h3 className="font-bold mb-4">Invoice Status Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={invoiceChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {invoiceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="glass p-6">
            <h3 className="font-bold mb-4">Claims Volume Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--foreground-muted)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--foreground-muted)" />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} name="Claims" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Breakdown Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass p-6">
              <h3 className="font-bold mb-4">Status Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(metrics.byStatus)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between p-3 glass-inset rounded-lg">
                      <span className="text-sm font-medium">{status}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-foreground-muted">{count} claims</span>
                        <span className="text-sm font-bold text-accent">{((count / metrics.total) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="glass p-6">
              <h3 className="font-bold mb-4">Insurer Breakdown</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Object.entries(metrics.byInsurer)
                  .sort((a, b) => b[1] - a[1])
                  .map(([insurer, count]) => (
                    <div key={insurer} className="flex items-center justify-between p-3 glass-inset rounded-lg">
                      <span className="text-sm font-medium">{insurer}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-foreground-muted">{count} claims</span>
                        <span className="text-sm font-bold text-accent">{((count / metrics.total) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}