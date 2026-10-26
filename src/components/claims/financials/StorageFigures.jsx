import React from 'react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import {
  salvageAdminCharges,
  salvageStorageCharge,
  storageFeePercent,
} from '@/components/shared/invoiceChecklist';
import FigureGroup from '@/components/financials/FigureGroup';

/**
 * What a total loss job stands on in place of a repair cost: the storage charge and
 * the admin charges read off the Salvage Agent Invoice, kept apart — only the storage
 * is shared — and our share of it, which is the percentage the Storage Fee Invoice
 * Out is worked out at. Our share is set in Settings and can be overridden here.
 */
export default function StorageFigures({ claim, defaultPercent, onTrackerChange, editingKey, setEditingKey }) {
  const storage = salvageStorageCharge(claim);
  const admin = salvageAdminCharges(claim);
  const percent = storageFeePercent(claim);
  const overridden = claim?.invoice_tracker?.storage_fee_percent != null;

  const rows = [
    {
      key: 'storage_charge',
      label: 'Storage charge ex VAT',
      editable: false,
      display: storage === null ? 'Not read yet' : fmtGBP(storage),
      caption: storage === null
        ? 'Read off the Salvage Agent Invoice — upload it and the figure is read from it'
        : 'Read off the Salvage Agent Invoice — the figure our invoice is shared from',
    },
    {
      key: 'admin_charges',
      label: 'Admin charges',
      editable: false,
      display: admin === null ? 'None read' : fmtGBP(admin),
      caption: "The salvage agent's own charges — kept apart, never shared with them",
    },
    {
      key: 'storage_fee_percent',
      label: 'Our share of the storage',
      type: 'number',
      value: percent,
      display: `${percent}%`,
      caption: `${overridden ? 'Set on this claim' : `From Settings (${defaultPercent}%)`} — charged on the storage charge ex VAT, plus VAT`,
      link: overridden ? {
        label: 'Use the Settings figure',
        onClick: () => onTrackerChange(
          { storage_fee_percent: null },
          'Storage share set back to the Settings figure'
        ),
      } : null,
    },
  ];

  return (
    <FigureGroup
      title="Storage"
      rows={rows}
      editing={editingKey === 'storage'}
      onEdit={() => setEditingKey('storage')}
      onDone={() => setEditingKey(null)}
      onSave={({ storage_fee_percent }) => {
        const n = Number(storage_fee_percent);
        onTrackerChange(
          { storage_fee_percent: storage_fee_percent === '' || !Number.isFinite(n) ? null : n },
          storage_fee_percent === '' ? 'Storage share set back to the Settings figure' : `Storage share set to ${n}% on this claim`
        );
      }}
    />
  );
}