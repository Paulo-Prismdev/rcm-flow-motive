import React from 'react';
import { Input } from '@/components/ui/input';
import {
  CheckCircle, AlertCircle, Building2, User, Car, Phone, Mail, PoundSterling,
  FileText, Lock, Shield, MapPin, BadgePercent,
} from 'lucide-react';

const AUTHORISED_LABELS = {
  'Client Insurer': "Client's Insurer",
  'Third Party Insurer': 'Third Party Insurer',
  'Third Party': 'Third Party (Paying Directly)',
  'Uninsured': 'Uninsured / Client Direct',
};

function SummaryRow({ icon: Icon, label, value, missing }) {
  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded-md ${missing ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700' : ''}`}>
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <span className="text-[11px] font-semibold text-muted-foreground w-32 flex-shrink-0">{label}</span>
      <span className={`text-sm font-medium flex-1 min-w-0 truncate ${missing ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
        {missing ? 'Missing — fix in Instruction Pre-Check' : (value || '—')}
      </span>
    </div>
  );
}

export default function WizardValidateStep({
  claim, validationData, missingFields, onValidationChange, isLocked = false,
}) {
  const ab = claim.authorised_by || 'Client Insurer';
  const isClientInsurer = ab === 'Client Insurer';
  const isTpInsurer = ab === 'Third Party Insurer';
  const isTpDirect = ab === 'Third Party';
  const isUninsured = ab === 'Uninsured';

  const contactName = claim.instruction_contact_name || claim.client_name || '';
  const contactEmail = claim.instruction_contact_email || claim.client_email || '';
  const contactPhone = claim.instruction_contact_phone || claim.client_phone || '';
  const contactSource = claim.last_contact_source || 'Client';

  const insurerName = isClientInsurer ? claim.insurer : isTpInsurer ? claim.tp_insurer : '';
  const claimRef = isClientInsurer ? claim.claim_ref : isTpInsurer ? claim.tp_claim_ref : '';
  const policyNumber = isClientInsurer ? claim.policy_number : isTpInsurer ? claim.tp_policy_number : '';
  const policyExcess = claim.policy_excess;

  const isMissing = (key) => missingFields.some(f => f.key === key);

  return (
    <div className="space-y-3">
      {isLocked && (
        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
            Locked after allocation — un-allocate this job to change these details.
          </p>
        </div>
      )}

      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-start gap-2">
        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-300 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Review instruction details</p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
            These were captured in the Instruction Pre-Check panel. Fix any gaps there before allocating — only the essentials can be edited below.
          </p>
        </div>
      </div>

      {/* Read-only summary of the instruction details */}
      <div className="p-3 rounded-lg border bg-card space-y-0.5">
        <h3 className="font-bold text-sm mb-1.5">Instruction Summary</h3>
        <SummaryRow icon={Shield} label="Authorised By" value={AUTHORISED_LABELS[ab] || ab} />
        <SummaryRow icon={User} label="Instruction Contact" value={`${contactName || '—'} (${contactSource})`} missing={!contactName} />
        <SummaryRow icon={Mail} label="Contact Email" value={contactEmail} missing={!contactEmail} />
        <SummaryRow icon={Phone} label="Contact Phone" value={contactPhone} missing={!contactPhone} />
        <SummaryRow icon={Car} label="Vehicle" value={[claim.make_model, claim.reg].filter(Boolean).join(' — ') || ''} missing={!claim.make_model && !claim.reg} />
        <SummaryRow icon={MapPin} label="Vehicle Location" value={claim.vehicle_location} missing={!claim.vehicle_location} />

        {(isClientInsurer || isTpInsurer) && (
          <>
            <div className="pt-1.5 mt-1.5 border-t border-border" />
            <SummaryRow icon={Building2} label="Insurer" value={insurerName} missing={!insurerName} />
            <SummaryRow icon={FileText} label="Claim Reference" value={claimRef} missing={!claimRef} />
            <SummaryRow icon={FileText} label="Policy Number" value={policyNumber} />
            <SummaryRow icon={PoundSterling} label="Policy Excess (£)" value={policyExcess} />
            {isClientInsurer && (
              <>
                <SummaryRow icon={Mail} label="Email Estimate To" value={claim.send_estimate_email} />
                <SummaryRow icon={BadgePercent} label="Audatex Code" value={claim.audatex_code} />
              </>
            )}
          </>
        )}

        {isTpDirect && (
          <>
            <div className="pt-1.5 mt-1.5 border-t border-border" />
            <SummaryRow icon={User} label="Third Party Name" value={claim.tp_name} missing={!claim.tp_name} />
            <SummaryRow icon={MapPin} label="Third Party Address" value={claim.tp_address_line_1} />
          </>
        )}

        <div className="pt-1.5 mt-1.5 border-t border-border" />
        <SummaryRow icon={BadgePercent} label="Referral Fee (%)" value={claim.referral_fee_repairer} />
        <SummaryRow icon={PoundSterling} label="Referral Fee (£)" value={claim.referral_fee_repairer_gbp} />
      </div>

      {/* Inline-edit only the genuinely missing essentials */}
      {missingFields.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm text-amber-800 dark:text-amber-200">Missing essentials</h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Complete these to proceed, or fix the rest in the Instruction Pre-Check panel.
              </p>
            </div>
          </div>
          <div className="space-y-2 ml-6">
            {missingFields.map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">{field.label} *</label>
                {field.type === 'select' ? (
                  <select
                    value={validationData[field.key] || ''}
                    onChange={(e) => onValidationChange(field.key, e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-amber-300 bg-white text-sm"
                  >
                    <option value="">Select {field.label}...</option>
                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <Input
                    type={field.type === 'email' ? 'email' : 'text'}
                    value={validationData[field.key] || ''}
                    onChange={(e) => onValidationChange(field.key, e.target.value)}
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    className="border-amber-300 bg-white"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {missingFields.length === 0 && (
        <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <p className="text-xs text-green-800 dark:text-green-200 font-medium">All instruction details are complete — ready to generate the instruction.</p>
        </div>
      )}
    </div>
  );
}