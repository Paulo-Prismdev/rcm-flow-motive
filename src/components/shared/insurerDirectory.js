// The insurer directory, as a claim sees it.
// Claims hold the insurer by NAME (claim.insurer / claim.tp_insurer), typed or picked,
// so names drift from the directory: "Direct Line" vs "Direct Line Insurance",
// "AVIVA INSURANCE LIMITED" vs "Aviva Insurance". Matching ignores case, punctuation
// and filler words, then falls back to one name starting with the other.
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { deriveAuthorisingParty } from './authorisingParty';

const FILLER = new Set(['insurance', 'insurances', 'insurers', 'insurer', 'insurnace', 'ltd', 'limited', 'plc', 'uk', 'co', 'company', 'the', 'motor', 'direct', 'services', 'group', 'in']);
// "direct" is filler only after another word ("Hastings Direct"), never "Direct Line".
const words = (name) => String(name || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);

export function normaliseInsurerName(name) {
  const w = words(name);
  const kept = w.filter((x, i) => !(FILLER.has(x) && !(x === 'direct' && i === 0)));
  return (kept.length ? kept : w).join(' ');
}

export function findInsurer(insurers, name) {
  if (!name || !Array.isArray(insurers) || !insurers.length) return null;
  const target = normaliseInsurerName(name);
  if (!target || target === 'tbc') return null;
  const named = insurers.filter((i) => i?.name && normaliseInsurerName(i.name) !== 'tbc');
  const raw = String(name).trim().toLowerCase();
  const same = named.find((i) => i.name.trim().toLowerCase() === raw);
  if (same) return same;
  const exact = named.find((i) => normaliseInsurerName(i.name) === target);
  if (exact) return exact;
  if (target.length < 3) return null;
  // One name is the start of the other ("aviva" / "aviva insurance limited").
  const partial = named.filter((i) => {
    const n = normaliseInsurerName(i.name);
    return n.length >= 3 && (n.startsWith(`${target} `) || target.startsWith(`${n} `));
  });
  return partial.length === 1 ? partial[0] : null;
}

// Which insurer the claim is FOR (only when an insurer is the authorising party).
// Follows the claim type unless someone has overridden the authorising party, so a
// change of insurer is picked up before the saved name catches up.
export function authorisingInsurerName(claim) {
  if (!claim) return '';
  const party = claim.authorising_party_overridden || !claim.claim_type
    ? { authorised_by: claim.authorised_by, authorising_party_name: claim.authorising_party_name }
    : deriveAuthorisingParty(claim);
  if (party.authorised_by === 'Client Insurer') return party.authorising_party_name || claim.insurer || '';
  if (party.authorised_by === 'Third Party Insurer') return party.authorising_party_name || claim.tp_insurer || '';
  return '';
}

// Network codes as stored, with any note in brackets taken off: "ESUREDC (THIRD PARTY CODE)" → "ESUREDC".
export function networkCodesOf(insurer) {
  const seen = new Set();
  return (insurer?.network_codes || [])
    .map((c) => String(c || '').replace(/\s*\([^)]*\)\s*$/, '').trim())
    .filter((c) => c && !seen.has(c.toUpperCase()) && seen.add(c.toUpperCase()));
}

// The code to put in the Audatex field without asking: only when the directory has exactly one.
export function autoNetworkCode(insurer) {
  const codes = networkCodesOf(insurer);
  return codes.length === 1 ? codes[0] : '';
}

const blankCode = (v) => !v || !String(v).trim() || /^tbc$/i.test(String(v).trim());

/**
 * Patch that fills the Audatex network code from the authorising insurer's directory
 * entry, or null when there's nothing to do (code already set, several codes to pick
 * from, insurer not in the directory, or not an insurer job).
 */
export function networkCodePatch(claim, insurers) {
  if (!claim || !blankCode(claim.audatex_code)) return null;
  const code = autoNetworkCode(findInsurer(insurers, authorisingInsurerName(claim)));
  return code ? { audatex_code: code } : null;
}

/**
 * The claim about to be saved, with its Audatex code filled from the directory.
 * If the authorising insurer has changed and the code on the claim was the OLD
 * insurer's directory code, it is swapped for the new one (or cleared to pick, when
 * the new insurer has several). A code typed by hand is never touched.
 */
export function withNetworkCode(next, prev, insurers) {
  if (!next || !insurers?.length) return next;
  let base = next;
  const nextName = authorisingInsurerName(next);
  const prevName = prev ? authorisingInsurerName(prev) : '';
  // Cleared by hand on purpose: leave it empty.
  if (prev && prevName === nextName && !blankCode(prev.audatex_code) && blankCode(next.audatex_code)) return next;
  if (prev && prevName && prevName !== nextName && next.audatex_code) {
    const oldCodes = networkCodesOf(findInsurer(insurers, prevName)).map((c) => c.toUpperCase());
    if (oldCodes.includes(String(next.audatex_code).trim().toUpperCase())) base = { ...next, audatex_code: '' };
  }
  const patch = networkCodePatch(base, insurers);
  return patch ? { ...base, ...patch } : base;
}

export function useInsurerDirectory(enabled = true) {
  const { data = [] } = useQuery({
    queryKey: ['insurers'],
    queryFn: () => base44.entities.Insurer.list('name', 500),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
  return data;
}
