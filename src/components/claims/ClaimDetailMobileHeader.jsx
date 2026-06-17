import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { formatUKRegistration } from '../shared/formatRegistration';
import StatusBadge from '../shared/StatusBadge';
import UpdateStatusBadge from '../shared/UpdateStatusBadge';

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
}) {
  const [sectionOpen, setSectionOpen] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (sectionRef.current && !sectionRef.current.contains(e.target)) {
        setSectionOpen(false);
      }
    };
    if (sectionOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sectionOpen]);

  const handleActionChange = (e) => {
    const val = e.target.value;
    e.target.value = '';
    if (val) onAction(val);
  };

  const currentSection = SECTIONS.find(s => s.value === claim._selectedSection) || SECTIONS[0];

  return (
    <div
      className="lg:hidden flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"
      style={{ position: 'relative', zIndex: 20, isolation: 'isolate' }}
    >
      {/* Row 1: back + title + primary actions */}
      <div className="flex items-center gap-2 px-3 pt-1.5 pb-1">
        <button
          type="button"
          onClick={onClose}
          style={{ minWidth: 48, minHeight: 48 }}
          className="flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">
            {formatUKRegistration(claim.reg) || 'Claim Details'}
          </p>
          {claim.job_number && (
            <p className="text-xs text-yellow-700 dark:text-yellow-400 font-mono font-semibold truncate">
              {claim.job_number}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onUpdates}
          style={{ minHeight: 48 }}
          className="flex-shrink-0 px-3 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
        >
          Updates
        </button>
        <button
          type="button"
          onClick={onChangeStatus}
          style={{ minHeight: 48 }}
          className="flex-shrink-0 px-3 text-sm font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg"
        >
          Status
        </button>
      </div>

      {/* Row 2: status badges */}
      <div className="flex items-center gap-2 px-3 py-0.5 flex-wrap">
        <StatusBadge status={claim.job_status || 'New'} />
        {claim.secondary_status && <StatusBadge status={claim.secondary_status} variant="secondary" />}
        {!isClosedStatus && claim.update_status_flag && (
          <button type="button" onClick={onUpdateTracking}>
            <UpdateStatusBadge status={claim.update_status_flag} small />
          </button>
        )}
        {claim.archived && (
          <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs text-gray-600">Archived</span>
        )}
      </div>

      {/* Row 3: native actions picker */}
      <div className="px-3 pb-1.5 pt-1">
        <select
          value=""
          onChange={handleActionChange}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3"
          style={{ height: 36, fontSize: 14 }}
        >
          <option value="" disabled>More Actions</option>
          <option value="notes">Internal Notes</option>
          <option value="docs">Documents</option>
          <option value="images">Images</option>
          <option value="timelogs">Time Logs</option>
          <option value="activity">Activity Log</option>
          <option value="email">Send Email</option>
          <option value="tasks">Manage Tasks</option>
          {claim.instruction_pdf_url && <option value="download_pdf">Download Instruction PDF</option>}
          <option value="estimate">Request Estimate</option>
          <option value="parts">Log Parts Issue</option>
          <option value="backorders">Backordered Parts</option>
          <option value="archive">{claim.archived ? 'Unarchive' : 'Archive'}</option>
          <option value="delete">Delete</option>
        </select>
      </div>

      {/* Row 4: custom section picker */}
      <div className="px-3 pb-2 relative" ref={sectionRef}>
        <button
          type="button"
          onClick={() => setSectionOpen(o => !o)}
          className="w-full flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3"
          style={{ height: 36, fontSize: 14 }}
        >
          <div className="flex items-center gap-2">
            <span>{currentSection.label}</span>
            {isEmpty(currentSection.value, claim) && (
              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            )}
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </button>
        {sectionOpen && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
            {SECTIONS.map(section => (
              <button
                key={section.value}
                type="button"
                onClick={() => { onAction('section:' + section.value); setSectionOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${claim._selectedSection === section.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-800 dark:text-gray-200'}`}
              >
                <span>{section.label}</span>
                {isEmpty(section.value, claim) && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}