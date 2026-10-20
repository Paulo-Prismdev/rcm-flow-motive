/**
 * The policy excess is one of three things: a figure, Waived (nothing payable,
 * held as £0 — which is what £0 has always meant here), or TBC on authority (not
 * known until the authority comes back, holding no figure at all so it can never
 * be read as £0). This is the one place those three are worked out, so every
 * screen, invoice and calculation reads the excess the same way.
 */

export const EXCESS_TBC_LABEL = 'TBC on authority';
export const EXCESS_WAIVED_LABEL = 'Waived';

const isBlank = (value) => value === null || value === undefined || value === '';

/** Which of the three the claim is set to: 'amount' | 'waived' | 'tbc'. */
export function excessMode(claim) {
  if (claim?.excess_tbc === true) return 'tbc';
  if (isBlank(claim?.policy_excess)) return 'amount';
  return Number(claim.policy_excess) === 0 ? 'waived' : 'amount';
}

/** Whether the excess has actually been answered — a figure, Waived, or TBC. */
export function excessAnswered(claim) {
  return excessMode(claim) !== 'amount' || !isBlank(claim?.policy_excess);
}

/** The excess as it reads on screen and in print. Empty where none is set yet. */
export function excessLabel(claim, format = (n) => `£${Number(n).toFixed(2)}`) {
  const mode = excessMode(claim);
  if (mode === 'tbc') return EXCESS_TBC_LABEL;
  if (mode === 'waived') return EXCESS_WAIVED_LABEL;
  return isBlank(claim?.policy_excess) ? '' : format(claim.policy_excess);
}

/** The claim patch for choosing one of the three. */
export function excessPatch(mode, claim) {
  if (mode === 'tbc') return { excess_tbc: true, policy_excess: null };
  if (mode === 'waived') return { excess_tbc: false, policy_excess: 0 };
  // Amount: an existing figure is kept, while £0 (Waived) or TBC is cleared so
  // the amount box starts empty rather than reading as a figure nobody entered.
  const keep = excessMode(claim) === 'amount' && !isBlank(claim?.policy_excess) ? claim.policy_excess : null;
  return { excess_tbc: false, policy_excess: keep };
}