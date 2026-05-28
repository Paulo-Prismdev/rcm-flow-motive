import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { formatUKRegistration } from '../shared/formatRegistration';
import StatusBadge from '../shared/StatusBadge';
import UpdateStatusBadge from '../shared/UpdateStatusBadge';

export default function ClaimDetailMobileHeader({
  claim,
  isClosedStatus,
  onClose,
  onUpdates,
  onChangeStatus,
  onUpdateTracking,
  onAction,
}) {
  const handleActionChange = (e) => {
    const val = e.target.value;
    e.target.value = '';
    if (val) onAction(val);
  };

  return (
    <div
      className="lg:hidden flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"
      style={{ position: 'relative', zIndex: 20, isolation: 'isolate' }}
    >
      {/* Row 1: back + title + primary actions */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
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
      <div className="flex items-center gap-2 px-3 py-1 flex-wrap">
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
      <div className="px-3 pb-3 pt-1">
        <select
          value=""
          onChange={handleActionChange}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3"
          style={{ height: 44, fontSize: 15 }}
        >
          <option value="" disabled>More Actions</option>
          <option value="notes">Internal Notes</option>
          <option value="docs">Documents</option>
          <option value="images">Images</option>
          <option value="timelogs">Time Logs</option>
          <option value="activity">Activity Log</option>
          <option value="email">Send Email</option>
          <option value="tasks">Manage Tasks</option>
          <option value="instructions">Generate Instructions</option>
          {claim.instruction_pdf_url && <option value="download_pdf">Download Instruction PDF</option>}
          <option value="estimate">Request Estimate</option>
          <option value="parts">Log Parts Issue</option>
          <option value="backorders">Backordered Parts</option>
          <option value="archive">{claim.archived ? 'Unarchive' : 'Archive'}</option>
          <option value="delete">Delete</option>
        </select>
      </div>

      {/* Row 4: native section picker */}
      <div className="px-3 pb-3">
        <select
          value={claim._selectedSection}
          onChange={(e) => onAction('section:' + e.target.value)}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3"
          style={{ height: 44, fontSize: 15 }}
        >
          <option value="status">Status &amp; Overview</option>
          <option value="thirdpartyPursuit">Third Party Pursuit</option>
          <option value="client">Client Details</option>
          <option value="vehicle">Vehicle Details</option>
          <option value="vehicleDamage">Vehicle Damage</option>
          <option value="insurance">Insurance Details</option>
          <option value="excessContribution">Excess Contribution</option>
          <option value="referrer">Referrer Details</option>
          <option value="indemnity">Indemnity Details</option>
          <option value="thirdparty">Third Party Details</option>
          <option value="financials">Financials</option>
          <option value="dates">Key Dates</option>
          <option value="bodyshop">Bodyshop Details</option>
          <option value="estimate">Estimate Details</option>
          <option value="backorderedParts">Backordered Parts</option>
        </select>
      </div>
    </div>
  );
}