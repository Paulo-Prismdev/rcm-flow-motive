import React, { Suspense, lazy, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import PageLoader from '@/components/PageLoader';

const PAGE_MAP = {
  RepairerDirectory: { title: 'Repairer Directory', component: lazy(() => import('@/pages/RepairerDirectory')) },
  InsurerDirectory: { title: 'Insurer Directory', component: lazy(() => import('@/pages/InsurerDirectory')) },
  CreditRepairDirectory: { title: 'Credit Repair Companies', component: lazy(() => import('@/pages/CreditRepairDirectory')) },
  ClientDirectory: { title: 'Clients & Third Parties', component: lazy(() => import('@/pages/ClientDirectory')) },
  SupplierManagement: { title: 'Suppliers', component: lazy(() => import('@/pages/SupplierManagement')) },
  CompanyManagement: { title: 'Referrers', component: lazy(() => import('@/pages/CompanyManagement')) },
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
        // A window opened from inside this one closes first.
        if (document.querySelector('[data-overlay-dismiss], [role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) return;
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
        className="fixed inset-0 z-workspace fm-scrim"
        onClick={() => {
          if (document.querySelector('[data-custom-portal-modal="true"]')) return;
          onClose();
        }}
      />
      {/* The workspace window: a whole area opened over the page, in glass. */}
      <div role="dialog" aria-modal="true" aria-label={config?.title} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-workspace w-[95vw] h-[92vh] max-h-[92vh] fm-glass-window rounded-2xl text-foreground flex flex-col overflow-hidden max-md:w-screen max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:rounded-none">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0">
          <button
            onClick={() => {
              if (document.querySelector('[data-custom-portal-modal="true"]')) return;
              onClose();
            }}
            aria-label={`Close ${config?.title || ''}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-base font-semibold text-foreground">{config?.title}</h2>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
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