// How well a repairer fits THIS job, for the allocation screens. Each check says
// good / warn / unknown (we don't hold the detail yet) / info, with a short line.
import { authorisingInsurerName, normaliseInsurerName } from '@/components/shared/insurerDirectory';
import { normalizeCourtesyCar } from '@/components/shared/courtesyCarOptions';

export const COUNT_LABEL = { '1-5': '1–5', '6-10': '6–10', '10+': '10+' };

const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);

export function vehicleMake(claim) {
  const make = String(claim?.vehicle_make || '').trim() || String(claim?.make_model || '').trim().split(/\s+/)[0] || '';
  return make.replace(/[^A-Za-z0-9-]/g, '') ? make : '';
}

// Does a free-text approvals list mention this name? ("Ford, VW Group" + "Ford" → yes)
function mentions(list, name) {
  const target = words(name);
  if (!target.length) return false;
  const hay = ` ${words(list).join(' ')} `;
  return hay.includes(` ${target.join(' ')} `);
}

export function radiusMiles(bodyshop) {
  const n = parseFloat(String(bodyshop?.radius_covered || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function courtesyLine(b) {
  if (b?.courtesy_cars_offered !== 'Yes') return '';
  const parts = [b.courtesy_car_count ? `${COUNT_LABEL[b.courtesy_car_count] || b.courtesy_car_count} cars` : '', (b.courtesy_car_types || []).join(', ')];
  return parts.filter(Boolean).join(' · ');
}

/**
 * @returns [{ key, label, state: 'good'|'warn'|'unknown'|'info', text }]
 */
export function repairerFit(b, claim, { distanceMiles = null } = {}) {
  if (!b) return [];
  const checks = [];

  // Courtesy car
  const needsCar = normalizeCourtesyCar(claim?.courtesy_car_required) === 'Yes';
  if (b.courtesy_cars_offered === 'Yes') {
    checks.push({ key: 'courtesy', label: 'Courtesy car', state: needsCar ? 'good' : 'info', text: courtesyLine(b) || 'Provides courtesy cars' });
  } else if (b.courtesy_cars_offered === 'No') {
    checks.push({ key: 'courtesy', label: 'Courtesy car', state: needsCar ? 'warn' : 'info', text: needsCar ? 'No courtesy cars — this client needs one' : 'No courtesy cars' });
  } else {
    checks.push({ key: 'courtesy', label: 'Courtesy car', state: needsCar ? 'unknown' : 'info', text: needsCar ? "Client needs one — we don't know if they provide them" : 'Not known' });
  }

  // Vehicle size
  const type = claim?.vehicle_type;
  const largest = String(b.largest_vehicle_repairable || '').trim();
  if (largest) {
    const big = /van|hgv|truck|lorry|bus|coach|commercial|tonne|\dt\b|sprinter|transit|motorhome/i.test(largest);
    const mismatch = (type === 'Van' || type === 'HGV') && !big;
    checks.push({ key: 'vehicle', label: 'Vehicle size', state: mismatch ? 'warn' : 'good', text: `Up to ${largest}${type && type !== 'Car' ? ` — this job is a ${type.toLowerCase()}` : ''}` });
  } else {
    checks.push({ key: 'vehicle', label: 'Vehicle size', state: type && type !== 'Car' ? 'unknown' : 'info', text: `Largest vehicle not known${type && type !== 'Car' ? ` — this job is a ${type.toLowerCase()}` : ''}` });
  }

  // Manufacturer approval
  const make = vehicleMake(claim);
  if (make) {
    if (!String(b.manufacturer_approvals || '').trim()) checks.push({ key: 'make', label: `${make} approved`, state: 'unknown', text: 'Manufacturer approvals not known' });
    else if (mentions(b.manufacturer_approvals, make)) checks.push({ key: 'make', label: `${make} approved`, state: 'good', text: `Approved for ${make}` });
    else checks.push({ key: 'make', label: `${make} approved`, state: 'info', text: `Not listed for ${make} (${b.manufacturer_approvals})` });
  }

  // Insurer approval (the insurer paying for the job)
  const insurer = authorisingInsurerName(claim);
  if (insurer) {
    const short = normaliseInsurerName(insurer) || insurer;
    if (!String(b.insurer_approvals || '').trim()) checks.push({ key: 'insurer', label: 'Insurer approved', state: 'unknown', text: 'Insurer approvals not known' });
    else if (mentions(b.insurer_approvals, short)) checks.push({ key: 'insurer', label: 'Insurer approved', state: 'good', text: `Approved by ${insurer}` });
    else checks.push({ key: 'insurer', label: 'Insurer approved', state: 'info', text: `Not listed for ${insurer}` });
  }

  // Their coverage radius
  const radius = radiusMiles(b);
  if (radius && distanceMiles != null) {
    const outside = distanceMiles > radius;
    checks.push({ key: 'radius', label: 'Coverage', state: outside ? 'warn' : 'good', text: outside ? `Outside their ${radius}-mile radius (≈${Math.round(distanceMiles)} mi away)` : `Within their ${radius}-mile radius` });
  } else if (!radius) {
    checks.push({ key: 'radius', label: 'Coverage', state: 'info', text: 'Radius covered not known' });
  }

  return checks;
}

/** How many of the details we'd want are missing (to nudge sending the details form). */
export function missingDetailsCount(b) {
  const keys = ['courtesy_cars_offered', 'largest_vehicle_repairable', 'adas', 'jig', 'manufacturer_approvals', 'insurer_approvals', 'radius_covered', 'referral_email'];
  return keys.filter((k) => !String(b?.[k] ?? '').trim()).length;
}

// Quick filters for the repairer list.
export const REPAIRER_FILTERS = [
  { key: 'courtesy', label: 'Courtesy cars', test: (b) => b.courtesy_cars_offered === 'Yes' },
  { key: 'tier1', label: 'Tier 1', test: (b) => /tier\s*1/i.test(b.tier || '') },
  { key: 'acg', label: 'ACG', test: (b) => b.acg_signed_up === 'Yes' },
  { key: 'adas', label: 'ADAS in house', test: (b) => b.adas === 'In House' },
  { key: 'bs10125', label: 'BS 10125', test: (b) => b.bs10125_certified === 'Yes' },
];
export const applyRepairerFilters = (list, active) => {
  const tests = REPAIRER_FILTERS.filter((f) => active?.[f.key]).map((f) => f.test);
  return tests.length ? list.filter((b) => tests.every((t) => t(b))) : list;
};
