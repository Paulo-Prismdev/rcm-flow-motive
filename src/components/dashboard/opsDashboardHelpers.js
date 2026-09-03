import { computeUpdateStatusFlag, computeClientCommStatusFlag } from '@/components/shared/claimStatusUpdate';
import { isExceptionJourney } from '@/components/shared/claimStatusV2';

export const PIPELINE_STAGES = [
  { key: 'new', label: 'New', color: '#3b82f6' },
  { key: 'estimate', label: 'Estimate', color: '#a855f7' },
  { key: 'authority', label: 'Authority', color: '#f59e0b' },
  { key: 'instructed', label: 'Instructed', color: '#6366f1' },
  { key: 'on_site', label: 'On-Site', color: '#06b6d4' },
  { key: 'handover', label: 'Hand-Over', color: '#0d9488' },
  { key: 'complete', label: 'Complete', color: '#22c55e' },
];

export function getPipelineStage(claim) {
  const journey = claim.journey_status || claim.job_status;
  const secondary = claim.secondary_status;
  if (isExceptionJourney(journey)) return null;
  if (journey === 'Claim Complete' || secondary === 'File Complete') return 'complete';
  if (journey === 'Returned to Customer' || journey === 'Repairs Complete' || secondary === 'Quality Check' || secondary === 'Completed') return 'handover';
  if (journey === 'On-Site' || (claim.on_site_date && !claim.hand_over_date) || secondary === 'In Repair') return 'on_site';
  if (journey === 'Booked In' || secondary === 'Booked In' || secondary === 'Placed With Repairer') return 'instructed';
  if (secondary === 'Authorised' || secondary === 'Awaiting Sup Authority') return 'authority';
  if (['Awaiting Estimate', 'Awaiting Private Estimate', 'Waiting Indemnity Details', 'Awaiting Engineer'].includes(secondary)) return 'estimate';
  return 'new';
}

export function getClaimValue(claim) {
  return claim.final_repair_cost || claim.authority_cost_gross || claim.estimate_cost_gross || 0;
}

export function isOpenClaim(claim) {
  if (claim.archived || claim.draft) return false;
  const journey = claim.journey_status || claim.job_status;
  if (journey === 'Claim Complete' || journey === 'Cancelled') return false;
  return true;
}

export function isOverdueClaim(claim) {
  return computeUpdateStatusFlag(claim) === 'Red' || computeClientCommStatusFlag(claim) === 'Red';
}

export function isCommOverdue(claim) {
  return computeClientCommStatusFlag(claim) === 'Red';
}

export function isWarningClaim(claim) {
  const flag = computeUpdateStatusFlag(claim);
  const commFlag = computeClientCommStatusFlag(claim);
  return flag === 'Amber' || commFlag === 'Amber';
}

export function getCountdownHours(claim) {
  const now = Date.now();
  const deadlines = [];
  if (claim.next_update_due_at) deadlines.push(new Date(claim.next_update_due_at).getTime());
  if (claim.next_client_comm_due_at) deadlines.push(new Date(claim.next_client_comm_due_at).getTime());
  if (!deadlines.length) return null;
  return (Math.min(...deadlines) - now) / 3600000;
}

export function getInactiveHours(claim) {
  const ref = claim.last_updated_at || claim.last_file_update || claim.created_date;
  if (!ref) return Infinity;
  return (Date.now() - new Date(ref).getTime()) / 3600000;
}

export function formatGBP(value) {
  if (!value || isNaN(value)) return '£0';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value);
}

export function formatCompactGBP(value) {
  if (!value || isNaN(value)) return '£0';
  if (value >= 1000000) return '£' + (value / 1000000).toFixed(1) + 'M';
  if (value >= 1000) return '£' + (value / 1000).toFixed(1) + 'k';
  return '£' + Math.round(value);
}

export function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + 'd ago';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-teal-100 text-teal-700', 'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700',
  'bg-cyan-100 text-cyan-700',
];
export function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function matchesHandler(claim, user) {
  if (!user) return false;
  return claim.file_handler === user.full_name || claim.file_handler === user.email;
}