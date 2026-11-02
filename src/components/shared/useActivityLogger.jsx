import { base44 } from '@/api/base44Client';

// Audit log helpers. Lines are written by the recordActivity server function, which
// stamps who made the change from the signed-in session — the browser can't write
// or alter the audit log directly. Lines raised in the same moment are sent in one call.
// (The `user` argument is kept so existing callers don't need changing; it's ignored.)

let queue = [];
let waiters = [];
let timer = null;

function flush() {
  const entries = queue;
  const done = waiters;
  queue = [];
  waiters = [];
  timer = null;
  base44.functions.invoke('recordActivity', { entries })
    .catch((error) => console.error('Failed to log activity:', error?.message || error))
    .finally(() => done.forEach((resolve) => resolve()));
}

function enqueue(entries) {
  if (!entries.length) return Promise.resolve();
  queue.push(...entries);
  const p = new Promise((resolve) => waiters.push(resolve));
  if (!timer) timer = setTimeout(flush, 0);
  return p;
}

const text = (v) => {
  if (v === undefined || v === null) return '';
  return typeof v === 'string' ? v : (typeof v === 'object' ? JSON.stringify(v) : String(v));
};

const toEntry = ({ parentId, parentType, action, fieldName, oldValue, newValue, description }) => ({
  parent_id: parentId,
  parent_type: parentType,
  action,
  field_name: fieldName || '',
  old_value: text(oldValue),
  new_value: text(newValue),
  description: description || '',
});

// Log one line. Never throws.
export function logActivity(entry) {
  if (!entry?.parentId || !entry?.parentType) return Promise.resolve();
  return enqueue([toEntry(entry)]);
}

const SKIP = ['id', 'created_date', 'updated_date', 'created_by', 'invoice_tracker'];
const same = (a, b) => {
  if (a === b) return true;
  const blank = (v) => v === null || v === undefined || v === '';
  if (blank(a) && blank(b)) return true;
  if (typeof a === 'object' || typeof b === 'object') return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  return false;
};

// Compare two versions of a record and log one line per changed field. Never throws.
export function logChanges({ parentId, parentType, oldData = {}, newData = {}, fieldLabels = {} }) {
  const entries = [];
  for (const key of Object.keys(newData || {})) {
    // The invoicing tracker logs its own, more meaningful lines, so its raw state is skipped.
    if (SKIP.includes(key)) continue;
    if (same(oldData?.[key], newData[key])) continue;
    const label = fieldLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    entries.push(toEntry({
      parentId, parentType, action: 'Field Updated', fieldName: label,
      oldValue: oldData?.[key], newValue: newData[key], description: `Changed ${label}`,
    }));
  }
  return enqueue(entries);
}

// Log that a record was deleted, with a short summary of what it was. Never throws.
export function logDeletion({ parentId, parentType, label, details }) {
  return logActivity({
    parentId, parentType, action: 'Deleted',
    oldValue: details, newValue: '',
    description: `Deleted ${label || parentType.toLowerCase()}`,
  });
}
