import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Pencil, Check } from 'lucide-react';
import CreditRepairCombobox from '../shared/CreditRepairCombobox';
import { COURTESY_CAR_OPTIONS } from '../shared/courtesyCarOptions';
import ExcessModeField from '../shared/ExcessModeField';
import { excessMode, excessAnswered } from '../shared/excessState';
import { logExcessChange } from '../shared/logExcessChange';

const CLAIM_TYPES = ['Fault Claim', 'Non-Fault - Own Insurer', '3rd Party Insurer Direct', '3rd Party Paying Privately', 'Credit Repair', 'Glass Claim', 'Paying Privately'];
const VAT_STATUSES = ['VAT Registered', 'Non-VAT', 'Unknown'];

const INSTRUCTION_TYPES = [
  { value: 'standard', label: 'Standard (Client Insurer)' },
  { value: 'tp_insurer', label: 'Third Party Insurer' },
  { value: 'third_party', label: 'Third Party Paying' },
  { value: 'private', label: 'Paying Privately' },
  { value: 'credit_repair', label: 'Credit Repair' },
  { value: 'orkin', label: 'Orkin (Branded)' },
];

// The role + organisation name that corresponds to a chosen instruction type.
// orkin is a branded variant of "standard" (same role: Client Insurer).
function authorisingPartyForInstructionType(type, claim) {
  switch (type) {
    case 'standard':
    case 'orkin':
      return { authorised_by: 'Client Insurer', authorising_party_name: claim.insurer || '' };
    case 'tp_insurer':
      return { authorised_by: 'Third Party Insurer', authorising_party_name: claim.tp_insurer || '' };
    case 'third_party':
      return { authorised_by: 'Third Party', authorising_party_name: claim.tp_name || '' };
    case 'private':
      return { authorised_by: 'Uninsured', authorising_party_name: claim.client_name || '' };
    case 'credit_repair':
      return { authorised_by: 'Credit Repair', authorising_party_name: claim.credit_repair_company_name || '' };
    default:
      return { authorised_by: '', authorising_party_name: '' };
  }
}

// The role the claim type auto-implies, ignoring any manual override.
function autoDerivedRole(claim) {
  const ct = claim.claim_type;
  switch (ct) {
    case 'Fault Claim':
    case 'Non-Fault - Own Insurer':
    case 'Glass Claim':
      return 'Client Insurer';
    case '3rd Party Insurer Direct':
      return 'Third Party Insurer';
    case '3rd Party Paying Privately':
      return 'Third Party';
    case 'Credit Repair':
      return 'Credit Repair';
    case 'Paying Privately':
      return 'Uninsured';
    default:
      return claim.authorised_by || '';
  }
}

function instructionTypeFromClaimType(claim) {
  const ct = claim.claim_type;
  if (ct === 'Credit Repair') return 'credit_repair';
  if (ct === 'Paying Privately') return 'private';
  if (ct === '3rd Party Paying Privately') return 'third_party';
  if (ct === '3rd Party Insurer Direct') return 'tp_insurer';
  if (ct) return 'standard';
  const ab = claim.authorised_by;
  if (ab === 'Credit Repair') return 'credit_repair';
  if (ab === 'Uninsured') return 'private';
  if (ab === 'Third Party') return 'third_party';
  if (ab === 'Third Party Insurer') return 'tp_insurer';
  return 'standard';
}

function instructionTypeFromRole(role) {
  if (role === 'Credit Repair') return 'credit_repair';
  if (role === 'Uninsured') return 'private';
  if (role === 'Third Party') return 'third_party';
  if (role === 'Third Party Insurer') return 'tp_insurer';
  return 'standard';
}

function deriveInstructionType(claim) {
  // Respect a manual override so the pre-check opens on the staff-chosen
  // type; otherwise derive from the claim type.
  if (claim.authorising_party_overridden) return instructionTypeFromRole(claim.authorised_by);
  return instructionTypeFromClaimType(claim);
}

function Row({ label, field, value, claim, onFieldChange, type = 'text', options, sourceLabel, readOnly = false }) {
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
      {!readOnly && (
        <button
          type="button"
          onClick={() => editing ? commit() : setEditing(true)}
          className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
          title={editing ? 'Save' : 'Edit'}>
          {editing ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Pencil className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
}

/**
 * The policy excess: the three-way choice of a figure, Waived, or TBC on
 * authority. The pre-check saves the claim straight through, so a change between
 * the three is recorded on the claim's history here — nothing in this step is
 * silent, and all three count as answered rather than as a gap.
 */
function ExcessRow({ claim, onFieldChange }) {
  const handleChange = (patch) => {
    if ('excess_tbc' in patch || 'policy_excess' in patch) {
      logExcessChange(claim, patch).catch(() => {});
    }
    onFieldChange(patch);
  };

  const unanswered = excessMode(claim) === 'amount' && !excessAnswered(claim);

  return (
    <div className="flex items-start gap-1.5 py-0.5 px-1">
      <div className="w-36 flex-shrink-0 text-[11px] font-semibold text-muted-foreground leading-tight pt-1">
        Excess (£)
        {unanswered && <span className="block text-[9px] font-normal text-amber-500">Not answered</span>}
      </div>
      <div className="flex-1 min-w-0">
        <ExcessModeField claim={claim} onChange={handleChange} compact />
      </div>
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
      <Row label="Phone" field="credit_repair_company_phone" value={claim.credit_repair_company_phone} claim={claim} onFieldChange={onUpdate} />
      <Row label="Email" field="credit_repair_company_email" value={claim.credit_repair_company_email} claim={claim} onFieldChange={onUpdate} />
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
      <ExcessRow claim={claim} onFieldChange={onUpdate} />
    </Group>
  );
}

export default function InstructionPreCheck({ claim, onUpdate, selectedBodyshop }) {
  const [instructionType, setInstructionType] = useState(() => deriveInstructionType(claim));
  const prevClaimTypeRef = useRef(claim.claim_type);

  // Re-derive the instruction type when the claim type changes. When it does,
  // re-align the authorising party to the new auto-derived role and clear any
  // manual override (the instruction type now follows the claim type again).
  // On mount we only set the dropdown — we never overwrite a staff override.
  useEffect(() => {
    setInstructionType(deriveInstructionType(claim));
    if (prevClaimTypeRef.current !== claim.claim_type) {
      prevClaimTypeRef.current = claim.claim_type;
      const autoType = instructionTypeFromClaimType(claim);
      const auto = authorisingPartyForInstructionType(autoType, claim);
      onUpdate({
        authorised_by: auto.authorised_by,
        authorising_party_name: auto.authorising_party_name,
        authorising_party_overridden: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claim.claim_type]);

  const clientAddress = [claim.client_address_line_1, claim.client_address_line_2, claim.client_town, claim.client_county, claim.client_postcode].filter(Boolean).join(', ');

  const handleTypeChange = (newType) => {
    setInstructionType(newType);
    const chosen = authorisingPartyForInstructionType(newType, claim);
    const isOverride = chosen.authorised_by !== autoDerivedRole(claim);
    onUpdate({
      authorised_by: chosen.authorised_by,
      authorising_party_name: chosen.authorising_party_name,
      authorising_party_overridden: isOverride,
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-2">
      <div className="flex items-center gap-2 px-1 pb-2 mb-1 border-b border-border">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        <h3 className="text-xs font-semibold text-foreground">Instruction Pre-Check</h3>
        <span className="text-[10px] text-muted-foreground">— fix any gaps before allocating</span>
      </div>

      <Group title="Client & Repairer Details">
        <Row label="Claim Type" field="claim_type" value={claim.claim_type} claim={claim} onFieldChange={onUpdate} type="select" options={CLAIM_TYPES} />
        <Row label="Repairer" field="bodyshop" value={selectedBodyshop?.name || claim.bodyshop} claim={claim} onFieldChange={onUpdate} readOnly={!!selectedBodyshop} sourceLabel={selectedBodyshop ? 'Find Repairer step' : undefined} />
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
        <Row label="Courtesy Car Required?" field="courtesy_car_required" value={claim.courtesy_car_required} claim={claim} onFieldChange={onUpdate} type="select" options={COURTESY_CAR_OPTIONS} />
      </Group>

      <InsuranceSection instructionType={instructionType} claim={claim} onUpdate={onUpdate} />

      <Group title="Referral Fee">
        <Row label="Referral Fee (%)" field="referral_fee_repairer" value={claim.referral_fee_repairer} claim={claim} onFieldChange={onUpdate} type="number" />
        <Row label="Referral Fee (£)" field="referral_fee_repairer_gbp" value={claim.referral_fee_repairer_gbp} claim={claim} onFieldChange={onUpdate} type="number" />
      </Group>
    </div>
  );
}