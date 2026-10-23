import React from 'react';
import { Clock } from 'lucide-react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import {
  buildTrackerMetaPatch,
  referrerFixedFee,
  repairNet,
  repairVat,
  repairerReferralApplies,
} from '@/components/shared/invoiceChecklist';
import { excessMode } from '@/components/shared/excessState';
import FigureField from './FigureField';
import SecondReferrerToggle from './SecondReferrerToggle';

const VAT_STATUSES = ['VAT Registered', 'Non-VAT', 'Unknown'];

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

/**
 * The figures that drive a standard claim's invoices. Each is read-only until
 * its pencil is clicked, and only one can be edited at a time. Only the figures
 * this claim's type and set-up actually needs appear, and only those are flagged
 * when they are missing. The second referrer toggle sits with the referrer fee
 * it belongs to.
 */
export default function StandardJobFigures({ claim, ctx, missing, onChange, onTrackerChange, editingKey, setEditingKey }) {
  const missingKeys = missing.map((m) => m.key);
  const isMissing = (key) => missingKeys.includes(key);
  const net = repairNet(claim);
  const vat = repairVat(claim);
  // A fixed fee agreed with the referrer takes the place of their percentage while it
  // is set; clearing it hands the invoice back to the percentage.
  const referrerFeeGbp = referrerFixedFee(claim);
  const referrerPercent = num(claim.percent_to_referrer) || 0;

  const fieldEdit = (key) => ({
    editing: editingKey === key,
    onEdit: () => setEditingKey(key),
    onDone: () => setEditingKey(null),
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 items-start m-keep-2">
      {!ctx.totalLoss && (
        <FigureField
          {...fieldEdit('final_repair_cost')}
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
      )}

      {!ctx.creditRepair && (
        <FigureField
          {...fieldEdit('client_vat_status')}
          label="Customer VAT Status"
          options={VAT_STATUSES}
          value={claim.client_vat_status || ''}
          missing={isMissing('client_vat_status')}
          hint={ctx.vatExcess ? 'Sets the VAT content billed on the VAT & Excess invoices' : undefined}
          onCommit={(v) => onChange({ client_vat_status: v || null }, `Customer VAT status set to ${v || 'not set'}`)}
        />
      )}

      {ctx.vatExcess && (
        excessMode(claim) === 'tbc' ? (
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-0.5 text-muted-foreground">
              Policy Excess (£)
            </label>
            <div className="flex items-center gap-1.5 min-h-8 md:h-8 rounded-md border border-dashed border-border bg-muted/30 px-2">
              <Clock className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">TBC on authority</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Still to be confirmed — not £0. The VAT &amp; excess invoices wait for the Final Authority, which fills the figure in.
            </p>
          </div>
        ) : (
          <FigureField
            {...fieldEdit('policy_excess')}
            label="Policy Excess (£)"
            type="number"
            value={claim.policy_excess}
            display={excessMode(claim) === 'waived' ? 'Waived' : undefined}
            missing={isMissing('policy_excess')}
            hint={excessMode(claim) === 'waived' ? 'No excess payable — treated as £0' : undefined}
            onCommit={(v) => onChange({ policy_excess: num(v) }, `Policy excess set to ${fmtGBP(num(v) || 0)}`)}
          />
        )
      )}

      {ctx.hasReferrer && (
        <div className="space-y-1">
          <FigureField
            {...fieldEdit('percent_to_referrer')}
            label={`Referrer Fee % — ${claim.referrer}`}
            type="number"
            value={claim.percent_to_referrer}
            missing={isMissing('percent_to_referrer') && referrerFeeGbp <= 0}
            hint={referrerFeeGbp > 0
              ? `Overridden by the fixed fee of ${fmtGBP(referrerFeeGbp)}`
              : 'Charged on the repair cost ex VAT'}
            onCommit={(v) => onChange({ percent_to_referrer: num(v) }, `Referrer fee set to ${num(v) || 0}%`)}
          />
          <FigureField
            {...fieldEdit('referrer_fee_gbp')}
            label="Referrer Fee (£ fixed)"
            type="number"
            value={referrerFeeGbp || null}
            missing={isMissing('percent_to_referrer') && referrerPercent <= 0}
            hint={referrerFeeGbp > 0
              ? `Fixed fee ${fmtGBP(referrerFeeGbp)} — overrides ${referrerPercent > 0 ? `${referrerPercent}%` : 'the %'}`
              : 'Optional — set instead of a %'}
            onCommit={(v) => {
              const n = num(v);
              onTrackerChange(
                buildTrackerMetaPatch(claim, { referrer_fee_gbp: n }),
                n === null || n === 0
                  ? 'Fixed referrer fee cleared — the agreed % is used again'
                  : `Fixed referrer fee set to ${fmtGBP(n)} — used ahead of the %`
              );
            }}
          />
          <SecondReferrerToggle
            claim={claim}
            missing={missing}
            onTrackerChange={onTrackerChange}
            editingKey={editingKey}
            setEditingKey={setEditingKey}
          />
        </div>
      )}

      {/* On a total loss the repairer is invoiced for our share of the storage
          instead, so there is no referral fee to set. */}
      {!ctx.totalLoss && repairerReferralApplies(claim, ctx) && (
        <>
          <FigureField
            {...fieldEdit('referral_fee_repairer')}
            label={`Repairer Referral Fee % — ${claim.bodyshop || 'repairer'}`}
            type="number"
            value={claim.referral_fee_repairer}
            missing={isMissing('referral_fee') && !claim.referral_fee_repairer_gbp}
            hint="Charged on the repair cost ex VAT"
            onCommit={(v) => onChange({ referral_fee_repairer: num(v) }, `Repairer referral fee set to ${num(v) || 0}%`)}
          />
          <FigureField
            {...fieldEdit('referral_fee_repairer_gbp')}
            label="Repairer Referral Fee (£ fixed)"
            type="number"
            value={claim.referral_fee_repairer_gbp}
            missing={isMissing('referral_fee') && !claim.referral_fee_repairer}
            hint={claim.referral_fee_repairer_gbp > 0 ? 'Fixed fee used ahead of the %' : 'Optional — set instead of a %'}
            onCommit={(v) => onChange({ referral_fee_repairer_gbp: num(v) }, `Fixed repairer referral fee set to ${fmtGBP(num(v) || 0)}`)}
          />
        </>
      )}
    </div>
  );
}