import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, FileText, Calculator, Package, Gift, AlertCircle, Menu, X } from 'lucide-react';
import FeedbackModal from '@/components/shared/FeedbackModal';
import RepairerDashboard from '@/components/repairer/RepairerDashboard';
import RepairerClaimsList from '@/components/repairer/RepairerClaimsList';
import RepairerEstimatesTab from '@/components/repairer/RepairerEstimatesTab';
import RepairerPartsTab from '@/components/repairer/RepairerPartsTab';
import RepairerProductsTab from '@/components/repairer/RepairerProductsTab';
import TyreRequestForm from '@/components/repairer/TyreRequestForm';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'claims', label: 'My Claims', icon: FileText },
  { id: 'estimates', label: 'Estimate Requests', icon: Calculator },
  { id: 'parts', label: 'Parts Support', icon: Package },
  { id: 'tyres', label: 'Tyres', icon: Package },
  { id: 'products', label: 'RCM Products', icon: Gift },
];

export default function RepairerPortal() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const bodyshopId = currentUser?.linked_bodyshop_id;

  const { data: bodyshop } = useQuery({
    queryKey: ['bodyshop', bodyshopId],
    queryFn: () => base44.entities.Bodyshop.get(bodyshopId),
    enabled: !!bodyshopId,
  });

  // Use server-side filtering instead of fetching everything
  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['repairerClaims', bodyshopId],
    queryFn: () => base44.entities.Claim.filter({ bodyshop_id: bodyshopId, repairer_accepted: true }, '-created_date'),
    enabled: !!bodyshopId,
  });

  const { data: estimates = [], isLoading: estimatesLoading } = useQuery({
    queryKey: ['repairerEstimates', bodyshopId],
    queryFn: () => base44.entities.Estimate.filter({ repairer_id: bodyshopId }, '-created_date'),
    enabled: !!bodyshopId,
  });

  const { data: parts = [], isLoading: partsLoading } = useQuery({
    queryKey: ['repairerParts', bodyshopId],
    queryFn: () => base44.entities.Part.filter({ bodyshop_company_id: bodyshopId }, '-created_date'),
    enabled: !!bodyshopId,
  });

  // Fetch claims for tyre form dropdown (only accepted claims)
  const { data: allClaims = [] } = useQuery({
    queryKey: ['repairerAllClaims', bodyshopId],
    queryFn: () => base44.entities.Claim.filter({ bodyshop_id: bodyshopId, repairer_accepted: true }, '-created_date'),
    enabled: !!bodyshopId,
  });

  if (!currentUser) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="neomorph p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-foreground-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!bodyshopId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="neomorph p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Account Not Linked</h2>
          <p className="text-foreground-muted">
            Your account is not linked to a bodyshop. Please contact RCM Automotive to set up your repairer portal access.
          </p>
        </div>
      </div>
    );
  }

  const activeClaims = claims.filter(c => !['Completed', 'Cancelled', 'Total Loss'].includes(c.job_status));
  const pendingEstimates = estimates.filter(e => !['Completed', 'Cancelled'].includes(e.status));
  const activeParts = parts.filter(p => !['Complete', 'Cancelled'].includes(p.sourcing_status));

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      {currentUser?.show_feedback_prompt && (
        <FeedbackModal user={currentUser} onClose={() => {}} />
      )}

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Slide-out Menu */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-[80%] max-w-[320px] z-50 md:hidden transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(24px)', borderRight: '1px solid var(--border-strong)' }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-lg">Menu</h2>
          <button onClick={() => setMobileMenuOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-4 space-y-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={{
                background: activeTab === tab.id ? 'var(--accent)' : 'var(--surface)',
                border: `1px solid ${activeTab === tab.id ? 'var(--accent)' : 'var(--border)'}`,
                color: activeTab === tab.id ? 'var(--accent-foreground)' : 'var(--foreground)',
              }}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile Header */}
      <div className="header-glass p-2 flex items-center gap-2 md:hidden flex-shrink-0">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="glass-button w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center font-bold" style={{ color: 'var(--accent)' }}>
          {TABS.find(t => t.id === activeTab)?.label}
        </div>
        <div className="w-10" />
      </div>

      {/* Desktop Tabs */}
      <div className="hidden md:flex gap-2 overflow-x-auto flex-shrink-0">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
              style={{
                background: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.07)',
                border: `1px solid ${isActive ? 'var(--accent)' : 'rgba(255,255,255,0.12)'}`,
                boxShadow: isActive ? '0 4px 12px rgba(0, 255, 0, 0.3)' : 'var(--shadow-sm)',
                color: isActive ? '#000000' : 'rgba(255,255,255,0.95)',
                cursor: 'pointer',
              }}
            >
              <tab.icon className={`w-4 h-4 ${isActive ? 'text-black' : ''}`} />
              <span className={isActive ? 'text-black' : ''}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'dashboard' && (
          <RepairerDashboard
            claims={claims}
            estimates={estimates}
            parts={parts}
            activeClaims={activeClaims}
            pendingEstimates={pendingEstimates}
            activeParts={activeParts}
            onNavigate={setActiveTab}
            bodyshopName={bodyshop?.name}
            bodyshopId={bodyshopId}
          />
        )}
        {activeTab === 'claims' && <RepairerClaimsList claims={claims} />}
        {activeTab === 'estimates' && (
          <RepairerEstimatesTab estimates={estimates} bodyshopId={bodyshopId} bodyshopName={bodyshop?.name} />
        )}
        {activeTab === 'parts' && (
          <RepairerPartsTab parts={parts} bodyshopId={bodyshopId} bodyshopName={bodyshop?.name} />
        )}
        {activeTab === 'products' && <RepairerProductsTab />}
        {activeTab === 'tyres' && (
          <div className="p-4">
            <div className="max-w-2xl mx-auto space-y-4">
              <h2 className="text-2xl font-bold mb-4">Tyre Pricing & Ordering</h2>
              <p className="text-foreground-muted mb-6">
                Request a price quote or place an order for tyres.
              </p>
              <TyreRequestForm bodyshopId={bodyshopId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}