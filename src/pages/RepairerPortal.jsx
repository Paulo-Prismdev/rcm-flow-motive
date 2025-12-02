import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutDashboard, 
  FileText, 
  Calculator, 
  Package, 
  Gift,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '../components/shared/StatusBadge';
import { formatUKRegistration } from '../components/shared/formatRegistration';
import RepairerEstimateForm from '../components/repairer/RepairerEstimateForm';
import RepairerPartsForm from '../components/repairer/RepairerPartsForm';
import AdvertBanner from '../components/repairer/AdvertBanner';

export default function RepairerPortal() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: bodyshop } = useQuery({
    queryKey: ['bodyshop', currentUser?.linked_bodyshop_id],
    queryFn: () => base44.entities.Bodyshop.get(currentUser.linked_bodyshop_id),
    enabled: !!currentUser?.linked_bodyshop_id,
  });

  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['repairerClaims', currentUser?.linked_bodyshop_id],
    queryFn: async () => {
      const allClaims = await base44.entities.Claim.list('-created_date', 5000);
      return allClaims.filter(c => c.bodyshop_id === currentUser.linked_bodyshop_id);
    },
    enabled: !!currentUser?.linked_bodyshop_id,
  });

  const { data: estimates = [], isLoading: estimatesLoading } = useQuery({
    queryKey: ['repairerEstimates', currentUser?.linked_bodyshop_id],
    queryFn: async () => {
      const allEstimates = await base44.entities.Estimate.list('-created_date', 5000);
      return allEstimates.filter(e => e.repairer_id === currentUser.linked_bodyshop_id);
    },
    enabled: !!currentUser?.linked_bodyshop_id,
  });

  const { data: parts = [], isLoading: partsLoading } = useQuery({
    queryKey: ['repairerParts', currentUser?.linked_bodyshop_id],
    queryFn: async () => {
      const allParts = await base44.entities.Part.list('-created_date', 5000);
      return allParts.filter(p => p.bodyshop_company_id === currentUser.linked_bodyshop_id);
    },
    enabled: !!currentUser?.linked_bodyshop_id,
  });

  const isLoading = !currentUser || claimsLoading || estimatesLoading || partsLoading;

  if (!currentUser) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="neomorph p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-foreground-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser.linked_bodyshop_id) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="neomorph p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Account Not Linked</h2>
          <p className="text-foreground-muted">
            Your account is not linked to a bodyshop. Please contact ARTURA to set up your repairer portal access.
          </p>
        </div>
      </div>
    );
  }

  const activeClaims = claims.filter(c => !['Completed', 'Cancelled', 'Total Loss'].includes(c.job_status));
  const pendingEstimates = estimates.filter(e => !['Completed', 'Cancelled'].includes(e.status));
  const activeParts = parts.filter(p => !['Complete', 'Cancelled'].includes(p.sourcing_status));

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'claims', label: 'My Claims', icon: FileText },
    { id: 'estimates', label: 'Estimate Requests', icon: Calculator },
    { id: 'parts', label: 'Parts Support', icon: Package },
    { id: 'products', label: 'ARTURA Products', icon: Gift },
  ];

  return (
    <div className="h-full flex flex-col gap-2">
      {/* Tabs */}
      <div className="neomorph p-1.5 flex gap-1 overflow-x-auto flex-shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id 
                ? 'bg-accent text-accent-foreground' 
                : 'hover:bg-surface-hover'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
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
          />
        )}
        {activeTab === 'claims' && (
          <RepairerClaimsList claims={claims} />
        )}
        {activeTab === 'estimates' && (
          <RepairerEstimatesTab estimates={estimates} bodyshopId={currentUser.linked_bodyshop_id} bodyshopName={bodyshop?.name} />
        )}
        {activeTab === 'parts' && (
          <RepairerPartsTab parts={parts} bodyshopId={currentUser.linked_bodyshop_id} bodyshopName={bodyshop?.name} />
        )}
        {activeTab === 'products' && (
          <RepairerProductsTab />
        )}
      </div>
    </div>
  );
}

function RepairerDashboard({ claims, estimates, parts, activeClaims, pendingEstimates, activeParts, onNavigate, bodyshopName }) {
  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 space-y-4">
      {/* Welcome Message */}
      <div className="neomorph p-4">
        <h2 className="text-xl font-bold">Welcome back, {bodyshopName || 'Repairer'}!</h2>
        <p className="text-sm text-foreground-muted">Here's an overview of your current activity</p>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

        <div className="neomorph p-4 cursor-pointer hover:shadow-lg transition-all" onClick={() => onNavigate('estimates')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingEstimates.length}</p>
              <p className="text-xs text-foreground-muted">Pending Estimates</p>
            </div>
          </div>
        </div>

        <div className="neomorph p-4 cursor-pointer hover:shadow-lg transition-all" onClick={() => onNavigate('parts')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeParts.length}</p>
              <p className="text-xs text-foreground-muted">Parts Requests</p>
            </div>
          </div>
        </div>

        <div className="neomorph p-4 cursor-pointer hover:shadow-lg transition-all" onClick={() => onNavigate('products')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Gift className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">New</p>
              <p className="text-xs text-foreground-muted">ARTURA Products</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Claims */}
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

        {/* Quick Actions */}
        <div className="neomorph p-4">
          <h3 className="font-bold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button 
              onClick={() => onNavigate('estimates')}
              className="w-full neomorph-flat p-4 flex items-center justify-between hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <Calculator className="w-5 h-5 text-accent" />
                <span className="font-medium">Request an Estimate</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onNavigate('parts')}
              className="w-full neomorph-flat p-4 flex items-center justify-between hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-accent" />
                <span className="font-medium">Request Parts Support</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onNavigate('products')}
              className="w-full neomorph-flat p-4 flex items-center justify-between hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5 text-accent" />
                <span className="font-medium">Explore ARTURA Products</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      </div>
      
      {/* Advert Banner - Bottom of dashboard only */}
      <div className="mt-4 pb-2">
        <AdvertBanner />
      </div>
    </div>
  );
}

function RepairerClaimsList({ claims }) {
  const [filter, setFilter] = useState('active');

  const filteredClaims = claims.filter(c => {
    if (filter === 'active') return !['Completed', 'Cancelled', 'Total Loss'].includes(c.job_status);
    if (filter === 'completed') return c.job_status === 'Completed';
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="neomorph p-4">
        <div className="flex gap-2 mb-4">
          {['active', 'completed', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                filter === f ? 'bg-accent text-accent-foreground' : 'neomorph-flat hover:shadow-md'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredClaims.map(claim => (
            <div key={claim.id} className="neomorph-flat p-4">
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
                      <span className="text-foreground-muted">Booking In:</span>{' '}
                      <span className="font-medium">
                        {claim.booking_in_date ? format(new Date(claim.booking_in_date), 'dd/MM/yyyy') : 'TBC'}
                      </span>
                    </div>
                    <div>
                      <span className="text-foreground-muted">ECD:</span>{' '}
                      <span className="font-medium">
                        {claim.ecd ? format(new Date(claim.ecd), 'dd/MM/yyyy') : 'TBC'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredClaims.length === 0 && (
            <p className="text-center text-foreground-muted py-8">No claims found</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RepairerEstimatesTab({ estimates, bodyshopId, bodyshopName }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="neomorph p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Estimate Requests</h3>
          <button
            onClick={() => setShowForm(true)}
            className="neomorph-flat px-4 py-2 text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20"
          >
            + Request New Estimate
          </button>
        </div>

        {showForm ? (
          <RepairerEstimateForm 
            bodyshopId={bodyshopId} 
            bodyshopName={bodyshopName}
            onClose={() => setShowForm(false)}
            onSuccess={() => setShowForm(false)}
          />
        ) : (
          <div className="space-y-3">
            {estimates.map(est => (
              <div key={est.id} className="neomorph-flat p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold">{est.name || est.job_number}</h4>
                      <StatusBadge status={est.status} />
                    </div>
                    <p className="text-sm text-foreground-muted">{est.make_model}</p>
                    <p className="text-xs text-foreground-muted mt-1">
                      Requested: {est.date_received ? format(new Date(est.date_received), 'dd/MM/yyyy') : 'N/A'}
                    </p>
                  </div>
                  {est.estimate_value && (
                    <p className="font-bold text-lg">£{est.estimate_value.toFixed(2)}</p>
                  )}
                </div>
              </div>
            ))}
            {estimates.length === 0 && (
              <p className="text-center text-foreground-muted py-8">No estimate requests yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RepairerPartsTab({ parts, bodyshopId, bodyshopName }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="neomorph p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Parts Support Requests</h3>
          <button
            onClick={() => setShowForm(true)}
            className="neomorph-flat px-4 py-2 text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20"
          >
            + Request Parts Support
          </button>
        </div>

        {showForm ? (
          <RepairerPartsForm 
            bodyshopId={bodyshopId} 
            bodyshopName={bodyshopName}
            onClose={() => setShowForm(false)}
            onSuccess={() => setShowForm(false)}
          />
        ) : (
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
              <p className="text-center text-foreground-muted py-8">No parts requests yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RepairerProductsTab() {
  const products = [
    {
      id: 1,
      name: 'ARTURA Estimating Services',
      description: 'Professional vehicle damage assessment and estimation services using industry-leading technology.',
      icon: Calculator,
      color: 'blue',
      features: ['Audatex & GT Estimate', 'Fast turnaround', 'Competitive rates'],
    },
    {
      id: 2,
      name: 'Parts Sourcing',
      description: 'Access our network of trusted suppliers for OEM, aftermarket, and recycled parts.',
      icon: Package,
      color: 'green',
      features: ['OEM & Aftermarket', 'Recycled parts', 'Competitive pricing'],
    },
    {
      id: 3,
      name: 'Engineering Reports',
      description: 'Expert engineering inspections and reports for complex claims and disputes.',
      icon: FileText,
      color: 'purple',
      features: ['Pre-repair inspections', 'Dispute resolution', 'Expert witness'],
    },
    {
      id: 4,
      name: 'Claims Management',
      description: 'Let us handle the paperwork while you focus on repairs.',
      icon: TrendingUp,
      color: 'orange',
      features: ['End-to-end management', 'Insurer liaison', 'Authority chasing'],
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="space-y-4">
      <div className="neomorph p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">ARTURA Products & Services</h2>
        <p className="text-foreground-muted">
          Explore our range of services designed to help your business grow
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map(product => (
          <div key={product.id} className="neomorph p-6 hover:shadow-lg transition-all">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl ${colorClasses[product.color]} flex items-center justify-center flex-shrink-0`}>
                <product.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2">{product.name}</h3>
                <p className="text-sm text-foreground-muted mb-4">{product.description}</p>
                <ul className="space-y-1">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="mt-4 neomorph-flat px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10">
                  Learn More →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="neomorph p-6 text-center bg-accent/5">
        <h3 className="font-bold text-lg mb-2">Interested in partnering with ARTURA?</h3>
        <p className="text-foreground-muted mb-4">
          Contact us to discuss how we can support your business
        </p>
        <button className="neomorph-flat px-6 py-3 font-medium bg-accent text-accent-foreground">
          Contact Us
        </button>
      </div>
    </div>
  );
}