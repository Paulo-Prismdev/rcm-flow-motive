// Maps a saved ThirdParty directory record onto a claim's tp_* fields.
// Fields the directory record does not hold keep whatever is already on the claim.
const pick = (incoming, existing) =>
  incoming && String(incoming).trim() ? incoming : (existing || '');

export function claimPatchFromThirdParty(tp, existing = {}) {
  if (!tp) return {};
  return {
    tp_name: pick(tp.name, existing.tp_name),
    tp_phone: pick(tp.phone, existing.tp_phone),
    tp_email: pick(tp.email, existing.tp_email),
    tp_address_line_1: pick(tp.address_line_1, existing.tp_address_line_1),
    tp_address_line_2: pick(tp.address_line_2, existing.tp_address_line_2),
    tp_town: pick(tp.town, existing.tp_town),
    tp_county: pick(tp.county, existing.tp_county),
    tp_postcode: pick(tp.postcode, existing.tp_postcode),
    tp_insurer: pick(tp.insurer, existing.tp_insurer),
    tp_policy_number: pick(tp.policy_number, existing.tp_policy_number),
    tp_reg: pick(tp.vehicle_reg, existing.tp_reg),
    tp_make_model: pick(tp.vehicle_make_model, existing.tp_make_model),
  };
}