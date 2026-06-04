import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Plus,
  Search,
  X,
  Archive,
  Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import StatusBadge from '../components/shared/StatusBadge';
import { formatUKRegistration } from '../components/shared/formatRegistration';
import ReferrerLayout from '../components/referrer/ReferrerLayout';
import ReferrerPartsForm from '../components/referrer/ReferrerPartsForm';
import ReferrerClaimDetail from '../components/referrer/ReferrerClaimDetail';
import FeedbackModal from '../components/shared/FeedbackModal';

export default function ReferrerPortal() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewingClaim, setViewingClaim] = useState(null);

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

  // Display name: old referrer entity name, or new company name
  const displayName = referrer?.name || company?.name || 'Referrer';

  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['referrerClaims', referrerId, companyId],
    queryFn: async () => {
      const allClaims = await base44.entities.Claim.list('-created_date', 5000);
      // Match by legacy referrer_id OR by company_id (new system stores Company ID in referrer_id)
      return allClaims.filter(c =>
        (referrerId && c.referrer_id === referrerId) ||
        (companyId && c.referrer_id === companyId)
      );
    },
    enabled: isLinked,
  });

  const { data: parts = [], isLoading: partsLoading } = useQuery({
    queryKey: ['referrerParts', referrerId, companyId],
    queryFn: async () => {
      const allParts = await base44.entities.Part.list('-created_date', 5000);
      const claimIds = claims.map(c => c.id);
      return allParts.filter(p => claimIds.includes(p.linked_claim_id));
    },
    enabled: isLinked && claims.length > 0,
  });

  const isLoading = !currentUser || claimsLoading;

  if (!currentUser) {
    return (
      <ReferrerLayout>
        <div className="h-full flex items-center justify-center">
          <div className="neomorph p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-foreground-muted">Loading...</p>
          </div>
        </div>
      </ReferrerLayout>
    );
  }

  if (!isLinked) {
    return (
      <ReferrerLayout>
        <div className="h-full flex items-center justify-center">
          <div className="neomorph p-8 text-center max-w-md">
            <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Account Not Linked</h2>
            <p className="text-foreground-muted">
              Your account is not linked to a referrer. Please contact RCM Automotive to set up your referrer portal access.
            </p>
          </div>
        </div>
      </ReferrerLayout>
    );
  }

  const activeClaims = claims.filter(c => !['Completed', 'Cancelled', 'Total Loss'].includes(c.job_status));
  const completedClaims = claims.filter(c => c.job_status === 'Completed');
  const activeParts = parts.filter(p => !['Complete', 'Cancelled'].includes(p.sourcing_status));

  // Determine allowed portal sections from company (new) or referrer (legacy)
  const allowedSections = (referrer?.portal_sections || company?.portal_sections || ['Claims']);

  const allTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: null }, // always shown
    { id: 'claims', label: 'My Claims', icon: FileText, section: 'Claims' },
    { id: 'parts', label: 'Parts Tracking', icon: Package, section: 'Parts' },
  ];

  const tabs = allTabs.filter(t => !t.section || allowedSections.includes(t.section));

  if (viewingClaim) {
    return (
      <ReferrerLayout>
        <ReferrerClaimDetail claim={viewingClaim} onClose={() => setViewingClaim(null)} />
      </ReferrerLayout>
    );
  }

  return (
    <ReferrerLayout>
      {currentUser?.show_feedback_prompt && (
        <FeedbackModal user={currentUser} onClose={() => {}} />
      )}
      <div className="h-full flex flex-col gap-0 min-h-0">
        {/* Header - matching main app dark navy header */}
        <div className="flex-shrink-0 bg-[#131d47] text-white px-4 py-2.5 border-b border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold">Referrer Portal</h1>
              <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-medium border border-green-500/30">
                {displayName}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs - matching main app style */}
        <div className="flex-shrink-0 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id 
                    ? 'bg-[#1e2d4a] text-white' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 bg-gray-50 dark:bg-gray-900/50">
          {activeTab === 'dashboard' && (
            <ReferrerDashboard 
              claims={claims}
              parts={parts}
              activeClaims={activeClaims}
              completedClaims={completedClaims}
              activeParts={activeParts}
              onNavigate={setActiveTab}
              allowedSections={allowedSections}
            />
          )}
          {activeTab === 'claims' && (
            <ReferrerClaimsList claims={claims} onClaimOpen={setViewingClaim} />
          )}
          {activeTab === 'parts' && (
            <ReferrerPartsTab parts={parts} claims={claims} />
          )}
        </div>
      </div>
    </ReferrerLayout>
  );
}

function ReferrerDashboard({ claims, parts, activeClaims, completedClaims, activeParts, onNavigate, allowedSections }) {
  const showClaims = allowedSections.includes('Claims');
  const showParts = allowedSections.includes('Parts');

  return (
    <div className="space-y-4">
      {/* Stats - matching internal app dashboard style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {showClaims && (
          <div className="bg-white dark:bg-gray-900 rounded-[10px] border border-gray-100 dark:border-gray-800 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" onClick={() => onNavigate('claims')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeClaims.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Claims</p>
              </div>
            </div>
          </div>
        )}

        {showClaims && (
          <div className="bg-white dark:bg-gray-900 rounded-[10px] border border-gray-100 dark:border-gray-800 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" onClick={() => onNavigate('claims')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedClaims.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
              </div>
            </div>
          </div>
        )}

        {showParts && (
          <div className="bg-white dark:bg-gray-900 rounded-[10px] border border-gray-100 dark:border-gray-800 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" onClick={() => onNavigate('parts')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeParts.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Parts in Progress</p>
              </div>
            </div>
          </div>
        )}

        {showClaims && (
          <div className="bg-white dark:bg-gray-900 rounded-[10px] border border-gray-100 dark:border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{claims.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Claims</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Claims */}
        {showClaims && (
          <div className="bg-white dark:bg-gray-900 rounded-[10px] border border-gray-100 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Recent Claims</h3>
              <button onClick={() => onNavigate('claims')} className="text-xs text-blue-600 hover:underline">
                View All
              </button>
            </div>
            <div className="space-y-2">
              {claims.slice(0, 5).map(claim => (
                <div key={claim.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => onNavigate('claims')}>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{formatUKRegistration(claim.reg)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{claim.client_name}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <StatusBadge status={claim.job_status} />
                    {claim.secondary_status && <StatusBadge status={claim.secondary_status} variant="secondary" />}
                  </div>
                </div>
              ))}
              {claims.length === 0 && (
                <p className="text-center text-gray-400 py-4 text-sm">No claims yet</p>
              )}
            </div>
          </div>
        )}

        {/* Services Overview - only show allowed services */}
        <div className="bg-white dark:bg-gray-900 rounded-[10px] border border-gray-100 dark:border-gray-800 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Services Overview</h3>
          <div className="space-y-2">
            {showClaims && (
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => onNavigate('claims')}>
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">Claims Management</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Track all your referred claims</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            )}
            {showParts && (
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => onNavigate('parts')}>
                <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">Parts Sourcing</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">OEM, aftermarket & recycled</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReferrerClaimsList({ claims, onClaimOpen }) {
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');

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
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-[10px] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
      {/* Search bar - matching Claims page */}
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
                    onClick={() => onClaimOpen(claim)}
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

            {/* Desktop table view - matching Claims page */}
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
                      onClick={() => onClaimOpen(claim)}
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
  );
}

function ReferrerPartsTab({ parts, claims }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-[10px] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
      {showForm ? (
        <ReferrerPartsForm 
          claims={claims} 
          onClose={() => setShowForm(false)} 
          onSuccess={() => setShowForm(false)}
        />
      ) : (
        <>
          {/* Header */}
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Parts Tracking</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Track parts sourcing progress for your referred claims
              </p>
            </div>
            <Button 
              onClick={() => setShowForm(true)} 
              className="bg-[#1e2d4a] text-white hover:opacity-90 text-xs px-3 py-1.5 rounded-[10px]"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Request Parts
            </Button>
          </div>

          {/* List */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {parts.map(part => (
              <div key={part.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{part.part_description || part.job_number}</h4>
                      <StatusBadge status={part.sourcing_status} />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {part.manufacturer} - {part.vehicle_ref}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Requested: {part.date_requested ? format(new Date(part.date_requested), 'dd/MM/yyyy') : 'N/A'}
                    </p>
                  </div>
                  {part.net_price && (
                    <p className="font-bold text-lg text-gray-900 dark:text-white">£{part.net_price.toFixed(2)}</p>
                  )}
                </div>
              </div>
            ))}
            {parts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-400 text-sm">No parts requests for your claims</p>
              </div>
            )}
          </div>

          {/* Footer count */}
          <div className="px-5 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
            {parts.length} parts
          </div>
        </>
      )}
    </div>
  );
}