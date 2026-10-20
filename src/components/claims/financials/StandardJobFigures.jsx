import React from 'react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import { repairNet, repairVat, repairerReferralApplies } from '@/components/shared/invoiceChecklist';
import FigureField from './FigureField';

const VAT_STATUSES = ['VAT Registered', 'Non-VAT', 'Unknown'];

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

/**
 * The figures that drive a standard claim's invoices, entered and edited in
 * place. Only the figures this claim's type and set-up actually needs appear,
 * and only those are flagged when they are missing.
 */
export default function StandardJobFigures({ claim, ctx, missing, onChange }) {
  const missingKeys = missing.map((m) => m.key);
  const isMissing = (key) => missingKeys.includes(key);
  const net = repairNet(claim);
  const vat = repairVat(claim);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <FigureField
          label="Final Repair Cost (£ inc VAT)"
          type="number"
          value={claim.final_repair_cost}
          missing={isMissing('final_repair_cost')}
          hint={claim.final_repair_cost > 0 ? `ex VAT ${fmtGBP(net)} · VAT ${fmtGBP(vat)}` : 'Drives every calculated invoice'}
          onCommit={(v) => {
            const n = num(v);
            onChange(
              { final_repair_cost: n },
              `Final repair cost ${n === null || n === 0 ? 'cleared' : `set to ${fmtGBP(n)}`}`
            );
          }}
        />

        {!ctx.creditRepair && (
          <FigureField
            label="Customer VAT Status"
            options={VAT_STATUSES}
            value={claim.client_vat_status || ''}
            missing={isMissing('client_vat_status')}
            hint={ctx.vatExcess ? 'Sets the VAT content billed on the VAT & Excess invoices' : undefined}
            onCommit={(v) => onChange({ client_vat_status: v || null }, `Customer VAT status set to ${v || 'not set'}`)}
          />
        )}

        {ctx.vatExcess && (
          <FigureField
            label="Policy Excess (£)"
            type="number"
            value={claim.policy_excess}
            missing={isMissing('policy_excess')}
            onCommit={(v) => onChange({ policy_excess: num(v) }, `Policy excess set to ${fmtGBP(num(v) || 0)}`)}
          />
        )}

        {ctx.hasReferrer && (
          <FigureField
            label={`Referrer Fee % — ${claim.referrer}`}
            type="number"
            value={claim.percent_to_referrer}
            missing={isMissing('percent_to_referrer')}
            hint="Charged on the repair cost ex VAT"
            onCommit={(v) => onChange({ percent_to_referrer: num(v) }, `Referrer fee set to ${num(v) || 0}%`)}
          />
        )}

        {repairerReferralApplies(claim, ctx) && (
          <>
            <FigureField
              label={`Repairer Referral Fee % — ${claim.bodyshop || 'repairer'}`}
              type="number"
              value={claim.referral_fee_repairer}
              missing={isMissing('referral_fee') && !claim.referral_fee_repairer_gbp}
              hint="Charged on the repair cost ex VAT"
              onCommit={(v) => onChange({ referral_fee_repairer: num(v) }, `Repairer referral fee set to ${num(v) || 0}%`)}
            />
            <FigureField
              label="Repairer Referral Fee (£ fixed)"
              type="number"
              value={claim.referral_fee_repairer_gbp}
              missing={isMissing('referral_fee') && !claim.referral_fee_repairer}
              hint={claim.referral_fee_repairer_gbp > 0 ? 'Fixed fee used ahead of the %' : 'Optional — set instead of a %'}
              onCommit={(v) => onChange({ referral_fee_repairer_gbp: num(v) }, `Fixed repairer referral fee set to ${fmtGBP(num(v) || 0)}`)}
            />
          </>
        )}

        <FigureField
          label="External Invoice Ref"
          value={claim.external_invoice_ref}
          onCommit={(v) => onChange({ external_invoice_ref: v || null }, 'External invoice reference updated')}
        />
      </div>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Invoice Notes</label>
        <textarea
          defaultValue={claim.invoice_notes || ''}
          onBlur={(e) => {
            if (e.target.value === (claim.invoice_notes || '')) return;
            onChange({ invoice_notes: e.target.value || null }, 'Invoice notes updated');
          }}
          rows={2}
          className="w-full px-3 py-2 rounded-md border border-border bg-transparent text-sm"
          placeholder="Anything accounts should know about these invoices"
        />
      </div>
    </div>
  );
}