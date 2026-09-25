// Shared courtesy car options used across claim forms, the instruction
// pre-check, and PDF generation. Replaces the legacy boolean field.
export const COURTESY_CAR_OPTIONS = [
  'Yes',
  'No',
  'No - Insurer Providing',
  'No - Credit Hire Provided',
  'No - Client Hiring Own',
];

export const COURTESY_CAR_DEFAULT = 'No';

// Normalize legacy boolean values (and any unexpected input) to the enum.
export function normalizeCourtesyCar(value) {
  if (value === true) return 'Yes';
  if (value === false || value === null || value === undefined) return 'No';
  if (typeof value === 'string') {
    return COURTESY_CAR_OPTIONS.includes(value) ? value : 'No';
  }
  return 'No';
}