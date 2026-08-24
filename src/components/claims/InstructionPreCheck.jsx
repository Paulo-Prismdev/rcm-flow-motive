import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, User, Car, Shield, Wrench, BadgePercent, FileText } from 'lucide-react';

// Mirrors the field resolution logic in generateBodyshopInstructionPdf so the
// pre-check shows exactly what will print on the instruction PDF.

const CLAIM_TYPES = ['Fault Claim', '3rd Party Insurer Direct', '3rd Party Paying Privately', 'Credit Repair', 'Glass Claim', 'Paying Privately'];
const VAT_STATUSES = ['VAT Registered', 'Non-VAT', 'Unknown'];
const AUTHORISED_BY = ['Client Insurer', 'Third Party Insurer', 'Third Party', 'Uninsured'];

// Resolve the effective contact fields the PDF will use (instruction_contact_*
// is set at allocation time; before allocation it falls back to driver then client).
function resolveContactSource(claim) {
  const nameField = claim.instruction_contact_name ? 'instruction_contact_name'
    : claim.driver_contact_name ? 'driver_contact_name'
    : 'client_name';
  const phoneField = claim.instruction_contact_phone ? 'instruction_contact_phone'
    : claim.driver_contact_phone ? 'driver_contact_phone'
    : 'client_phone';
  const emailField = claim.instruction_contact_email ? 'instruction_contact_email'
    : claim.driver_contact_email ? 'driver_contact_email'
    : 'client_email';
  const sourceLabel = claim.instruction_contact_name ? 'Instruction'
    : claim.driver_contact_name ? 'Driver'
    : 'Client';
  return { nameField, phoneField, emailField, sourceLabel };
}

// Resolve the insurer display values, matching the PDF's authorised_by logic.
function resolveInsurerDisplay(claim) {
  const authorisedBy = claim.authorised_by || 'Client Insurer';
  if (authorisedBy === 'Third Party Insurer') {
    return { insurer: claim.tp_insurer, claimRef: claim.tp_claim_ref, policyNumber: claim.tp_policy_number, policyExcess: null, label: 'Third Party Insurer' };
  }
  if (authorisedBy === 'Third Party') {
    return { insurer: null, claimRef: null, policyNumber: null, policyExcess: null, label: 'Third Party', isThirdPartyPaying: true };
  }
  if (authorisedBy === 'Uninsured') {
    return { insurer: null, claimRef: null, policyNumber: null, policyExcess: claim.policy_excess, label: 'Uninsured', isUninsured: true };
  }
  return { insurer: claim.insurer, claimRef: claim.claim_ref, policyNumber: claim.policy_number, policyExcess: claim.policy_excess, label: 'Insured (Client)' };
}

// ── Inline editable field ──
function Field({ label, field, value, claim, onFieldChange, type = 'text', options, placeholder, full = false, readOnly = false, sourceLabel }) {
  const [val, setVal] = useState(value ?? '');
  useEffect(() => { setVal(value ?? ''); }, [value]);

  const isEmpty = value === null || value === undefined || value === '';
  const dirty = String(val ?? '') !== String(value ?? '');

  const commit = () => {
    if (!dirty) return;
    let out = val;
    if (type === 'number') out = out === '' ? null : Number(out);
    if (type === 'boolean') out = out === '' ? null : out === 'true';
    onFieldChange({ [field]: out });
  };

  return (
    <div className={`py-1.5 px-2.5 rounded-[8px] transition-colors ${isEmpty ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700' : 'border border-transparent'} ${full ? 'col-span-full' : ''}`}>
      <div className="flex items-center justify-between mb-0.5">
        <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
        {sourceLabel && <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/70">via {sourceLabel}</span>}
      </div>
      {readOnly ? (
        <div className={`text-sm font-medium ${isEmpty ? 'text-amber-500' : 'text-foreground'}`}>{isEmpty ? '—' : value}</div>
      ) : type === 'select' ? (
        <select
          value={val ?? ''}
          onChange={(e) => { setVal(e.target.value); }}
          onBlur={commit}
          className="w-full text-sm font-medium bg-transparent border-0 p-0 focus:outline-none focus:ring-0 cursor-pointer"
        >
          <option value="">—</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'boolean' ? (
        <select
          value={val === true ? 'true' : val === false ? 'false' : ''}
          onChange={(e) => { setVal(e.target.value); }}
          onBlur={commit}
          className="w-full text-sm font-medium bg-transparent border-0 p-0 focus:outline-none focus:ring-0 cursor-pointer"
        >
          <option value="">—</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      ) : type === 'textarea' ? (
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          placeholder={placeholder}
          rows={2}
          className="w-full text-sm font-medium bg-transparent border-0 p-0 focus:outline-none focus:ring-0 resize-y"
        />
      ) : (
        <input
          type={type === 'number' ? 'number' : 'text'}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          placeholder={placeholder}
          className="w-full text-sm font-medium bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
        />
      )}
    </div>
  );
}

function SectionCard({ icon: Icon, title, children, complete }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">{title}</h4>
        {complete ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        )}
      </div>
      <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-0.5">
        {children}
      </div>
    </div>
  );
}

export default function InstructionPreCheck({ claim, onUpdate }) {
  // onUpdate expects a partial object to merge into the claim.
  const handle = (partial) => onUpdate(partial);

  const contact = resolveContactSource(claim);
  const ins = resolveInsurerDisplay(claim);

  const clientAddressEmpty = !claim.client_address_line_1 && !claim.client_town && !claim.client_postcode;
  const vehicleEmpty = !claim.make_model && !claim.reg;
  const recoveryEmpty = claim.recovery_required == null && claim.unroadworthy == null && claim.courtesy_car_required == null;
  const insurerEmpty = ins.isThirdPartyPaying ? !claim.tp_name : ins.isUninsured ? false : (!ins.insurer && !ins.claimRef && !ins.policyNumber);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        <FileText className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">Instruction Pre-Check</h3>
        <span className="text-[11px] text-muted-foreground">— review & fix what will appear on the instruction PDF before allocating</span>
      </div>

      {/* Section 1 — Client & Repairer Details */}
      <SectionCard icon={User} title="Client & Repairer Details" complete={!!(claim.claim_type && claim.client_name && claim.client_email && claim.client_phone && !clientAddressEmpty)}>
        <Field label="Claim Type" field="claim_type" value={claim.claim_type} claim={claim} onFieldChange={handle} type="select" options={CLAIM_TYPES} />
        <Field label="Repairer" field="bodyshop" value={claim.bodyshop} claim={claim} onFieldChange={handle} readOnly placeholder="Set via allocation" />
        <Field label="Client Name" field="client_name" value={claim.client_name} claim={claim} onFieldChange={handle} />
        <Field label="VAT Status" field="client_vat_status" value={claim.client_vat_status} claim={claim} onFieldChange={handle} type="select" options={VAT_STATUSES} />
        <Field label="Client Address Line 1" field="client_address_line_1" value={claim.client_address_line_1} claim={claim} onFieldChange={handle} full />
        <Field label="Address Line 2" field="client_address_line_2" value={claim.client_address_line_2} claim={claim} onFieldChange={handle} />
        <Field label="Town" field="client_town" value={claim.client_town} claim={claim} onFieldChange={handle} />
        <Field label="County" field="client_county" value={claim.client_county} claim={claim} onFieldChange={handle} />
        <Field label="Postcode" field="client_postcode" value={claim.client_postcode} claim={claim} onFieldChange={handle} />
        <Field label="Contact Name" field={contact.nameField} value={claim[contact.nameField]} claim={claim} onFieldChange={handle} sourceLabel={contact.sourceLabel} />
        <Field label="Contact Phone" field={contact.phoneField} value={claim[contact.phoneField]} claim={claim} onFieldChange={handle} sourceLabel={contact.sourceLabel} />
        <Field label="Contact Email" field={contact.emailField} value={claim[contact.emailField]} claim={claim} onFieldChange={handle} sourceLabel={contact.sourceLabel} />
      </SectionCard>

      {/* Section 2 — Vehicle Details */}
      <SectionCard icon={Car} title="Vehicle Details" complete={!vehicleEmpty && !!claim.vehicle_location && !!claim.vehicle_damage}>
        <Field label="Make & Model" field="make_model" value={claim.make_model} claim={claim} onFieldChange={handle} />
        <Field label="Registration" field="reg" value={claim.reg} claim={claim} onFieldChange={handle} />
        <Field label="Vehicle Location" field="vehicle_location" value={claim.vehicle_location} claim={claim} onFieldChange={handle} full />
        <Field label="Vehicle Damage" field="vehicle_damage" value={claim.vehicle_damage} claim={claim} onFieldChange={handle} type="textarea" full />
      </SectionCard>

      {/* Section 3 — Recovery & Courtesy */}
      <SectionCard icon={Wrench} title="Recovery & Courtesy Details" complete={!recoveryEmpty}>
        <Field label="Urgent Recovery Required?" field="recovery_required" value={claim.recovery_required} claim={claim} onFieldChange={handle} type="boolean" />
        <Field label="Vehicle Unroadworthy?" field="unroadworthy" value={claim.unroadworthy} claim={claim} onFieldChange={handle} type="boolean" />
        <Field label="Courtesy Car Required?" field="courtesy_car_required" value={claim.courtesy_car_required} claim={claim} onFieldChange={handle} type="boolean" />
      </SectionCard>

      {/* Section 4 — Insurance Details (driven by authorised_by) */}
      <SectionCard icon={Shield} title={`Insurance Details — ${ins.label}`} complete={!insurerEmpty}>
        <Field label="Authorised By" field="authorised_by" value={claim.authorised_by} claim={claim} onFieldChange={handle} type="select" options={AUTHORISED_BY} full />
        {ins.isThirdPartyPaying ? (
          <>
            <Field label="Third Party Name" field="tp_name" value={claim.tp_name} claim={claim} onFieldChange={handle} />
            <Field label="Third Party Address" field="tp_address_line_1" value={claim.tp_address_line_1} claim={claim} onFieldChange={handle} full />
          </>
        ) : ins.isUninsured ? (
          <div className="col-span-full py-2 px-2 text-xs text-muted-foreground italic">
            Non-insurance / Paying Privately — no insurer details shown on the instruction.
          </div>
        ) : (
          <>
            <Field label={ins.label === 'Third Party Insurer' ? 'TP Insurer' : 'Insurer'} field={ins.label === 'Third Party Insurer' ? 'tp_insurer' : 'insurer'} value={ins.insurer} claim={claim} onFieldChange={handle} />
            <Field label={ins.label === 'Third Party Insurer' ? 'TP Claim Ref' : 'Claim Reference'} field={ins.label === 'Third Party Insurer' ? 'tp_claim_ref' : 'claim_ref'} value={ins.claimRef} claim={claim} onFieldChange={handle} />
            <Field label={ins.label === 'Third Party Insurer' ? 'TP Policy Number' : 'Policy Number'} field={ins.label === 'Third Party Insurer' ? 'tp_policy_number' : 'policy_number'} value={ins.policyNumber} claim={claim} onFieldChange={handle} />
            <Field label="Policy Excess (£)" field="policy_excess" value={claim.policy_excess} claim={claim} onFieldChange={handle} type="number" />
            <Field label="Email Estimate To" field="send_estimate_email" value={claim.send_estimate_email} claim={claim} onFieldChange={handle} full />
            <Field label="Audatex Code" field="audatex_code" value={claim.audatex_code} claim={claim} onFieldChange={handle} />
          </>
        )}
      </SectionCard>

      {/* Section 5 — Referral Fee */}
      <SectionCard icon={BadgePercent} title="Referral Fee" complete={!!(claim.referral_fee_repairer || claim.referral_fee_repairer_gbp)}>
        <Field label="Referral Fee (%)" field="referral_fee_repairer" value={claim.referral_fee_repairer} claim={claim} onFieldChange={handle} type="number" />
        <Field label="Referral Fee (£)" field="referral_fee_repairer_gbp" value={claim.referral_fee_repairer_gbp} claim={claim} onFieldChange={handle} type="number" />
      </SectionCard>
    </div>
  );
}