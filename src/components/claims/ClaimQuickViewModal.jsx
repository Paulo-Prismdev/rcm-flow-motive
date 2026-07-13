import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { FileText, User, Shield, Wrench, Users, Car, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { formatUKRegistration } from '../shared/formatRegistration';
import StatusBadge from '../shared/StatusBadge';

const formatDate = (val) => {
  if (!val) return '—';
  try { return format(new Date(val), 'dd/MM/yyyy'); } catch { return val; }
};

const formatCurrency = (val) => {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'string') return val;
  const num = Number(val);
  return isNaN(num) ? '—' : `£${num.toLocaleString()}`;
};

const InfoRow = ({ label, value, href, fullWidth }) => {
  const isEmpty = !value || value === '—';
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
      {href && !isEmpty ? (
        <a href={href} className="text-sm font-medium text-blue-600 hover:underline break-all">{value}</a>
      ) : (
        <div className={`text-sm font-medium ${isEmpty ? 'text-muted-foreground/50' : 'text-foreground'} ${fullWidth ? 'whitespace-pre-wrap break-words' : ''}`}>{value || '—'}</div>
      )}
    </div>
  );
};

const Section = ({ icon: Icon, title, color, children }) => (
  <div className="border border-border rounded-lg overflow-hidden">
    <div className={`flex items-center gap-2 px-3 py-2 ${color}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
    <div className="p-3 grid grid-cols-2 gap-x-3 gap-y-2">
      {children}
    </div>
  </div>
);

export default function ClaimQuickViewModal({ claim, isOpen, onClose }) {
  if (!claim) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-primary" />
            Quick View — {claim.reg ? formatUKRegistration(claim.reg) : claim.job_number || 'Claim'}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {claim.client_name || '—'} · {claim.job_status || 'New'}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* Overview */}
          <Section icon={FileText} title="Claim Overview" color="bg-primary/10 text-primary">
            <InfoRow label="Job Number" value={claim.job_number} />
            <InfoRow label="Registration" value={claim.reg ? formatUKRegistration(claim.reg) : '—'} />
            <InfoRow label="Status" value={<StatusBadge status={claim.job_status || 'New'} />} />
            <InfoRow label="Claim Type" value={claim.claim_type} />
            <InfoRow label="Date of Loss" value={formatDate(claim.loss_date)} />
            <InfoRow label="Time of Loss" value={claim.loss_time} />
            {claim.incident_location && <InfoRow label="Incident Location" value={claim.incident_location} fullWidth />}
            {claim.circumstances && <InfoRow label="Circumstances" value={claim.circumstances} fullWidth />}
          </Section>

          {/* Client */}
          <Section icon={User} title="Client" color="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <InfoRow label="Name" value={claim.client_name} />
            <InfoRow label="Phone" value={claim.client_phone} href={claim.client_phone ? `tel:${claim.client_phone}` : null} />
            <InfoRow label="Email" value={claim.client_email} href={claim.client_email ? `mailto:${claim.client_email}` : null} />
            <InfoRow label="Business Division" value={claim.business_division} />
            {(claim.client_address_line_1 || claim.client_town || claim.client_postcode) && (
              <InfoRow label="Address" value={[claim.client_address_line_1, claim.client_address_line_2, claim.client_town, claim.client_county, claim.client_postcode].filter(Boolean).join(', ')} fullWidth />
            )}
          </Section>

          {/* Insurance */}
          <Section icon={Shield} title="Client's Insurance" color="bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
            <InfoRow label="Insurer" value={claim.insurer} />
            <InfoRow label="Claim Reference" value={claim.claim_ref} />
            <InfoRow label="Policy Number" value={claim.policy_number} />
            <InfoRow label="Policy Excess" value={formatCurrency(claim.policy_excess)} />
            <InfoRow label="Broker" value={claim.broker_name} />
          </Section>

          {/* Repairer */}
          <Section icon={Wrench} title="Repairer / Bodyshop" color="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <InfoRow label="Bodyshop" value={claim.bodyshop} />
            <InfoRow label="Bodyshop Email" value={claim.bodyshop_email} href={claim.bodyshop_email ? `mailto:${claim.bodyshop_email}` : null} />
            <InfoRow label="Repairer Accepted" value={claim.repairer_accepted ? `Yes (${formatDate(claim.repairer_accepted_date)})` : claim.bodyshop_id ? 'Pending' : '—'} />
            <InfoRow label="Vehicle Location" value={claim.vehicle_location} />
            <InfoRow label="Booking In Date" value={formatDate(claim.booking_in_date)} />
            <InfoRow label="ECD" value={formatDate(claim.ecd)} />
            <InfoRow label="Completion Date" value={formatDate(claim.completion_date)} />
          </Section>

          {/* Third Party */}
          {(claim.tp_name || claim.tp_reg || claim.tp_insurer || claim.tp_phone) && (
            <Section icon={Users} title="Third Party" color="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              <InfoRow label="TP Name" value={claim.tp_name} />
              <InfoRow label="TP Phone" value={claim.tp_phone} href={claim.tp_phone ? `tel:${claim.tp_phone}` : null} />
              <InfoRow label="TP Email" value={claim.tp_email} href={claim.tp_email ? `mailto:${claim.tp_email}` : null} />
              <InfoRow label="TP Driver / Contact" value={claim.tp_driver_contact} />
              <InfoRow label="TP Registration" value={claim.tp_reg} />
              <InfoRow label="TP Make / Model" value={claim.tp_make_model} />
              {(claim.tp_address_line_1 || claim.tp_town || claim.tp_postcode) && (
                <InfoRow label="TP Address" value={[claim.tp_address_line_1, claim.tp_address_line_2, claim.tp_town, claim.tp_county, claim.tp_postcode].filter(Boolean).join(', ')} fullWidth />
              )}
            </Section>
          )}

          {/* Third Party Insurance */}
          {(claim.tp_insurer || claim.tp_policy_number || claim.tp_claim_ref || claim.tp_broker_name) && (
            <Section icon={Shield} title="Third Party Insurance" color="bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
              <InfoRow label="TP Insurer" value={claim.tp_insurer} />
              <InfoRow label="TP Claim Reference" value={claim.tp_claim_ref} />
              <InfoRow label="TP Policy Number" value={claim.tp_policy_number} />
              <InfoRow label="TP Broker" value={claim.tp_broker_name} />
            </Section>
          )}

          {/* Vehicle */}
          <Section icon={Car} title="Vehicle" color="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
            <InfoRow label="Make / Model" value={claim.make_model} />
            <InfoRow label="Colour" value={claim.vehicle_colour} />
            <InfoRow label="Fuel Type" value={claim.vehicle_fuel_type} />
            <InfoRow label="MOT Status" value={claim.vehicle_mot_status} />
            <InfoRow label="MOT Expiry" value={formatDate(claim.vehicle_mot_expiry_date)} />
            <InfoRow label="Tax Status" value={claim.vehicle_tax_status} />
          </Section>

          {/* Key Dates */}
          <Section icon={Calendar} title="Key Dates" color="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <InfoRow label="Date Received" value={formatDate(claim.date_received)} />
            <InfoRow label="Loss Date" value={formatDate(claim.loss_date)} />
            <InfoRow label="Authority Received" value={formatDate(claim.authority_received)} />
            <InfoRow label="BS Instructed" value={formatDate(claim.bs_instructed)} />
            <InfoRow label="Booking In" value={formatDate(claim.booking_in_date)} />
            <InfoRow label="ECD" value={formatDate(claim.ecd)} />
            <InfoRow label="Completion" value={formatDate(claim.completion_date)} />
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}