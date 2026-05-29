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
  X
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
      <div className="h-full flex flex-col gap-4">
        {/* Header */}
        <div className="neomorph p-4 md:p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Referrer Portal</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back, {displayName}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="neomorph p-2 flex gap-1 overflow-x-auto flex-shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id 
                  ? 'bg-accent text-accent-foreground' 
                  : 'hover:bg-surface-hover'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
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
      {/* Stats - only show relevant ones */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {showClaims && (
          <div className="neomorph p-4 cursor-pointer hover:shadow-lg transition-all" onClick={() => onNavigate('claims')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeClaims.length}</p>
                <p className="text-xs text-foreground-muted">Active Claims</p>
              </div>
            </div>
          </div>
        )}

        {showClaims && (
          <div className="neomorph p-4 cursor-pointer hover:shadow-lg transition-all" onClick={() => onNavigate('claims')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedClaims.length}</p>
                <p className="text-xs text-foreground-muted">Completed</p>
              </div>
            </div>
          </div>
        )}

        {showParts && (
          <div className="neomorph p-4 cursor-pointer hover:shadow-lg transition-all" onClick={() => onNavigate('parts')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeParts.length}</p>
                <p className="text-xs text-foreground-muted">Parts in Progress</p>
              </div>
            </div>
          </div>
        )}

        {showClaims && (
          <div className="neomorph p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{claims.length}</p>
                <p className="text-xs text-foreground-muted">Total Claims</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Claims */}
        {showClaims && (
          <div className="neomorph p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Recent Claims</h3>
              <button onClick={() => onNavigate('claims')} className="text-sm text-accent hover:underline">
                View All
              </button>
            </div>
            <div className="space-y-2">
              {claims.slice(0, 5).map(claim => (
                <div key={claim.id} className="neomorph-flat p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{formatUKRegistration(claim.reg)}</p>
                    <p className="text-xs text-foreground-muted">{claim.client_name}</p>
                  </div>
                  <StatusBadge status={claim.job_status} />
                </div>
              ))}
              {claims.length === 0 && (
                <p className="text-center text-foreground-muted py-4">No claims yet</p>
              )}
            </div>
          </div>
        )}

        {/* Services Overview - only show allowed services */}
        <div className="neomorph p-4">
          <h3 className="font-bold mb-4">Services Overview</h3>
          <div className="space-y-2">
            {showClaims && (
              <div className="neomorph-flat p-4 flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('claims')}>
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Claims Management</p>
                  <p className="text-xs text-foreground-muted">Track all your referred claims</p>
                </div>
                <ChevronRight className="w-4 h-4 text-foreground-muted" />
              </div>
            )}
            {showParts && (
              <div className="neomorph-flat p-4 flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('parts')}>
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Parts Sourcing</p>
                  <p className="text-xs text-foreground-muted">OEM, aftermarket & recycled</p>
                </div>
                <ChevronRight className="w-4 h-4 text-foreground-muted" />
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
      c.make_model?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by reg, client, job number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="neomorph p-4">
        {/* Status filter tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[{id:'active',label:'Active'},{id:'completed',label:'Completed'},{id:'all',label:'All'}].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === f.id ? 'bg-accent text-accent-foreground' : 'border border-border hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredClaims.map(claim => (
            <div 
              key={claim.id} 
              className="neomorph-flat p-4 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => onClaimOpen(claim)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-bold">{formatUKRegistration(claim.reg)}</h4>
                    {claim.job_number && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent/20 text-accent">
                        {claim.job_number}
                      </span>
                    )}
                    <StatusBadge status={claim.job_status} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-foreground-muted">Client:</span>{' '}
                      <span className="font-medium">{claim.client_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-foreground-muted">Vehicle:</span>{' '}
                      <span className="font-medium">{claim.make_model || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-foreground-muted">Type:</span>{' '}
                      <span className="font-medium">{claim.claim_type || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-foreground-muted">Received:</span>{' '}
                      <span className="font-medium">
                        {claim.date_received ? format(new Date(claim.date_received), 'dd/MM/yyyy') : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-foreground-muted flex-shrink-0" />
              </div>
            </div>
          ))}
          {filteredClaims.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {search ? 'No claims match your search.' : 'No claims found.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ReferrerPartsTab({ parts, claims }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      {showForm ? (
        <ReferrerPartsForm 
          claims={claims} 
          onClose={() => setShowForm(false)} 
          onSuccess={() => setShowForm(false)}
        />
      ) : (
        <div className="neomorph p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold">Parts Tracking</h3>
              <p className="text-sm text-foreground-muted">
                Track parts sourcing progress for your referred claims
              </p>
            </div>
            <Button 
              onClick={() => setShowForm(true)} 
              className="neomorph-flat bg-accent/10 text-accent"
            >
              <Plus className="w-4 h-4 mr-2" />
              Request Parts
            </Button>
          </div>

          <div className="space-y-3">
            {parts.map(part => (
              <div key={part.id} className="neomorph-flat p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold">{part.part_description || part.job_number}</h4>
                      <StatusBadge status={part.sourcing_status} />
                    </div>
                    <p className="text-sm text-foreground-muted">
                      {part.manufacturer} - {part.vehicle_ref}
                    </p>
                    <p className="text-xs text-foreground-muted mt-1">
                      Requested: {part.date_requested ? format(new Date(part.date_requested), 'dd/MM/yyyy') : 'N/A'}
                    </p>
                  </div>
                  {part.net_price && (
                    <p className="font-bold text-lg">£{part.net_price.toFixed(2)}</p>
                  )}
                </div>
              </div>
            ))}
            {parts.length === 0 && (
              <p className="text-center text-foreground-muted py-8">No parts requests for your claims</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}