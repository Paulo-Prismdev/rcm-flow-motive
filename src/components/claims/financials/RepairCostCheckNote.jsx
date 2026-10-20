import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fmtGBP } from '@/components/shared/creditRepairRates';

/**
 * The flag left behind when a final repair cost that came from an invoice copy
 * outlives the copy itself: the figure is never moved on its own, so it stands
 * and waits for someone to check it against the replacement.
 */
export default function RepairCostCheckNote({ check, onChecked }) {
  if (!check) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-700 dark:bg-amber-900/20">
      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="min-w-[200px] flex-1 text-[11px] text-amber-800 dark:text-amber-200">
        {check.reason}. The final repair cost of {fmtGBP(check.amount)} was read from it and has been
        left as it is — check it{check.by ? ` (flagged by ${check.by})` : ''}.
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onChecked}>
        <Check className="w-3.5 h-3.5" /> Mark as checked
      </Button>
    </div>
  );
}