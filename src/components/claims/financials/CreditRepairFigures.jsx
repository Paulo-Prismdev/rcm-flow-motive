import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import FigureGroup from '@/components/financials/FigureGroup';
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

const RATE_LABELS = {
  hire_fee: 'hire fee',
  commission_percent: 'commission %',
  commission_basis: 'commission basis',
};

const RATE_KEYS = ['hire_fee', 'commission_percent', 'commission_basis'];

const fmtRate = (field, v) => {
  if (v === null || v === undefined || v === '') return 'not set';
  if (field === 'hire_fee') return fmtGBP(Number(v));
  if (field === 'commission_percent') return `${v}%`;
  return String(v);
};

const money = (v) => (v === null || v === undefined || v === '' ? undefined : fmtGBP(Number(v)));

/**
 * A credit repair claim's job figures: the hire category (which locks the partner's
 * agreed rates onto the claim) and the hire fee, commission % and basis the invoices
 * are worked out from, with what those rates bill the partner underneath. The whole
 * group is changed in one go, so the rates are written together and never one over
 * the other.
 */
export default function CreditRepairFigures({ claim, missing, onChange, editingKey, setEditingKey }) {
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
  const partner = company?.name || claim.credit_repair_company_name || 'the credit repair partner';

  const rows = [
    {
      key: 'hire_category',
      label: 'Hire category',
      options: HIRE_CATEGORIES,
      value: claim.hire_category || '',
      caption: `Sets which of ${partner}'s agreed rates this job is locked to`,
      missing: isMissing('hire_category'),
    },
    {
      key: 'hire_fee',
      label: 'Hire fee',
      type: 'number',
      value: num(locked.hire_fee),
      display: money(locked.hire_fee),
      caption: "The partner's agreed rate, locked on this claim",
      missing: isMissing('hire_fee'),
    },
    {
      key: 'commission_percent',
      label: 'Commission %',
      type: 'number',
      value: num(locked.commission_percent),
      display: num(locked.commission_percent) === null ? undefined : `${num(locked.commission_percent)}%`,
      caption: "The partner's agreed rate, locked on this claim",
      missing: isMissing('commission_percent'),
    },
    {
      key: 'commission_basis',
      label: 'Commission basis',
      options: COMMISSION_BASES,
      value: locked.commission_basis || '',
      caption: 'What the commission is charged on, as agreed with the partner',
      missing: isMissing('commission_basis'),
    },
    {
      key: 'upfront_hire_fee',
      label: 'Upfront hire fee',
      editable: false,
      display: hireFee.awaiting ? '—' : fmtGBP(hireFee.amount),
      caption: 'What our hire fee invoice bills the partner',
    },
    {
      key: 'repair_commission',
      label: 'Repair commission',
      editable: false,
      display: commission.awaiting ? '—' : fmtGBP(commission.amount),
      caption: 'Charged on the final repair cost',
    },
  ];

  const footer = (
    <>
      {rates && (
        <p className="px-1 text-[11px] text-mac-muted">
          {rates.overridden
            ? 'Adjusted on this claim, against the rates agreed with the partner'
            : "The partner's agreed rates, locked to this claim"}
        </p>
      )}
      {partnerMissing.length > 0 && (
        <p className="flex items-start gap-1.5 px-1 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-px h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.8} />
          <span>
            {company?.name}'s rates aren't fully set ({partnerMissing.join(', ')}). Add them in the credit repair
            directory, or enter them here.
          </span>
        </p>
      )}
    </>
  );

  return (
    <FigureGroup
      title="Credit repair"
      rows={rows}
      editing={editingKey === 'credit_repair'}
      onEdit={() => setEditingKey('credit_repair')}
      onDone={() => setEditingKey(null)}
      footer={footer}
      onSave={(changes) => {
        const categoryGiven = changes.hire_category !== undefined;
        const nextCategory = categoryGiven ? (changes.hire_category || '') : (claim.hire_category || '');
        const categoryChanged = categoryGiven && nextCategory !== (claim.hire_category || '');
        const rateKeys = RATE_KEYS.filter((key) => changes[key] !== undefined);

        if (!categoryChanged && rateKeys.length === 0) return;

        // The category re-locks the partner's agreed rates onto the claim; a rate
        // changed by hand is written over the locked ones.
        const relocked = categoryChanged && nextCategory && company
          ? buildLockedRates(company, nextCategory)
          : null;
        const from = relocked || locked;
        const next = { locked_at: from.locked_at || new Date().toISOString(), ...from };
        const notes = [];
        rateKeys.forEach((field) => {
          next[field] = num(changes[field]);
          notes.push(`credit repair ${RATE_LABELS[field]} changed from ${fmtRate(field, from[field])} to ${fmtRate(field, num(changes[field]))}`);
        });

        const headline = categoryChanged
          ? `Hire category changed from ${claim.hire_category || 'not set'} to ${nextCategory || 'not set'}${relocked ? " — partner's rates locked onto this claim" : ''}`
          : '';

        const patch = {};
        if (categoryChanged) patch.hire_category = nextCategory;
        if (!nextCategory) {
          // No category: nothing of the partner's is locked to this claim.
          patch.credit_repair_rates_locked = null;
          patch.credit_repair_rates_overridden = false;
        } else if (relocked) {
          patch.credit_repair_rates_locked = next;
          patch.credit_repair_rates_overridden = rateKeys.length > 0;
        } else if (rateKeys.length > 0) {
          patch.credit_repair_rates_locked = next;
          patch.credit_repair_rates_overridden = true;
        }

        onChange(patch, [headline, ...notes].filter(Boolean).join('; ') || 'Credit repair figures updated');
      }}
    />
  );
}