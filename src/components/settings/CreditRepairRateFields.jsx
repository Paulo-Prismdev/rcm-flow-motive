import React from 'react';
import { Input } from '@/components/ui/input';
import { Percent } from 'lucide-react';
import { COMMISSION_BASES, HIRE_CATEGORIES, hireFeeField } from '@/components/shared/creditRepairRates';

const SELECT_CLASS = 'neomorph-inset w-full h-11 lg:h-9 px-3 rounded-xl text-sm bg-transparent border border-border';

/**
 * The rates we have agreed with one credit repair partner: an upfront hire fee
 * for each hire category, plus the commission we invoice them for and whether
 * that commission is worked out on the net or gross final repair cost.
 */
export default function CreditRepairRateFields({ formData, set }) {
  return (
    <div className="rounded-lg border border-purple-200 dark:border-purple-800/60 bg-purple-50/40 dark:bg-purple-900/10 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Percent className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300">Our Agreed Rates</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        What we invoice this partner for. These are copied onto a claim when its hire category is set, so changing them here never moves a claim already under way.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {HIRE_CATEGORIES.map((category) => {
          const field = hireFeeField(category);
          return (
            <div key={category}>
              <label className="block text-xs text-muted-foreground mb-1">{category} fee (£)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData[field] ?? ''}
                onChange={(e) => set(field, e.target.value)}
                className="neomorph-inset"
              />
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Commission (%)</label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.commission_percent ?? ''}
            onChange={(e) => set('commission_percent', e.target.value)}
            className="neomorph-inset"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Commission calculated on</label>
          <select
            className={SELECT_CLASS}
            value={formData.commission_basis || ''}
            onChange={(e) => set('commission_basis', e.target.value)}
          >
            <option value="">Not set</option>
            {COMMISSION_BASES.map((basis) => (
              <option key={basis} value={basis}>{basis}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}