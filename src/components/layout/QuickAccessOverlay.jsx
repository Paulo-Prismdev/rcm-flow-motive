import React, { Suspense, lazy, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import PageLoader from '@/components/PageLoader';

const PAGE_MAP = {
  RepairerDirectory: { title: 'Repairer Directory', component: lazy(() => import('@/pages/RepairerDirectory')) },
  InsurerDirectory: { title: 'Insurer Directory', component: lazy(() => import('@/pages/InsurerDirectory')) },
  CreditRepairDirectory: { title: 'Credit Repair Companies', component: lazy(() => import('@/pages/CreditRepairDirectory')) },
  ClientDirectory: { title: 'Client Directory', component: lazy(() => import('@/pages/ClientDirectory')) },
  SupplierManagement: { title: 'Suppliers', component: lazy(() => import('@/pages/SupplierManagement')) },
  CompanyManagement: { title: 'Companies', component: lazy(() => import('@/pages/CompanyManagement')) },
  Settings: { title: 'Settings', component: lazy(() => import('@/pages/Settings')) },
  BodyshopMap: { title: 'Repairer Map', component: lazy(() => import('@/pages/BodyshopMap')) },
  Reports: { title: 'Reports', component: lazy(() => import('@/pages/Reports')) },
};

export default function QuickAccessOverlay({ pageName, onClose }) {
  const config = pageName ? PAGE_MAP[pageName] : null;
  const PageComponent = config?.component;

  // Close on Escape — but not while a custom modal is open on top
  useEffect(() => {
    if (!pageName) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (document.querySelector('[data-custom-portal-modal="true"]')) return;
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pageName, onClose]);

  if (!pageName) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm"
        onClick={() => {
          if (document.querySelector('[data-custom-portal-modal="true"]')) return;
          onClose();
        }}
      />
      {/* Content panel */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[10001] w-[95vw] h-[92vh] max-h-[92vh] bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0 bg-card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{config?.title}</h2>
          <button
            onClick={() => {
              if (document.querySelector('[data-custom-portal-modal="true"]')) return;
              onClose();
            }}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto min-h-0 bg-background">
          {PageComponent && (
            <Suspense fallback={<PageLoader />}>
              <PageComponent />
            </Suspense>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}