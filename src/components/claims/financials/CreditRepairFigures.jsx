import React, { useEffect, useState } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import FigureField from './FigureField';
import {
  COMMISSION_BASES,
  HIRE_CATEGORIES,
  buildLockedRates,
  claimLockedRates,
  creditRepairCommission,
  creditRepairHireFee,
  fmtGBP,
  missingPartnerRates,
} from '@/components/shared/creditRepairRates';

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

/**
 * A credit repair claim's job figures: the hire category (which locks the
 * partner's agreed rates onto the claim) and, where they have been adjusted, the
 * hire fee, commission % and commission basis the invoices are worked out from.
 */
export default function CreditRepairFigures({ claim, missing, onChange }) {
  const [company, setCompany] = useState(null);
  const missingKeys = missing.map((m) => m.key);
  const isMissing = (key) => missingKeys.includes(key);

  useEffect(() => {
    if (!claim.credit_repair_company_id) { setCompany(null); return undefined; }
    let cancelled = false;
    base44.entities.CreditRepairCompany.get(claim.credit_repair_company_id)
      .then((record) => { if (!cancelled) setCompany(record); })
      .catch(() => { if (!cancelled) setCompany(null); });
    return () => { cancelled = true; };
  }, [claim.credit_repair_company_id]);

  const rates = claimLockedRates(claim);
  const locked = claim.credit_repair_rates_locked || {};
  const hireFee = creditRepairHireFee(claim);
  const commission = creditRepairCommission(claim);
  const partnerMissing = company ? missingPartnerRates(company) : [];

  const setCategory = (category) => {
    if (!category) {
      onChange(
        { hire_category: '', credit_repair_rates_locked: null, credit_repair_rates_overridden: false },
        'Hire category cleared'
      );
      return;
    }
    const next = company ? buildLockedRates(company, category) : null;
    onChange(
      {
        hire_category: category,
        ...(next ? { credit_repair_rates_locked: next, credit_repair_rates_overridden: false } : {}),
      },
      `Hire category set to ${category}${next ? " — partner's rates locked onto this claim" : ''}`
    );
  };

  const setRate = (field, raw) => {
    const next = {
      locked_at: locked.locked_at || new Date().toISOString(),
      ...locked,
      [field]: num(raw),
    };
    onChange(
      { credit_repair_rates_locked: next, credit_repair_rates_overridden: true },
      `Credit repair ${field.replace(/_/g, ' ')} adjusted on this claim`
    );
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 items-start">
        <FigureField
          label="Hire Category"
          options={HIRE_CATEGORIES}
          value={claim.hire_category || ''}
          missing={isMissing('hire_category')}
          hint={company?.name || claim.credit_repair_company_name || undefined}
          onCommit={setCategory}
        />
        <FigureField
          label="Hire Fee (£)"
          type="number"
          value={locked.hire_fee}
          missing={isMissing('hire_fee')}
          hint="We invoice the partner this upfront"
          onCommit={(v) => setRate('hire_fee', v)}
        />
        <FigureField
          label="Commission %"
          type="number"
          value={locked.commission_percent}
          missing={isMissing('commission_percent')}
          onCommit={(v) => setRate('commission_percent', v)}
        />
        <FigureField
          label="Commission Calculated On"
          options={COMMISSION_BASES}
          value={locked.commission_basis || ''}
          missing={isMissing('commission_basis')}
          onCommit={(v) => setRate('commission_basis', v)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Upfront Hire Fee</p>
          <p className="text-xs font-bold tabular-nums">{hireFee.awaiting ? '—' : fmtGBP(hireFee.amount)}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Repair Commission</p>
          <p className="text-xs font-bold tabular-nums">{commission.awaiting ? '—' : fmtGBP(commission.amount)}</p>
        </div>
        {rates?.overridden && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
            <Lock className="w-2.5 h-2.5" /> Adjusted on this claim
          </span>
        )}
        {rates && !rates.overridden && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Lock className="w-2.5 h-2.5" /> Partner's agreed rates, locked to this claim
          </span>
        )}
      </div>

      {partnerMissing.length > 0 && (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          <span>{company?.name}'s rates aren't fully set ({partnerMissing.join(', ')}). Add them in the credit repair directory, or enter them here.</span>
        </p>
      )}
    </div>
  );
}