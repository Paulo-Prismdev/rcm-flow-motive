// Central definition of the claim document checklist and status logic.
// Shared between the DocumentTracker UI and (mirrored in) backend functions.

// `dateField` links a checklist item to the Key Dates field it supplies, so the
// date entered against a document is written straight to that claim field (and
// is the same value shown on the Key Dates screen). Items without a matching
// Key Dates field carry no dateField.
export const DOC_ITEMS = [
  { key: 'instruction_from_referrer', label: 'Claim Form', required: true, dateField: { field: 'date_received', label: 'Date Received' } },
  { key: 'instruction_to_repairer', label: 'Instruction To Repairer', required: true, dateField: { field: 'bs_instructed', label: 'Bodyshop Instructed' } },
  { key: 'initial_estimate', label: 'Initial Estimate', required: true, dateField: { field: 'estimate_completed', label: 'Estimate Completed' } },
  { key: 'initial_authority', label: 'Initial Authority', required: true, dateField: { field: 'authority_received', label: 'Authority Received' } },
  { key: 'supplementary_estimate', label: 'Supplementary Estimate', required: false },
  { key: 'supplementary_authority', label: 'Supplementary Authority', required: false },
];

export const DOC_ITEM_KEYS = DOC_ITEMS.map((i) => i.key);

/**
 * The Key Dates value an item supplies, if it supplies one. It lives on the
 * claim field, so this is the same value the Key Dates screen shows.
 */
export const itemKeyDate = (item, claim) =>
  (item?.dateField ? claim?.[item.dateField.field] : null);

export const DOC_STATUS_META = {
  received: { label: 'received', color: 'green', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  outstanding: { label: 'outstanding', color: 'amber', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  not_applicable: { label: 'n/a', color: 'gray', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', dot: 'bg-gray-400' },
  not_required: { label: 'optional', color: 'blue', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-300', dot: 'bg-blue-400' },
};

/**
 * Compute the effective status for a single item.
 * @param {object} item  - DOC_ITEMS entry
 * @param {array}  files - ClaimDocument records for this claim
 * @param {object} statusMap - claim.doc_checklist_status map
 */
export function getItemStatus(item, files, statusMap = {}) {
  const hasFiles = files.some((f) => f.item_key === item.key);
  if (hasFiles) return 'received';
  const stored = statusMap[item.key];
  if (stored === 'not_applicable') return 'not_applicable';
  if (stored === 'outstanding') return 'outstanding'; // explicitly expected (supplementary)
  if (stored === 'not_required') return 'not_required';
  // No stored override
  return item.required ? 'outstanding' : 'not_required';
}

/**
 * Compute the full checklist summary for a claim.
 * @returns {{ items: Array<{item, status}>, received, total, complete }}
 */
export function computeChecklistSummary(files, statusMap = {}) {
  const items = DOC_ITEMS.map((item) => ({
    item,
    status: getItemStatus(item, files, statusMap),
  }));
  // Items that count toward the total: required items, plus supplementary
  // items that are either expected (outstanding) or received.
  const counted = items.filter(
    ({ status }) => status === 'received' || status === 'outstanding'
  );
  const received = items.filter(({ status }) => status === 'received').length;
  const total = counted.length;
  const complete = total === 0 ? false : received === total;
  return { items, received, total, complete };
}