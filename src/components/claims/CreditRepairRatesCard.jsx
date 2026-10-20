import React from 'react';
import { Percent, Lock } from 'lucide-react';
import {
  claimLockedRates,
  creditRepairHireFee,
  creditRepairCommission,
  fmtGBP,
} from '@/components/shared/creditRepairRates';

/**
 * The credit repair rates locked onto this claim — the upfront hire fee from the
 * hire category and the commission we invoice the credit repair company for.
 * Flagged clearly when staff have adjusted them for this individual claim.
 */
export default function CreditRepairRatesCard({ claim }) {
  const rates = claimLockedRates(claim);

  if (!rates) {
    return (
      <div className="mt-4 rounded-[10px] border border-dashed border-border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          No rates locked yet — set the hire category to bring across this partner's agreed rates.
        </p>
      </div>
    );
  }

  const hireFee = creditRepairHireFee(claim);
  const commission = creditRepairCommission(claim);

  return (
    <div className="mt-4 rounded-[10px] border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-900/10 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Percent className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
          Credit Repair Rates
        </h4>
        {rates.overridden && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
            <Lock className="w-2.5 h-2.5" /> Adjusted on this claim
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-lg bg-card/60 border border-border p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Upfront Hire Fee</p>
          <p className="text-sm font-bold tabular-nums">{hireFee.awaiting ? '—' : fmtGBP(hireFee.amount)}</p>
          <p className="text-[10px] text-muted-foreground">{hireFee.hint}</p>
        </div>
        <div className="rounded-lg bg-card/60 border border-border p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Repair Commission</p>
          <p className="text-sm font-bold tabular-nums">{commission.awaiting ? '—' : fmtGBP(commission.amount)}</p>
          <p className="text-[10px] text-muted-foreground">{commission.hint}</p>
        </div>
      </div>
    </div>
  );
}