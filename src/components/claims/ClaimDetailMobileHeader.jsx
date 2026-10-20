import React from 'react';
import { ArrowLeft, FileText, Image, MessageSquare, MoreHorizontal, Mail, ListTodo, Timer, History, Package, Download, Archive, Trash2, Calculator, Copy } from 'lucide-react';
import StatusBadge from '../shared/StatusBadge';
import UpdateStatusBadge from '../shared/UpdateStatusBadge';
import { excessAnswered } from '../shared/excessState';
import AuthorisingPartyBanner from './AuthorisingPartyBanner';
import { computeUpdateStatusFlag, computeClientCommStatusFlag } from '../shared/claimStatusUpdate';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SECTION_FIELDS = {
  status: ['claim_type', 'loss_date', 'vehicle_use', 'incident_location', 'circumstances'],
  client: ['client_name', 'client_phone', 'client_email', 'client_address_line_1', 'client_town', 'client_postcode', 'business_division', 'broker_name', 'insurer', 'claim_ref', 'policy_number', 'policy_excess'],
  creditRepair: ['credit_repair_company_name', 'credit_repair_company_contact_name', 'credit_repair_company_phone', 'credit_repair_company_email', 'credit_repair_company_account_ref'],
  driver: ['driver_contact_name', 'driver_contact_phone', 'driver_contact_email'],
  estimate: ['audatex_code', 'est_fee', 'authorising_party', 'estimate_cost_net', 'authority_cost_net', 'estimate_cost_gross', 'authority_cost_gross'],
  thirdParty: ['tp_name', 'tp_phone', 'tp_reg', 'tp_insurer'],
  vehicle: ['make_model', 'vehicle_colour', 'vehicle_fuel_type', 'vehicle_type'],
  vehicleLocation: ['vehicle_location'],
  vehicleDamage: ['vehicle_damage'],
  referrer: ['referrer', 'referrer_ref', 'file_handler'],
  bodyshop: ['bodyshop'],
  financials: ['estimate_cost_net', 'authority_cost_net', 'final_repair_cost'],
  dates: ['date_received', 'loss_date', 'booking_in_date', 'completion_date'],
  excessContribution: ['excess_contribution_amount', 'excess_contribution_method'],
  indemnity: ['indemnity_driver_dob', 'indemnity_registered_owner'],
};

const isEmpty = (sectionId, claim) => {
  // "No Referrer" is a deliberate choice — not missing data
  if (sectionId === 'referrer' && !claim.referrer_id) return false;
  // "None" excess contribution method means not applicable — not missing data
  if (sectionId === 'excessContribution' && (!claim.excess_contribution_method || claim.excess_contribution_method === 'None')) return false;
  // A figure, Waived or TBC on authority are all answers — never a gap.
  const fields = (SECTION_FIELDS[sectionId] || [])
    .filter(f => !(f === 'policy_excess' && excessAnswered(claim)));
  return fields.some(f => {
    const val = claim[f];
    return val === null || val === undefined || val === '' || val === 0;
  });
};

const SECTIONS = [
  { value: 'status', label: 'Status & Overview' },
  { value: 'thirdpartyPursuit', label: 'Third Party Pursuit' },
  { value: 'client', label: 'Client Details' },
  { value: 'creditRepair', label: 'Credit Repair' },
  { value: 'driver', label: 'Driver Details' },
  { value: 'thirdParty', label: 'Third Party Details' },
  { value: 'vehicle', label: 'Vehicle Details' },
  { value: 'vehicleDamage', label: 'Vehicle Damage' },
  { value: 'vehicleLocation', label: 'Vehicle Location' },
  { value: 'excessContribution', label: 'Excess Contribution' },
  { value: 'referrer', label: 'Referrer Details' },
  { value: 'indemnity', label: 'Indemnity Details' },
  { value: 'financials', label: 'Financials' },
  { value: 'dates', label: 'Key Dates' },
  { value: 'bodyshop', label: 'Bodyshop Details' },
  { value: 'estimate', label: 'Estimate Details' },
  { value: 'backorderedParts', label: 'Backordered Parts' },
];

const CountBadge = ({ count, className }) => {
  if (!count) return null;
  return (
    <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none shadow ${className}`}>
      {count}
    </span>
  );
};

export default function ClaimDetailMobileHeader({
  claim,
  isClosedStatus,
  onClose,
  onUpdates,
  onUpdateTracking,
  onAction,
  updatesCount = 0,
  imagesCount = 0,
  docsCount = 0,
  collapsed = false,
}) {
  const currentSection = SECTIONS.find(s => s.value === claim._selectedSection) || SECTIONS[0];

  const actionBase = 'tap-44-y flex-1 min-w-0 flex flex-col items-center justify-center rounded-lg transition-colors';
  const actionSize = collapsed ? 'h-9' : 'h-12';

  return (
    <div
      data-claim-header
      className="lg:hidden sticky top-0 flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"
      style={{ isolation: 'isolate' }}
    >
      {/* Row 1: back arrow, registration and claim number */}
      <div className="flex items-center gap-2 px-3 pb-1.5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="tap-44 flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 transition-all active:scale-95 active:bg-gray-300 dark:active:bg-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <p className="font-bold text-[15px] leading-tight truncate m-ellipsis">
            {claim.reg || 'Claim Details'}
          </p>
          {claim.job_number && (
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 whitespace-nowrap flex-shrink-0">
              {claim.job_number}
            </span>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Authorising party — always shown in full, three tight lines */}
          <div className="px-3 pb-1.5">
            <AuthorisingPartyBanner claim={claim} compact />
          </div>

          {/* Status pills — job statuses on their own line(s), tracking on the line below */}
          <div className="px-3 pb-2 space-y-1">
            {(claim.secondary_status || claim.tertiary_status || claim.archived) && (
              <div className="flex flex-wrap items-center gap-1">
                {claim.secondary_status && <StatusBadge status={claim.secondary_status} />}
                {claim.tertiary_status && <StatusBadge status={claim.tertiary_status} variant="secondary" />}
                {claim.archived && (
                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs text-gray-600">Archived</span>
                )}
              </div>
            )}
            {!isClosedStatus && (claim.update_status_flag || claim.client_comm_status_flag) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {claim.update_status_flag && (
                  <button type="button" onClick={onUpdateTracking} className="tap-44-up">
                    <UpdateStatusBadge status={computeUpdateStatusFlag(claim)} small labelPrefix="Updates" />
                  </button>
                )}
                {claim.client_comm_status_flag && (
                  <button type="button" onClick={onUpdateTracking} className="tap-44-up">
                    <UpdateStatusBadge status={computeClientCommStatusFlag(claim)} small labelPrefix="Client" />
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Action row — four equal buttons, one line only */}
      <div className={`flex items-stretch gap-1.5 flex-nowrap px-3 ${collapsed ? 'pb-1.5' : 'pb-2'}`}>
        <button type="button" onClick={onUpdates} className={`${actionBase} ${actionSize} bg-green-600 hover:bg-green-700 text-white`}>
          <MessageSquare className="w-4 h-4" />
          {!collapsed && <span className="text-[10px] font-medium leading-none">Updates</span>}
          <CountBadge count={updatesCount} className="bg-white text-green-700" />
        </button>
        <button type="button" onClick={() => onAction('images')} className={`${actionBase} ${actionSize} border border-border bg-card text-foreground`}>
          <Image className="w-4 h-4" />
          {!collapsed && <span className="text-[10px] font-medium leading-none">Images</span>}
          <CountBadge count={imagesCount} className="bg-blue-500 text-white" />
        </button>
        <button type="button" onClick={() => onAction('docs')} className={`${actionBase} ${actionSize} border border-border bg-card text-foreground`}>
          <FileText className="w-4 h-4" />
          {!collapsed && <span className="text-[10px] font-medium leading-none">Docs</span>}
          <CountBadge count={docsCount} className="bg-blue-500 text-white" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={`${actionBase} ${actionSize} border border-border bg-card text-foreground`}>
              <MoreHorizontal className="w-4 h-4" />
              {!collapsed && <span className="text-[10px] font-medium leading-none">More</span>}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-72 overflow-y-auto">
            <DropdownMenuItem onSelect={() => { onAction('section:' + currentSection.value); }} className="font-medium bg-muted/50">
              <span>Current Section:</span>
              <span className="ml-2 text-muted-foreground">{currentSection.label}</span>
            </DropdownMenuItem>
            {SECTIONS.filter(s => s.value !== 'creditRepair' || claim.claim_type === 'Credit Repair').map(section => (
              <DropdownMenuItem
                key={section.value}
                onSelect={() => { onAction('section:' + section.value); }}
                className={claim._selectedSection === section.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}
              >
                <span className="flex-1">{section.label}</span>
                {isEmpty(section.value, claim) && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 ml-2" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onSelect={() => { onAction('notes'); }}><FileText className="w-4 h-4 mr-2" />Internal Updates</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { onAction('timelogs'); }}><Timer className="w-4 h-4 mr-2" />Time Logs</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { onAction('activity'); }}><History className="w-4 h-4 mr-2" />Activity Log</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { onAction('email'); }}><Mail className="w-4 h-4 mr-2" />Send Email</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { onAction('tasks'); }}><ListTodo className="w-4 h-4 mr-2" />Manage Tasks</DropdownMenuItem>
            {claim.instruction_pdf_url && <DropdownMenuItem onSelect={() => { onAction('download_pdf'); }}><Download className="w-4 h-4 mr-2" />Download Instruction PDF</DropdownMenuItem>}
            <DropdownMenuItem onSelect={() => { onAction('download_overview'); }}><FileText className="w-4 h-4 mr-2" />Download File Overview</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { onAction('estimate'); }}><Calculator className="w-4 h-4 mr-2" />Request Estimate</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { onAction('parts'); }}><Package className="w-4 h-4 mr-2" />Log Parts Issue</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { onAction('backorders'); }}><Package className="w-4 h-4 mr-2" />Backordered Parts</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { onAction('duplicate'); }}><Copy className="w-4 h-4 mr-2" />Duplicate Claim</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { onAction('archive'); }}><Archive className="w-4 h-4 mr-2" />{claim.archived ? 'Unarchive' : 'Archive'}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { onAction('delete'); }} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}