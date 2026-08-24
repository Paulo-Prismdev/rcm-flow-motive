import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Pencil, Check } from 'lucide-react';

const CLAIM_TYPES = ['Fault Claim', '3rd Party Insurer Direct', '3rd Party Paying Privately', 'Credit Repair', 'Glass Claim', 'Paying Privately'];
const VAT_STATUSES = ['VAT Registered', 'Non-VAT', 'Unknown'];

function resolveContactSource(claim) {
  const nameField = claim.instruction_contact_name ? 'instruction_contact_name' : claim.driver_contact_name ? 'driver_contact_name' : 'client_name';
  const phoneField = claim.instruction_contact_phone ? 'instruction_contact_phone' : claim.driver_contact_phone ? 'driver_contact_phone' : 'client_phone';
  const emailField = claim.instruction_contact_email ? 'instruction_contact_email' : claim.driver_contact_email ? 'driver_contact_email' : 'client_email';
  return { nameField, phoneField, emailField };
}

const INSTRUCTION_TYPES = [
  { value: 'standard', label: 'Standard (Client Insurer)' },
  { value: 'tp_insurer', label: 'Third Party Insurer' },
  { value: 'third_party', label: 'Third Party Paying' },
  { value: 'private', label: 'Paying Privately' },
  { value: 'orkin', label: 'Orkin (Branded)' },
];

function deriveInstructionType(claim) {
  const ab = claim.authorised_by;
  if (claim.claim_type === 'Paying Privately' || ab === 'Uninsured') return 'private';
  if (claim.claim_type === '3rd Party Paying Privately' || ab === 'Third Party') return 'third_party';
  if (ab === 'Third Party Insurer') return 'tp_insurer';
  return 'standard';
}

function Row({ label, field, value, claim, onFieldChange, type = 'text', options, sourceLabel }) {
  const [val, setVal] = useState(value ?? '');
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { setVal(value ?? ''); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const isEmpty = value === null || value === undefined || value === '';
  const dirty = String(val ?? '') !== String(value ?? '');

  const commit = () => {
    if (!dirty) { setEditing(false); return; }
    let out = val;
    if (type === 'number') out = out === '' ? null : Number(out);
    if (type === 'boolean') out = out === '' ? null : out === 'true';
    onFieldChange({ [field]: out });
    setEditing(false);
  };

  const displayValue = type === 'boolean'
    ? (value === true ? 'Yes' : value === false ? 'No' : '—')
    : (isEmpty ? '—' : value);

  const control = type === 'select' ? (
    <select ref={inputRef} value={val ?? ''} onChange={(e) => setVal(e.target.value)} onBlur={commit}
      className="w-full bg-transparent border-0 p-0 text-sm font-medium text-foreground focus:outline-none">
      <option value="">—</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  ) : type === 'boolean' ? (
    <select ref={inputRef} value={val === true ? 'true' : val === false ? 'false' : ''} onChange={(e) => setVal(e.target.value)} onBlur={commit}
      className="w-full bg-transparent border-0 p-0 text-sm font-medium text-foreground focus:outline-none">
      <option value="">—</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  ) : type === 'textarea' ? (
    <textarea ref={inputRef} value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit} rows={1}
      className="w-full bg-transparent border-0 p-0 text-sm font-medium text-foreground focus:outline-none resize-y" />
  ) : (
    <input ref={inputRef} type={type === 'number' ? 'number' : 'text'} value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
      className="w-full bg-transparent border-0 p-0 text-sm font-medium text-foreground focus:outline-none" />
  );

  return (
    <div className="flex items-center gap-1.5 py-0.5 px-1">
      <div className="w-36 flex-shrink-0 text-[11px] font-semibold text-muted-foreground leading-tight">
        {label}
        {sourceLabel && <span className="block text-[9px] font-normal text-muted-foreground/60">via {sourceLabel}</span>}
      </div>
      <div className={`flex-1 min-w-0 flex items-center rounded-md border px-2 py-1 ${isEmpty ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700' : 'bg-muted/50 border-border'} ${editing ? 'ring-1 ring-accent/40 border-accent/50' : ''}`}>
        <div className="flex-1 min-w-0">
          {editing ? control : (
            <div className={`text-sm font-medium truncate ${isEmpty ? 'text-amber-500' : 'text-foreground'}`}>{displayValue}</div>
          )}
        </div>
        {isEmpty && !editing && <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 ml-1" />}
      </div>
      <button
        type="button"
        onClick={() => editing ? commit() : setEditing(true)}
        className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
        title={editing ? 'Save' : 'Edit'}>
        {editing ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Pencil className="w-3 h-3" />}
      </button>
    </div>
  );
}

function Group({ title, children }) {
  return (
    <div className="mb-1.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-accent px-2 py-1 border-b border-border">{title}</div>
      {children}
    </div>
  );
}

// Insurance field sets per instruction type — mirrors what the PDF renders
function InsuranceSection({ instructionType, claim, onUpdate }) {
  if (instructionType === 'private') {
    return (
      <Group title="Insurance Details">
        <div className="px-2 py-1.5 text-[11px] italic text-muted-foreground">Paying Privately — no insurance section on the instruction.</div>
      </Group>
    );
  }
  if (instructionType === 'third_party') {
    return (
      <Group title="Third Party Invoice Details">
        <Row label="Third Party Name" field="tp_name" value={claim.tp_name} claim={claim} onFieldChange={onUpdate} />
        <Row label="Third Party Address" field="tp_address_line_1" value={claim.tp_address_line_1} claim={claim} onFieldChange={onUpdate} />
      </Group>
    );
  }
  if (instructionType === 'tp_insurer') {
    return (
      <Group title="Insurance Details — Third Party Insurer">
        <Row label="TP Insurer" field="tp_insurer" value={claim.tp_insurer} claim={claim} onFieldChange={onUpdate} />
        <Row label="TP Claim Number" field="tp_claim_ref" value={claim.tp_claim_ref} claim={claim} onFieldChange={onUpdate} />
        <Row label="TP Policy Number" field="tp_policy_number" value={claim.tp_policy_number} claim={claim} onFieldChange={onUpdate} />
        <Row label="Email Estimate To" field="send_estimate_email" value={claim.send_estimate_email} claim={claim} onFieldChange={onUpdate} />
        <Row label="Audatex Code" field="audatex_code" value={claim.audatex_code} claim={claim} onFieldChange={onUpdate} />
      </Group>
    );
  }
  // standard & orkin — client insurer details
  return (
    <Group title={`Insurance Details${instructionType === 'orkin' ? ' (Orkin)' : ''}`}>
      <Row label="Insurer" field="insurer" value={claim.insurer} claim={claim} onFieldChange={onUpdate} />
      <Row label="Claim Number" field="claim_ref" value={claim.claim_ref} claim={claim} onFieldChange={onUpdate} />
      <Row label="Policy Number" field="policy_number" value={claim.policy_number} claim={claim} onFieldChange={onUpdate} />
      <Row label="Email Estimate To" field="send_estimate_email" value={claim.send_estimate_email} claim={claim} onFieldChange={onUpdate} />
      <Row label="Audatex Code" field="audatex_code" value={claim.audatex_code} claim={claim} onFieldChange={onUpdate} />
      <Row label="Excess (£)" field="policy_excess" value={claim.policy_excess} claim={claim} onFieldChange={onUpdate} type="number" />
    </Group>
  );
}

export default function InstructionPreCheck({ claim, onUpdate }) {
  const [instructionType, setInstructionType] = useState(deriveInstructionType(claim));
  const c = resolveContactSource(claim);
  const clientAddress = [claim.client_address_line_1, claim.client_address_line_2, claim.client_town, claim.client_county, claim.client_postcode].filter(Boolean).join(', ');

  // Persist the chosen instruction type onto the claim's authorised_by so the
  // PDF generator picks the right template/insurer party.
  const handleTypeChange = (newType) => {
    setInstructionType(newType);
    const abMap = { standard: 'Client Insurer', tp_insurer: 'Third Party Insurer', third_party: 'Third Party', private: 'Uninsured', orkin: 'Client Insurer' };
    onUpdate({ authorised_by: abMap[newType] });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-2">
      <div className="flex items-center gap-2 px-1 pb-2 mb-1 border-b border-border">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        <h3 className="text-xs font-semibold text-foreground">Instruction Pre-Check</h3>
        <span className="text-[10px] text-muted-foreground">— fix any gaps before allocating</span>
      </div>

      {/* Instruction type selector */}
      <div className="flex items-center gap-2 px-1 pb-2 mb-1">
        <label className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">Instruction Type:</label>
        <select
          value={instructionType}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="flex-1 h-7 text-xs font-medium rounded-md border border-border bg-muted/50 px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40">
          {INSTRUCTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <Group title="Client & Repairer Details">
        <Row label="Claim Type" field="claim_type" value={claim.claim_type} claim={claim} onFieldChange={onUpdate} type="select" options={CLAIM_TYPES} />
        <Row label="Repairer" field="bodyshop" value={claim.bodyshop} claim={claim} onFieldChange={onUpdate} />
        <Row label="Client" field="client_name" value={claim.client_name} claim={claim} onFieldChange={onUpdate} />
        <Row label="Client Address" field="client_address_line_1" value={clientAddress || claim.client_address_line_1} claim={claim} onFieldChange={onUpdate} />
        <Row label="Contact Name" field={c.nameField} value={claim[c.nameField]} claim={claim} onFieldChange={onUpdate} sourceLabel={claim.instruction_contact_name ? 'Instruction' : claim.driver_contact_name ? 'Driver' : 'Client'} />
        <Row label="Email Address" field={c.emailField} value={claim[c.emailField]} claim={claim} onFieldChange={onUpdate} sourceLabel={claim.instruction_contact_email ? 'Instruction' : claim.driver_contact_email ? 'Driver' : 'Client'} />
        <Row label="Contact Number" field={c.phoneField} value={claim[c.phoneField]} claim={claim} onFieldChange={onUpdate} sourceLabel={claim.instruction_contact_phone ? 'Instruction' : claim.driver_contact_phone ? 'Driver' : 'Client'} />
        <Row label="Client VAT Status" field="client_vat_status" value={claim.client_vat_status} claim={claim} onFieldChange={onUpdate} type="select" options={VAT_STATUSES} />
      </Group>

      <Group title="Vehicle Details">
        <Row label="Make & Model" field="make_model" value={claim.make_model} claim={claim} onFieldChange={onUpdate} />
        <Row label="Registration" field="reg" value={claim.reg} claim={claim} onFieldChange={onUpdate} />
        <Row label="Vehicle Location" field="vehicle_location" value={claim.vehicle_location} claim={claim} onFieldChange={onUpdate} />
        <Row label="Vehicle Damage" field="vehicle_damage" value={claim.vehicle_damage} claim={claim} onFieldChange={onUpdate} type="textarea" />
      </Group>

      <Group title="Recovery & Courtesy">
        <Row label="Recovery Required?" field="recovery_required" value={claim.recovery_required} claim={claim} onFieldChange={onUpdate} type="boolean" />
        <Row label="Vehicle Unroadworthy?" field="unroadworthy" value={claim.unroadworthy} claim={claim} onFieldChange={onUpdate} type="boolean" />
        <Row label="Courtesy Car Required?" field="courtesy_car_required" value={claim.courtesy_car_required} claim={claim} onFieldChange={onUpdate} type="boolean" />
      </Group>

      <InsuranceSection instructionType={instructionType} claim={claim} onUpdate={onUpdate} />

      <Group title="Referral Fee">
        <Row label="Referral Fee (%)" field="referral_fee_repairer" value={claim.referral_fee_repairer} claim={claim} onFieldChange={onUpdate} type="number" />
        <Row label="Referral Fee (£)" field="referral_fee_repairer_gbp" value={claim.referral_fee_repairer_gbp} claim={claim} onFieldChange={onUpdate} type="number" />
      </Group>
    </div>
  );
}