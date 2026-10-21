import { claimPatchFromThirdParty } from '@/components/shared/thirdPartyFields';

/**
 * Matching what the instruction reader found to our own directories: the client,
 * referrer, bodyshop, the insurer (and the third party's insurer) and the third
 * party itself, so a name off an instruction is not typed in again as a new
 * record.
 */

export function fuzzyScore(read, candidate) {
  if (!read || !candidate) return 0;
  const a = String(read).toLowerCase().trim();
  const b = String(candidate).toLowerCase().trim();
  if (!a || !b) return 0;
  if (b === a) return 1;
  if (b.includes(a) || a.includes(b)) return 0.8;
  const aWords = a.split(/\s+/);
  const bWords = b.split(/\s+/);
  const overlap = aWords.filter((w) => bWords.some((bw) => bw.includes(w) || w.includes(bw))).length;
  return overlap / Math.max(aWords.length, bWords.length);
}

/** The best record for a name, where it is a close enough match to offer. */
export function bestMatch(read, candidates = [], nameKey = 'name', minimum = 0.5) {
  if (!read) return null;
  const sorted = [...candidates]
    .map((record) => ({ record, score: fuzzyScore(read, record?.[nameKey]) }))
    .filter((c) => c.record && c.score >= minimum)
    .sort((a, b) => b.score - a.score);
  return sorted[0] || null;
}

/**
 * The claim patch for the links the user kept: the record's id and name, so the
 * claim points at the directory row rather than a lookalike typed by hand.
 */
export function linkPatch({ links = {}, values = {} }) {
  const patch = {};

  const client = links.client?.record;
  if (client) {
    patch.client_id = client.id;
    patch.client_name = client.name || values.client_name || '';
    if (client.phone) patch.client_phone = client.phone;
    if (client.email) patch.client_email = client.email;
    if (client.address_line_1) patch.client_address_line_1 = client.address_line_1;
    if (client.address_line_2) patch.client_address_line_2 = client.address_line_2;
    if (client.town) patch.client_town = client.town;
    if (client.county) patch.client_county = client.county;
    if (client.postcode) patch.client_postcode = client.postcode;
    if (client.vat_status && client.vat_status !== 'Unknown') patch.client_vat_status = client.vat_status;
  }

  const referrer = links.referrer?.record;
  if (referrer) {
    patch.referrer_id = referrer.id;
    patch.referrer = referrer.name || values.referrer || '';
    if (referrer.contact_email) patch.referrer_email = referrer.contact_email;
    if (referrer.email) patch.referrer_email = referrer.email;
    if (referrer.default_percent_to_referrer != null) patch.percent_to_referrer = referrer.default_percent_to_referrer;
    if (referrer.default_repairer_referral_fee != null) patch.referral_fee_repairer = referrer.default_repairer_referral_fee;
  }

  const bodyshop = links.bodyshop?.record;
  if (bodyshop) {
    patch.bodyshop_id = bodyshop.id;
    patch.bodyshop = bodyshop.name || values.bodyshop || '';
    if (bodyshop.email) patch.bodyshop_email = bodyshop.email;
  }

  if (links.insurer?.mode === 'directory' && links.insurer.record) {
    patch.insurer = links.insurer.record.name;
  }

  if (links.thirdParty?.mode === 'directory' && links.thirdParty.record) {
    Object.assign(patch, claimPatchFromThirdParty(links.thirdParty.record, values));
  }

  if (links.tpInsurer?.mode === 'directory' && links.tpInsurer.record) {
    patch.tp_insurer = links.tpInsurer.record.name;
  }

  return patch;
}