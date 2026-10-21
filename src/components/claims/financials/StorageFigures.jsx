import React from 'react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import {
  salvageAdminCharges,
  salvageStorageCharge,
  storageFeePercent,
} from '@/components/shared/invoiceChecklist';
import FigureField from './FigureField';

/**
 * The figures a total loss job stands on in place of a repair cost: the storage
 * charge and the admin charges read off the Salvage Agent Invoice, kept apart —
 * only the storage is shared — and our share of the storage, which is the
 * percentage the Storage Fee Invoice Out is worked out at. The share is set in
 * Settings and can be overridden on one claim.
 */
export default function StorageFigures({ claim, defaultPercent, onTrackerChange, editingKey, setEditingKey }) {
  const storage = salvageStorageCharge(claim);
  const admin = salvageAdminCharges(claim);
  const percent = storageFeePercent(claim);
  const overridden = claim?.invoice_tracker?.storage_fee_percent != null;

  const readOnly = (label, value, hint) => (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-0.5 text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center min-h-8 md:h-8 rounded-md border border-dashed border-border bg-muted/30 px-2">
        <span className="text-sm font-medium text-foreground tabular-nums">{value}</span>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Total loss — storage figures
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 items-start m-keep-2">
        {readOnly(
          'Storage charge ex VAT',
          storage === null ? 'Not read yet' : fmtGBP(storage),
          storage === null
            ? 'Read off the Salvage Agent Invoice — upload it and the figure is read from it'
            : 'Read off the Salvage Agent Invoice — this is the figure our invoice is shared from'
        )}
        {readOnly(
          'Admin charges',
          admin === null ? 'None read' : fmtGBP(admin),
          'The salvage agent\'s own charges — kept apart, never shared with them'
        )}
        <FigureField
          editing={editingKey === 'storage_fee_percent'}
          onEdit={() => setEditingKey('storage_fee_percent')}
          onDone={() => setEditingKey(null)}
          label="Our share of the storage charge (%)"
          type="number"
          value={percent}
          hint={`${overridden ? 'Set on this claim' : `From Settings (${defaultPercent}%)`} — charged on the storage charge ex VAT, plus VAT`}
          onCommit={(v) => {
            const n = Number(v);
            onTrackerChange(
              { storage_fee_percent: v === '' || !Number.isFinite(n) ? null : n },
              v === '' ? 'Storage share set back to the Settings figure' : `Storage share set to ${n}% on this claim`
            );
          }}
        />
      </div>
      {overridden && (
        <button
          type="button"
          onClick={() => onTrackerChange(
            { storage_fee_percent: null },
            'Storage share set back to the Settings figure'
          )}
          className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
        >
          Use the Settings figure
        </button>
      )}
    </div>
  );
}