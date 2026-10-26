import React from 'react';
import { ChevronLeft } from 'lucide-react';
import FinancialsSidebar from './FinancialsSidebar';
import StatusBadge from './StatusBadge';
import { MacPrimaryButton } from './MacButtons';

/**
 * The Financials window: a source list down the left, the selected item's content
 * on the right, and one slim toolbar carrying the job's status and the single next
 * thing to do. On a phone the source list is the first screen; tapping a step
 * pushes over it, with the way back in the toolbar.
 */
export default function FinancialsShell({
  sidebarItems, selected, onSelect, statusLabel, statusTone, waitingLine,
  nextLabel, onNext, isMobile, detailOpen, onBack, sidebarFooter, overlay, children,
}) {
  const showSidebar = !isMobile || !detailOpen;
  const showContent = !isMobile || detailOpen;

  return (
    <div className="mac-scope rounded-[10px] border border-mac-line bg-mac-group">
      <div className="flex min-h-0 flex-col md:min-h-[560px] md:flex-row">
        {showSidebar && (
          <FinancialsSidebar items={sidebarItems} selected={selected} onSelect={onSelect} footer={sidebarFooter} />
        )}

        {showContent && (
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 border-b border-mac-line px-3 py-2">
              {isMobile && detailOpen && (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex h-7 items-center gap-0.5 pr-1 text-[13px] text-mac-accent"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.5} /> Steps
                </button>
              )}
              <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
              {waitingLine && <span className="min-w-0 flex-1 truncate text-[11px] text-mac-muted">{waitingLine}</span>}
              <span className="ml-auto" />
              {nextLabel && <MacPrimaryButton onClick={onNext}>{nextLabel}</MacPrimaryButton>}
            </div>

            {/* The content reads at a comfortable width whatever the window is:
                centred, and never stretched across a wide screen. */}
            <div className="min-h-0 flex-1 p-4">
              <div className="mx-auto w-full max-w-[760px]">{children}</div>
            </div>
          </div>
        )}
      </div>
      {overlay}
    </div>
  );
}