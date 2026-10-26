import React, { useState } from 'react';
import { fmtGBP } from '@/components/shared/creditRepairRates';
import {
  buildTrackerMetaPatch,
  referrerFixedFee,
  repairNet,
  repairVat,
  repairerReferralApplies,
} from '@/components/shared/invoiceChecklist';
import { excessMode } from '@/components/shared/excessState';
import FigureGroup from '@/components/financials/FigureGroup';
import { figureSourceNote } from './figuresCheck';

const VAT_STATUSES = ['VAT Registered', 'Non-VAT', 'Unknown'];

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
const cap = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);
const source = (claim, key) => cap(figureSourceNote(claim, key));

/**
 * The figures that drive a standard claim's invoices, as titled groups of rows:
 * Repair, Customer, the referrer's fee and the repairer's referral. Each group is
 * changed as a whole — one Edit in its heading, one Save — and only the groups this
 * claim's type and set-up actually needs appear.
 */
export default function StandardJobFigures({ claim, ctx, missing, onChange, onTrackerChange, editingKey, setEditingKey }) {
  const missingKeys = missing.map((m) => m.key);
  const isMissing = (key) => missingKeys.includes(key);
  const net = repairNet(claim);
  const vat = repairVat(claim);
  const cost = num(claim.final_repair_cost) || 0;
  // A fixed fee agreed with the referrer takes the place of their percentage while it
  // is set; clearing it hands the invoice back to the percentage.
  const referrerFeeGbp = referrerFixedFee(claim);
  const referrerPercent = num(claim.percent_to_referrer) || 0;
  const repairerFeeGbp = num(claim.referral_fee_repairer_gbp) || 0;

  // Which of a fee's two forms its row is showing. Left alone the row follows what
  // the claim holds; the small link on the row switches it, and opens the group so
  // the fee can be typed straight away.
  const [referrerForm, setReferrerForm] = useState(null);
  const [repairerForm, setRepairerForm] = useState(null);
  const referrerShowsFixed = (referrerForm ?? (referrerFeeGbp > 0 ? 'fixed' : 'percent')) === 'fixed';
  const repairerShowsFixed = (repairerForm ?? (repairerFeeGbp > 0 ? 'fixed' : 'percent')) === 'fixed';

  const group = (key) => ({
    editing: editingKey === key,
    onEdit: () => setEditingKey(key),
    onDone: () => setEditingKey(null),
  });
  const openWith = (setForm, form, key) => { setForm(form); setEditingKey(key); };

  /* Repair — what the job comes to. */
  const repairRows = [{
    key: 'final_repair_cost',
    label: 'Final repair cost',
    type: 'number',
    value: cost > 0 ? claim.final_repair_cost : null,
    display: cost > 0 ? fmtGBP(cost) : undefined,
    note: cost > 0 ? `ex VAT ${fmtGBP(net)} · VAT ${fmtGBP(vat)}` : undefined,
    caption: source(claim, 'final_repair_cost') || 'The whole repair, inc VAT',
    missing: isMissing('final_repair_cost'),
  }];

  /* Customer — the two figures the VAT & excess invoices are worked out from. */
  const excess = excessMode(claim);
  const excessValue = num(claim.policy_excess);
  const customerRows = [];
  if (!ctx.creditRepair) {
    customerRows.push({
      key: 'client_vat_status',
      label: 'VAT status',
      options: VAT_STATUSES,
      value: claim.client_vat_status || '',
      caption: source(claim, 'client_vat_status') || 'Sets the VAT billed on the VAT & excess invoices',
      missing: isMissing('client_vat_status'),
    });
  }
  if (ctx.vatExcess) {
    customerRows.push(excess === 'tbc' ? {
      key: 'policy_excess',
      label: 'Policy excess',
      editable: false,
      display: 'TBC on authority',
      caption: 'Still to be confirmed — not £0. The VAT & excess invoices wait for the Final Authority, which fills it in.',
    } : {
      key: 'policy_excess',
      label: 'Policy excess',
      type: 'number',
      value: excessValue,
      display: excess === 'waived' ? 'Waived' : (excessValue === null ? undefined : fmtGBP(excessValue)),
      caption: excess === 'waived' ? 'No excess payable — treated as £0' : source(claim, 'policy_excess'),
      missing: isMissing('policy_excess'),
    });
  }

  /* The referrer's fee: the % or a fixed fee agreed for this job, plus their VAT
     status, which decides whether their invoice to us carries VAT. */
  const referrerRows = [];
  if (ctx.hasReferrer) {
    referrerRows.push(referrerShowsFixed ? {
      key: 'referrer_fee_gbp',
      label: 'Fee',
      type: 'number',
      value: referrerFeeGbp || null,
      display: referrerFeeGbp > 0 ? fmtGBP(referrerFeeGbp) : undefined,
      caption: referrerPercent > 0
        ? `Fixed fee, used instead of the agreed ${referrerPercent}%`
        : 'A fixed fee agreed with them for this job',
      missing: isMissing('percent_to_referrer') && referrerPercent <= 0,
      link: {
        label: 'Use the % instead',
        onClick: () => openWith(setReferrerForm, 'percent', 'referrer'),
      },
    } : {
      key: 'percent_to_referrer',
      label: 'Fee',
      type: 'number',
      value: claim.percent_to_referrer,
      display: referrerPercent > 0 ? `${referrerPercent}%` : undefined,
      caption: 'Charged on the repair cost ex VAT',
      missing: isMissing('percent_to_referrer') && referrerFeeGbp <= 0,
      link: {
        label: 'Add a fixed fee',
        onClick: () => openWith(setReferrerForm, 'fixed', 'referrer'),
      },
    });
    referrerRows.push({
      key: 'referrer_vat_registered',
      label: 'VAT registered',
      editable: false,
      display: claim.referrer_vat_registered === false ? 'No' : 'Yes',
      caption: claim.referrer_vat_registered === false
        ? 'Their invoice to us is the fee alone'
        : 'Their invoice to us carries VAT',
    });
  }

  /* The repairer's referral fee — the same two forms, on the repair they refer. */
  const repairerRows = [];
  if (!ctx.totalLoss && repairerReferralApplies(claim, ctx)) {
    repairerRows.push(repairerShowsFixed ? {
      key: 'referral_fee_repairer_gbp',
      label: 'Fee',
      type: 'number',
      value: num(claim.referral_fee_repairer_gbp),
      display: repairerFeeGbp > 0 ? fmtGBP(repairerFeeGbp) : undefined,
      caption: num(claim.referral_fee_repairer) > 0
        ? `Fixed fee, used instead of the agreed ${num(claim.referral_fee_repairer)}%`
        : 'A fixed fee agreed with them for this job',
      missing: isMissing('referral_fee') && !claim.referral_fee_repairer,
      link: {
        label: 'Use the % instead',
        onClick: () => openWith(setRepairerForm, 'percent', 'repairer_referral'),
      },
    } : {
      key: 'referral_fee_repairer',
      label: 'Fee',
      type: 'number',
      value: claim.referral_fee_repairer,
      display: num(claim.referral_fee_repairer) > 0 ? `${num(claim.referral_fee_repairer)}%` : undefined,
      caption: 'Charged on the repair cost ex VAT',
      missing: isMissing('referral_fee') && !repairerFeeGbp,
      link: {
        label: 'Add a fixed fee',
        onClick: () => openWith(setRepairerForm, 'fixed', 'repairer_referral'),
      },
    });
  }

  return (
    <>
      {!ctx.totalLoss && (
        <FigureGroup
          title="Repair"
          rows={repairRows}
          {...group('repair')}
          onSave={({ final_repair_cost }) => {
            const n = num(final_repair_cost);
            onChange(
              { final_repair_cost: n },
              `Final repair cost ${n === null || n === 0 ? 'cleared' : `set to ${fmtGBP(n)}`}`
            );
          }}
        />
      )}

      {customerRows.length > 0 && (
        <FigureGroup
          title="Customer"
          rows={customerRows}
          {...group('customer')}
          onSave={(changes) => {
            const patch = {};
            const notes = [];
            if (changes.client_vat_status !== undefined) {
              patch.client_vat_status = changes.client_vat_status || null;
              notes.push(`Customer VAT status set to ${changes.client_vat_status || 'not set'}`);
            }
            if (changes.policy_excess !== undefined) {
              const n = num(changes.policy_excess);
              patch.policy_excess = n;
              notes.push(`Policy excess set to ${fmtGBP(n || 0)}`);
            }
            onChange(patch, notes.join('; '));
          }}
        />
      )}

      {referrerRows.length > 0 && (
        <FigureGroup
          title={`Referrer – ${claim.referrer || 'referrer'}`}
          rows={referrerRows}
          {...group('referrer')}
          onSave={(changes) => {
            if (changes.percent_to_referrer !== undefined) {
              onChange(
                { percent_to_referrer: num(changes.percent_to_referrer) },
                `Referrer fee set to ${num(changes.percent_to_referrer) || 0}%`
              );
            }
            if (changes.referrer_fee_gbp !== undefined) {
              const n = num(changes.referrer_fee_gbp);
              setReferrerForm(null);
              onTrackerChange(
                buildTrackerMetaPatch(claim, { referrer_fee_gbp: n }),
                n === null || n === 0
                  ? 'Fixed referrer fee cleared — the agreed % is used again'
                  : `Fixed referrer fee set to ${fmtGBP(n)} — used ahead of the %`
              );
            }
          }}
        />
      )}

      {repairerRows.length > 0 && (
        <FigureGroup
          title={`Repairer referral – ${claim.bodyshop || 'repairer'}`}
          rows={repairerRows}
          {...group('repairer_referral')}
          onSave={(changes) => {
            const patch = {};
            const notes = [];
            if (changes.referral_fee_repairer !== undefined) {
              patch.referral_fee_repairer = num(changes.referral_fee_repairer);
              notes.push(`Repairer referral fee set to ${num(changes.referral_fee_repairer) || 0}%`);
            }
            if (changes.referral_fee_repairer_gbp !== undefined) {
              const n = num(changes.referral_fee_repairer_gbp);
              patch.referral_fee_repairer_gbp = n;
              notes.push(`Fixed repairer referral fee set to ${fmtGBP(n || 0)}`);
              setRepairerForm(null);
            }
            onChange(patch, notes.join('; '));
          }}
        />
      )}
    </>
  );
}