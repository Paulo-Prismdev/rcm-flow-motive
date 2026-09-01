import React from 'react';
import { ArrowLeft, ChevronDown, FileText, Image, Mail, ListTodo, Timer, History, Package, Download, Archive, Trash2, Calculator, Copy } from 'lucide-react';
import { formatUKRegistration } from '../shared/formatRegistration';
import StatusBadge from '../shared/StatusBadge';
import UpdateStatusBadge from '../shared/UpdateStatusBadge';
import { computeUpdateStatusFlag, computeClientCommStatusFlag } from '../shared/claimStatusUpdate';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SECTION_FIELDS = {
  status: ['claim_type', 'loss_date', 'vehicle_use', 'incident_location', 'circumstances'],
  client: ['client_name', 'client_phone', 'client_email', 'client_address_line_1', 'client_town', 'client_postcode', 'business_division'],
  insurance: ['insurer', 'claim_ref', 'policy_number', 'policy_excess'],
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
  const fields = SECTION_FIELDS[sectionId] || [];
  return fields.some(f => {
    const val = claim[f];
    return val === null || val === undefined || val === '' || val === 0;
  });
};

const SECTIONS = [
  { value: 'status', label: 'Status & Overview' },
  { value: 'thirdpartyPursuit', label: 'Third Party Pursuit' },
  { value: 'client', label: 'Client Details' },
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

export default function ClaimDetailMobileHeader({
  claim,
  isClosedStatus,
  onClose,
  onUpdates,
  onChangeStatus,
  onUpdateTracking,
  onAction,
  updatesCount = 0,
  imagesCount = 0,
  docsCount = 0,
}) {
  const currentSection = SECTIONS.find(s => s.value === claim._selectedSection) || SECTIONS[0];

  return (
    <div
      className="lg:hidden flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"
      style={{ position: 'relative', zIndex: 20, isolation: 'isolate' }}
    >
      {/* Row 1: back + title + status badges */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        <button
          type="button"
          onClick={onClose}
          style={{ minWidth: 44, minHeight: 44 }}
          className="flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">
            {claim.reg || 'Claim Details'}
          </p>
          {claim.job_number && (
            <p className="text-xs text-yellow-700 dark:text-yellow-400 font-mono font-semibold truncate">
              {claim.job_number}
            </p>
          )}
        </div>
      </div>

      {/* Row 2: status badges */}
      <div className="flex items-center gap-2 px-3 py-1 flex-wrap">
        {claim.secondary_status && <StatusBadge status={claim.secondary_status} />}
        {claim.tertiary_status && <StatusBadge status={claim.tertiary_status} variant="secondary" />}
        {!isClosedStatus && claim.update_status_flag && (
          <button type="button" onClick={onUpdateTracking}>
            <UpdateStatusBadge status={computeUpdateStatusFlag(claim)} small labelPrefix="Updates" />
          </button>
        )}
        {!isClosedStatus && claim.client_comm_status_flag && (
          <button type="button" onClick={onUpdateTracking}>
            <UpdateStatusBadge status={computeClientCommStatusFlag(claim)} small labelPrefix="Client" />
          </button>
        )}
        {claim.archived && (
          <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs text-gray-600">Archived</span>
        )}
      </div>

      {/* Row 3: Updates & Status + Images + Docs + More dropdown */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-1 flex-wrap">
        <Button onClick={onUpdates} className="h-9 px-3 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white flex-shrink-0 relative">
          Updates & Status
          {updatesCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-green-700 text-[10px] font-bold flex items-center justify-center leading-none shadow">
              {updatesCount}
            </span>
          )}
        </Button>
        <Button onClick={() => onAction('images')} variant="outline" className="h-9 px-3 text-sm font-medium rounded-lg gap-1.5 flex-shrink-0 relative">
          <Image className="w-4 h-4" /> Images
          {imagesCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow">
              {imagesCount}
            </span>
          )}
        </Button>
        <Button onClick={() => onAction('docs')} variant="outline" className="h-9 px-3 text-sm font-medium rounded-lg gap-1.5 flex-shrink-0 relative">
          <FileText className="w-4 h-4" /> Docs
          {docsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow">
              {docsCount}
            </span>
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 w-9 p-0 flex-shrink-0">
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-72 overflow-y-auto">
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onAction('section:' + currentSection.value); }} className="font-medium bg-muted/50">
              <span>Current Section:</span>
              <span className="ml-2 text-muted-foreground">{currentSection.label}</span>
            </DropdownMenuItem>
            {SECTIONS.map(section => (
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
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onAction('notes'); }}><FileText className="w-4 h-4 mr-2" />Internal Updates</DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onAction('timelogs'); }}><Timer className="w-4 h-4 mr-2" />Time Logs</DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onAction('activity'); }}><History className="w-4 h-4 mr-2" />Activity Log</DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onAction('email'); }}><Mail className="w-4 h-4 mr-2" />Send Email</DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onAction('tasks'); }}><ListTodo className="w-4 h-4 mr-2" />Manage Tasks</DropdownMenuItem>
            {claim.instruction_pdf_url && <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onAction('download_pdf'); }}><Download className="w-4 h-4 mr-2" />Download Instruction PDF</DropdownMenuItem>}
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onAction('estimate'); }}><Calculator className="w-4 h-4 mr-2" />Request Estimate</DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onAction('parts'); }}><Package className="w-4 h-4 mr-2" />Log Parts Issue</DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onAction('backorders'); }}><Package className="w-4 h-4 mr-2" />Backordered Parts</DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onAction('duplicate'); }}><Copy className="w-4 h-4 mr-2" />Duplicate Claim</DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onAction('archive'); }}><Archive className="w-4 h-4 mr-2" />{claim.archived ? 'Unarchive' : 'Archive'}</DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onAction('delete'); }} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}