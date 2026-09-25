import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Pencil, Check, User, Car, Phone } from 'lucide-react';
import CreditRepairCombobox from '../shared/CreditRepairCombobox';

const CLAIM_TYPES = ['Fault Claim', '3rd Party Insurer Direct', '3rd Party Paying Privately', 'Credit Repair', 'Glass Claim', 'Paying Privately'];
const VAT_STATUSES = ['VAT Registered', 'Non-VAT', 'Unknown'];

const INSTRUCTION_TYPES = [
  { value: 'standard', label: 'Standard (Client Insurer)' },
  { value: 'tp_insurer', label: 'Third Party Insurer' },
  { value: 'third_party', label: 'Third Party Paying' },
  { value: 'private', label: 'Paying Privately' },
  { value: 'credit_repair', label: 'Credit Repair' },
  { value: 'orkin', label: 'Orkin (Branded)' },
];

function deriveInstructionType(claim) {
  const ab = claim.authorised_by;
  if (claim.claim_type === 'Credit Repair' || ab === 'Credit Repair') return 'credit_repair';
  if (claim.claim_type === 'Paying Privately' || ab === 'Uninsured') return 'private';
  if (claim.claim_type === '3rd Party Paying Privately' || ab === 'Third Party') return 'third_party';
  if (claim.claim_type === '3rd Party Insurer Direct' || ab === 'Third Party Insurer') return 'tp_insurer';
  return 'standard';
}

const CONTACT_SOURCES = [
  { value: 'client', label: 'Client', icon: User },
  { value: 'driver', label: 'Driver', icon: Car },
  { value: 'custom', label: 'Custom', icon: Phone },
];

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
    <select ref={inputRef} value={val === true || val === 'true' ? 'true' : val === false || val === 'false' ? 'false' : ''} onChange={(e) => setVal(e.target.value)} onBlur={commit}
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

function CreditRepairSection({ claim, onUpdate }) {
  const handleCompanySelect = (company) => {
    if (!company) {
      onUpdate({
        credit_repair_company_id: '',
        credit_repair_company_name: '',
        credit_repair_company_contact_name: '',
        credit_repair_company_phone: '',
        credit_repair_company_email: '',
        credit_repair_company_account_ref: '',
      });
      return;
    }
    onUpdate({
      credit_repair_company_id: company.id,
      credit_repair_company_name: company.name,
      credit_repair_company_contact_name: company.contact_name || '',
      credit_repair_company_phone: company.phone || '',
      credit_repair_company_email: company.email || '',
      credit_repair_company_account_ref: company.account_reference || '',
    });
  };

  return (
    <Group title="Credit Repair Company">
      <div className="px-1 py-1.5">
        <CreditRepairCombobox
          value={claim.credit_repair_company_name || ''}
          onChange={handleCompanySelect}
          placeholder="Select credit repair company..."
        />
      </div>
      <Row label="Contact Name" field="credit_repair_company_contact_name" value={claim.credit_repair_company_contact_name} claim={claim} onFieldChange={onUpdate} />
      <Row label="Phone" field="credit_repair_company_phone" value={claim.credit_repair_company_phone} claim={claim} onFieldChange={onUpdate} />
      <Row label="Email" field="credit_repair_company_email" value={claim.credit_repair_company_email} claim={claim} onFieldChange={onUpdate} />
      <Row label="Account Ref" field="credit_repair_company_account_ref" value={claim.credit_repair_company_account_ref} claim={claim} onFieldChange={onUpdate} />
    </Group>
  );
}

function InsuranceSection({ instructionType, claim, onUpdate }) {
  if (instructionType === 'credit_repair') {
    return <CreditRepairSection claim={claim} onUpdate={onUpdate} />;
  }
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
  const [contactSource, setContactSource] = useState((claim.last_contact_source || 'Client').toLowerCase());

  // Sync authorised_by with the derived instruction type on mount so the
  // PDF generator knows whose insurance details to show, even if the user
  // never touches the instruction-type dropdown.
  useEffect(() => {
    const abMap = { standard: 'Client Insurer', tp_insurer: 'Third Party Insurer', third_party: 'Third Party', private: 'Uninsured', credit_repair: 'Credit Repair', orkin: 'Client Insurer' };
    const expectedAb = abMap[instructionType];
    if (expectedAb && claim.authorised_by !== expectedAb) {
      onUpdate({ authorised_by: expectedAb });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientAddress = [claim.client_address_line_1, claim.client_address_line_2, claim.client_town, claim.client_county, claim.client_postcode].filter(Boolean).join(', ');

  const handleTypeChange = (newType) => {
    setInstructionType(newType);
    const abMap = { standard: 'Client Insurer', tp_insurer: 'Third Party Insurer', third_party: 'Third Party', private: 'Uninsured', credit_repair: 'Credit Repair', orkin: 'Client Insurer' };
    onUpdate({ authorised_by: abMap[newType] });
  };

  const handleContactSourceChange = (source) => {
    setContactSource(source);
    let name = '', email = '', phone = '';
    if (source === 'client') {
      name = claim.client_name || ''; email = claim.client_email || ''; phone = claim.client_phone || '';
    } else if (source === 'driver') {
      name = claim.driver_contact_name || ''; email = claim.driver_contact_email || ''; phone = claim.driver_contact_phone || '';
    }
    onUpdate({
      last_contact_source: source.charAt(0).toUpperCase() + source.slice(1),
      instruction_contact_type: source,
      instruction_contact_name: name,
      instruction_contact_email: email,
      instruction_contact_phone: phone,
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-2">
      <div className="flex items-center gap-2 px-1 pb-2 mb-1 border-b border-border">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        <h3 className="text-xs font-semibold text-foreground">Instruction Pre-Check</h3>
        <span className="text-[10px] text-muted-foreground">— fix any gaps before allocating</span>
      </div>

      {/* Instruction Contact selector */}
      <Group title="Instruction Contact">
        <div className="flex gap-1.5 px-1 pb-1.5">
          {CONTACT_SOURCES.map((s) => {
            const Icon = s.icon;
            const active = contactSource === s.value;
            return (
              <button key={s.value} type="button" onClick={() => handleContactSourceChange(s.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md border text-[11px] font-medium transition-colors ${active ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:bg-muted/60'}`}>
                <Icon className="w-3 h-3" /> {s.label}
              </button>
            );
          })}
        </div>
        <Row label="Contact Name" field="instruction_contact_name" value={claim.instruction_contact_name} claim={claim} onFieldChange={onUpdate} sourceLabel={contactSource} />
        <Row label="Email Address" field="instruction_contact_email" value={claim.instruction_contact_email} claim={claim} onFieldChange={onUpdate} sourceLabel={contactSource} />
        <Row label="Contact Number" field="instruction_contact_phone" value={claim.instruction_contact_phone} claim={claim} onFieldChange={onUpdate} sourceLabel={contactSource} />
      </Group>

      <Group title="Client & Repairer Details">
        <Row label="Claim Type" field="claim_type" value={claim.claim_type} claim={claim} onFieldChange={onUpdate} type="select" options={CLAIM_TYPES} />
        <Row label="Repairer" field="bodyshop" value={claim.bodyshop} claim={claim} onFieldChange={onUpdate} />
        <Row label="Client" field="client_name" value={claim.client_name} claim={claim} onFieldChange={onUpdate} />
        <Row label="Client Address" field="client_address_line_1" value={clientAddress || claim.client_address_line_1} claim={claim} onFieldChange={onUpdate} />
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