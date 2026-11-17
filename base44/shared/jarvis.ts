// Shared helpers for the Jarvis voice assistant tools (read-only).
// Security: every Jarvis endpoint requires the x-jarvis-key header to match the
// JARVIS_TOOL_KEY secret. If the secret is not set, every request is refused.
// Privacy: only claim summary fields are returned — never phone numbers, emails,
// addresses, licence, date of birth, policy numbers or indemnity answers.

export function jarvisAuthCheck(req: Request): string {
  const expected = (Deno.env.get('JARVIS_TOOL_KEY') || '').trim();
  const given = (req.headers.get('x-jarvis-key') || '').trim();
  if (expected.length < 16) return 'server_key_missing_or_too_short';
  if (!given) return 'no_key_sent';
  if (given.length !== expected.length) return 'key_mismatch';
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0 ? 'ok' : 'key_mismatch';
}

export function jarvisAuthorised(req: Request): boolean {
  return jarvisAuthCheck(req) === 'ok';
}

export function deny(req?: Request) {
  const reason = req ? jarvisAuthCheck(req) : 'unknown';
  return Response.json({ error: 'Not authorised', reason }, { status: 401 });
}

const CLOSED_SECONDARY = ['closed', 'cancelled'];

export function isOpen(c: any): boolean {
  if (!c || c.archived || c.draft) return false;
  if (c.outcome === 'Cancelled') return false;
  if (c.claim_complete_date) return false;
  const s = String(c.secondary_status || c.job_status || '').toLowerCase().trim();
  return !CLOSED_SECONDARY.includes(s);
}

export function daysSince(v: any): number | null {
  if (!v) return null;
  const t = Date.parse(v);
  if (isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

export function redact(text: string): string {
  return String(text || '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/(\+44\s?7|\b07|\b0[1238])\d(?:[\s-]?\d){7,8}\b/g, '[phone]')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalise(v: any): string {
  return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function summarise(c: any) {
  return {
    job_number: c.job_number || null,
    reg: c.reg || null,
    vehicle: c.make_model || [c.vehicle_make, c.vehicle_model].filter(Boolean).join(' ') || null,
    client: c.client_name || null,
    claim_type: c.claim_type || null,
    outcome: c.outcome || 'Repair',
    journey_status: c.journey_status || null,
    main_status: c.secondary_status || c.job_status || null,
    extra_status: c.tertiary_status || null,
    insurer: c.insurer || null,
    authorising_party: c.authorising_party_name || null,
    repairer: c.bodyshop || null,
    referrer: c.referrer || null,
    credit_repair_partner: c.credit_repair_company_name || null,
    third_party_pursuit: c.third_party_pursuit_status && c.third_party_pursuit_status !== 'N/A' ? c.third_party_pursuit_status : null,
    dates: {
      received: c.date_received || null,
      estimate_completed: c.estimate_completed || null,
      authority_received: c.authority_received || null,
      booked_in: c.booking_in_date || null,
      on_site: c.on_site_date || null,
      ecd: c.ecd || null,
      repairs_completed: c.completion_date || null,
      handed_back: c.hand_over_date || null,
      final_authority: c.final_authority_received || null,
    },
    estimate_gross: c.estimate_cost_gross ?? null,
    authority_gross: c.authority_cost_gross ?? null,
    final_repair_cost: c.final_repair_cost ?? null,
    excess: c.excess_tbc ? 'TBC' : (c.policy_excess ?? null),
    invoice_status: c.invoice_status || null,
    days_since_last_update: daysSince(c.last_updated_at || c.updated_date),
    days_since_client_update: daysSince(c.last_client_comm_at),
    update_flag: c.update_status_flag || null,
    client_comm_flag: c.client_comm_status_flag || null,
    latest_update: c.latest_update ? redact(c.latest_update).slice(0, 300) : null,
  };
}

export function brief(c: any) {
  return {
    job_number: c.job_number || null,
    reg: c.reg || null,
    client: c.client_name || null,
    status: c.secondary_status || c.job_status || null,
    insurer: c.insurer || null,
    repairer: c.bodyshop || null,
    days_since_last_update: daysSince(c.last_updated_at || c.updated_date),
  };
}

export async function loadClaims(base44: any): Promise<any[]> {
  const claims = await base44.asServiceRole.entities.Claim.filter({}, '-updated_date', 3000);
  return Array.isArray(claims) ? claims : [];
}
