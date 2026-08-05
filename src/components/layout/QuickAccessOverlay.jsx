import React, { Suspense, lazy } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PageLoader from '@/components/PageLoader';

const PAGE_MAP = {
  RepairerDirectory: { title: 'Repairer Directory', component: lazy(() => import('@/pages/RepairerDirectory')) },
  InsurerDirectory: { title: 'Insurer Directory', component: lazy(() => import('@/pages/InsurerDirectory')) },
  SupplierManagement: { title: 'Suppliers', component: lazy(() => import('@/pages/SupplierManagement')) },
  CompanyManagement: { title: 'Companies', component: lazy(() => import('@/pages/CompanyManagement')) },
  Settings: { title: 'Settings', component: lazy(() => import('@/pages/Settings')) },
  BodyshopMap: { title: 'Repairer Map', component: lazy(() => import('@/pages/BodyshopMap')) },
  Reports: { title: 'Reports', component: lazy(() => import('@/pages/Reports')) },
};

export default function QuickAccessOverlay({ pageName, onClose }) {
  const config = pageName ? PAGE_MAP[pageName] : null;
  const PageComponent = config?.component;

  return (
    <Dialog
      open={!!pageName}
      onOpenChange={(open) => {
        if (!open) {
          // Don't close the overlay while a custom (non-Radix) modal is open on top
          if (document.querySelector('[data-custom-portal-modal="true"]')) return;
          onClose();
        }
      }}
    >
      <DialogContent
        className="max-w-none w-[95vw] h-[92vh] max-h-[92vh] p-0 gap-0 flex flex-col overflow-hidden"
      >
        <div className="flex items-center px-4 py-2.5 border-b border-border flex-shrink-0 bg-card pr-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{config?.title}</h2>
        </div>
        <div className="flex-1 overflow-auto min-h-0 bg-background">
          {PageComponent && (
            <Suspense fallback={<PageLoader />}>
              <PageComponent />
            </Suspense>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}