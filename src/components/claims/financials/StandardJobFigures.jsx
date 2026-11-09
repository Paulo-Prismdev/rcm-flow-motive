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
import { NO_FEE_DISPLAY, NO_FEE_LABEL, feeState } from '@/components/shared/feeState';
import FigureGroup from '@/components/financials/FigureGroup';
import { ACG_FEE_PERCENT, acgFeePercent, referralPercentAfterAcg } from '@/components/shared/acgProcessing';
import {
  HIRE_SPLIT_PARTIES,
  buildHirePatch,
  hireChargeNet,
  hireInsurerNet,
  hireSetup,
} from '@/components/shared/hireCharge';
import { figureSourceNote } from './figuresCheck';

const VAT_STATUSES = ['VAT Registered', 'Non-VAT', 'Unknown'];

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
const cap = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);
const source = (claim, key) => cap(figureSourceNote(claim, key));

/** The line the claim's history carries for one change to the hire set-up. */
function hireDescription(changes, next) {
  const setup = hireSetup(next);
  const parts = [];
  if (changes.hire_invoiced !== undefined) {
    parts.push(changes.hire_invoiced === 'Yes' ? 'hire to be invoiced' : 'hire invoicing switched off');
  }
  if (changes.hire_day_rate !== undefined) {
    parts.push(`day rate ${setup.dayRate > 0 ? fmtGBP(setup.dayRate) : 'cleared'}`);
  }
  if (changes.hire_days !== undefined) {
    parts.push(`${setup.days > 0 ? setup.days : 'no'} days hired`);
  }
  if (changes.hire_split_party !== undefined) parts.push(`split with ${setup.splitParty}`);
  if (changes.hire_split_amount !== undefined) {
    parts.push(setup.splitAmount > 0
      ? `${setup.splitParty.toLowerCase()} share ${fmtGBP(setup.splitAmount)}`
      : 'split share cleared');
  }
  const charge = hireChargeNet(next);
  return `Hire — ${parts.join(', ')}${charge > 0 ? `; hire charge ${fmtGBP(charge)} ex VAT` : ''}`;
}

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
  // A fee is agreed, waived on this job, or still to be set — and a waived fee counts
  // as set, so it is never flagged as a figure somebody forgot.
  const referrerState = feeState(claim, 'referrer');
  const referrerWaived = referrerState === 'none';
  const repairerState = feeState(claim, 'repairer_referral');
  const repairerWaived = repairerState === 'none';

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

  /* Customer — the customer's VAT status and their policy excess. An excess is a fact
     of the policy, so it is shown on every job that carries one; where we also handle
     their VAT and excess it is what the VAT & excess invoices are worked out from. */
  const excess = excessMode(claim);
  const excessValue = num(claim.policy_excess);
  const excessApplies = !ctx.totalLoss && !ctx.creditRepair && !ctx.privatePaying;
  const customerRows = [];
  if (!ctx.creditRepair) {
    customerRows.push({
      key: 'client_vat_status',
      label: 'VAT status',
      options: VAT_STATUSES,
      value: claim.client_vat_status || '',
      caption: source(claim, 'client_vat_status')
        || (ctx.privatePaying
          ? 'For reference — we bill the whole repair on our own invoice to the customer'
          : 'Sets the VAT billed on the VAT & excess invoices'),
      missing: isMissing('client_vat_status'),
    });
  }
  if (excessApplies) {
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

  /* The referrer's fee: the % or a fixed fee agreed for this job, no fee at all, plus
     their VAT status, which decides whether their invoice to us carries VAT. */
  // "No fee on this job": a deliberate 0%, with any fixed fee cleared — recorded as the
  // figure it is, so the job reads as settled rather than as a fee still to be agreed.
  const referrerNoFee = () => {
    setReferrerForm(null);
    onTrackerChange(
      { percent_to_referrer: 0, ...buildTrackerMetaPatch(claim, { referrer_fee_gbp: null }) },
      `Referrer fee set to no fee on this job${referrerFeeGbp > 0 ? ` — the fixed fee of ${fmtGBP(referrerFeeGbp)} cleared` : ''}`
    );
  };
  const referrerRows = [];
  if (ctx.hasReferrer) {
    referrerRows.push(referrerWaived ? {
      key: 'percent_to_referrer',
      label: 'Fee',
      type: 'number',
      value: claim.percent_to_referrer,
      display: NO_FEE_DISPLAY,
      caption: 'No fee on this job — no referrer invoice to collect',
      link: {
        label: 'Add a fee',
        onClick: () => openWith(setReferrerForm, 'percent', 'referrer'),
      },
    } : referrerShowsFixed ? {
      key: 'referrer_fee_gbp',
      label: 'Fee',
      type: 'number',
      value: referrerFeeGbp || null,
      display: referrerFeeGbp > 0 ? fmtGBP(referrerFeeGbp) : undefined,
      caption: referrerPercent > 0
        ? `Fixed fee, used instead of the agreed ${referrerPercent}%`
        : 'A fixed fee agreed with them for this job',
      missing: referrerState === 'missing',
      links: [
        { label: 'Use the % instead', onClick: () => openWith(setReferrerForm, 'percent', 'referrer') },
        { label: NO_FEE_LABEL, onClick: referrerNoFee },
      ],
    } : {
      key: 'percent_to_referrer',
      label: 'Fee',
      type: 'number',
      value: claim.percent_to_referrer,
      display: referrerPercent > 0 ? `${referrerPercent}%` : undefined,
      caption: 'Charged on the repair cost ex VAT',
      missing: referrerState === 'missing',
      links: [
        { label: 'Add a fixed fee', onClick: () => openWith(setReferrerForm, 'fixed', 'referrer') },
        { label: NO_FEE_LABEL, onClick: referrerNoFee },
      ],
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

  /* The repairer's referral fee — the same three choices, on the repair they refer. */
  const repairerNoFee = () => {
    setRepairerForm(null);
    onChange(
      { referral_fee_repairer: 0, referral_fee_repairer_gbp: null },
      `Repairer referral fee set to no fee on this job${repairerFeeGbp > 0 ? ` — the fixed fee of ${fmtGBP(repairerFeeGbp)} cleared` : ''}`
    );
  };
  const repairerRows = [];
  if (!ctx.totalLoss && repairerReferralApplies(claim, ctx)) {
    repairerRows.push(repairerWaived ? {
      key: 'referral_fee_repairer',
      label: 'Fee',
      type: 'number',
      value: claim.referral_fee_repairer,
      display: NO_FEE_DISPLAY,
      caption: 'No fee on this job — no referral invoice to raise',
      link: {
        label: 'Add a fee',
        onClick: () => openWith(setRepairerForm, 'percent', 'repairer_referral'),
      },
    } : repairerShowsFixed ? {
      key: 'referral_fee_repairer_gbp',
      label: 'Fee',
      type: 'number',
      value: num(claim.referral_fee_repairer_gbp),
      display: repairerFeeGbp > 0 ? fmtGBP(repairerFeeGbp) : undefined,
      caption: num(claim.referral_fee_repairer) > 0
        ? `Fixed fee, used instead of the agreed ${num(claim.referral_fee_repairer)}%`
        : 'A fixed fee agreed with them for this job',
      missing: repairerState === 'missing',
      links: [
        { label: 'Use the % instead', onClick: () => openWith(setRepairerForm, 'percent', 'repairer_referral') },
        { label: NO_FEE_LABEL, onClick: repairerNoFee },
      ],
    } : {
      key: 'referral_fee_repairer',
      label: 'Fee',
      type: 'number',
      value: claim.referral_fee_repairer,
      display: num(claim.referral_fee_repairer) > 0 ? `${num(claim.referral_fee_repairer)}%` : undefined,
      caption: 'Charged on the repair cost ex VAT',
      missing: repairerState === 'missing',
      links: [
        { label: 'Add a fixed fee', onClick: () => openWith(setRepairerForm, 'fixed', 'repairer_referral') },
        { label: NO_FEE_LABEL, onClick: repairerNoFee },
      ],
    });
  }

  /* Hire — a courtesy vehicle arranged for the customer and invoiced to the insurer at
     the day rate agreed with them, over the days hired. Sometimes split with the client
     or the repairer: their share is invoiced to them, and the insurer is billed the rest.
     Ticking it puts the hire invoices into step 3. */
  const hire = hireSetup(claim);
  const hireCharge = hireChargeNet(claim);
  const hireRows = [];
  if (!ctx.totalLoss && !ctx.creditRepair && !ctx.privatePaying) {
    hireRows.push({
      key: 'hire_invoiced',
      label: 'Hire to invoice',
      options: ['No', 'Yes'],
      value: hire.invoiced ? 'Yes' : 'No',
      display: hire.invoiced ? 'Yes' : 'No',
      caption: hire.invoiced
        ? 'The hire invoice is carried by this job — the insurer is billed for its share'
        : 'Tick Yes where hire has to be invoiced on this job',
    });
    // The rate, the days and any split are shown once the job carries hire, or while
    // the group is open — so ticking Yes brings them up in the same place.
    if (hire.invoiced || editingKey === 'hire') {
      hireRows.push({
        key: 'hire_day_rate',
        label: 'Day rate agreed with the insurer',
        type: 'number',
        value: hire.dayRate,
        display: hire.dayRate !== null ? fmtGBP(hire.dayRate) : undefined,
        caption: 'Ex VAT — VAT is added to the invoice',
        missing: isMissing('hire_day_rate'),
      });
      hireRows.push({
        key: 'hire_days',
        label: 'Days hired',
        type: 'number',
        value: hire.days,
        display: hire.days !== null ? String(hire.days) : undefined,
        note: hireCharge > 0 ? `hire ${fmtGBP(hireCharge)}` : undefined,
        caption: 'Ex VAT — the day rate over these days',
        missing: isMissing('hire_days'),
      });
      hireRows.push({
        key: 'hire_split_party',
        label: 'Split with',
        options: HIRE_SPLIT_PARTIES,
        value: hire.splitParty,
        display: hire.splitParty,
        caption: hire.splitParty === 'None'
          ? 'The whole hire is billed to the insurer'
          : 'Their share is invoiced to them, and the insurer is billed the rest',
      });
      if (hire.splitParty !== 'None') {
        hireRows.push({
          key: 'hire_split_amount',
          label: `${hire.splitParty} share`,
          type: 'number',
          value: hire.splitAmount,
          display: hire.splitAmount !== null ? fmtGBP(hire.splitAmount) : undefined,
          caption: `Ex VAT — the insurer is billed the remaining ${fmtGBP(hireInsurerNet(claim))}`,
          missing: isMissing('hire_split_amount'),
        });
      }
    }
  }

  /* ACG processing payment: a per-claim choice, on percentage-fee jobs only. Their
     charge comes off our %, and our referral invoice goes to ACG (shared/acgProcessing). */
  if (repairerRows.length > 0 && !repairerWaived) {
    const acgOn = !!claim.acg_processing;
    if (repairerFeeGbp > 0 || repairerShowsFixed) {
      repairerRows.push({
        key: 'acg_processing',
        label: 'ACG processing',
        editable: false,
        display: acgOn ? 'Not applied' : 'No',
        caption: acgOn
          ? "ACG can't be used on a fixed-fee job, so it isn't applied – the fee is invoiced to the repairer as normal"
          : "Not available on fixed-fee jobs",
      });
    } else {
      const pct = num(claim.referral_fee_repairer) || 0;
      repairerRows.push({
        key: 'acg_processing',
        label: 'ACG processing',
        options: ['No', 'Yes'],
        value: acgOn ? 'Yes' : 'No',
        display: acgOn ? 'Yes' : 'No',
        caption: acgOn
          ? `ACG pay the repairer and collect our fee: ${pct}% less ACG's ${acgFeePercent(claim)}% = ${referralPercentAfterAcg(claim)}%, invoiced to ACG`
          : `Tick Yes if Accident Credit Group are processing payment (their ${ACG_FEE_PERCENT}% comes off our fee)`,
      });
    }
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
              // ACG can't take a fixed-fee job: a fixed fee turns ACG processing off.
              if (n > 0 && claim.acg_processing) {
                patch.acg_processing = false;
                notes.push('ACG processing turned off – not available on fixed-fee jobs');
              }
            }
            if (changes.acg_processing !== undefined) {
              const on = changes.acg_processing === 'Yes';
              if (on !== !!claim.acg_processing) {
                patch.acg_processing = on;
                // The rate is stamped when ticked, so a later change of ACG's rate never alters this job.
                if (on) patch.acg_fee_percent = ACG_FEE_PERCENT;
                notes.push(on
                  ? `ACG processing payment – our fee reduced by ACG's ${ACG_FEE_PERCENT}%, referral invoice raised to Accident Credit Group Limited`
                  : 'ACG processing removed – referral fee and invoice back to the repairer');
              }
            }
            if (Object.keys(patch).length === 0) return;
            onChange(patch, notes.join('; '));
          }}
        />
      )}

      {hireRows.length > 0 && (
        <FigureGroup
          title="Hire"
          rows={hireRows}
          {...group('hire')}
          onSave={(changes) => {
            const patch = buildHirePatch(claim, changes);
            onTrackerChange(patch, hireDescription(changes, { ...claim, ...patch }));
          }}
        />
      )}
    </>
  );
}