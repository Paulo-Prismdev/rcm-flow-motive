// redeploy 2026-11-17 19:58
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { jarvisAuthorised, deny, loadClaims, normalise, summarise, brief, redact, isOpen } from '../../shared/jarvis.ts';

// Jarvis tool (read-only): find a claim by job number, registration, client,
// repairer, insurer or claim reference, and return its status and recent updates.
// Called by the ElevenLabs agent as a webhook. Requires the x-jarvis-key header.
Deno.serve(async (req) => {
  try {
    if (!jarvisAuthorised(req)) return deny(req);
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const raw = String(body?.query ?? '').slice(0, 100).trim();
    if (!raw) return Response.json({ error: 'Say what to look for: a job number, reg, client or repairer.' }, { status: 400 });

    const claims = await loadClaims(base44);
    const q = normalise(raw);
    const qLower = raw.toLowerCase();
    const digits = raw.replace(/\D/g, '').replace(/^0+/, '');

    const scored: { c: any; score: number }[] = [];
    for (const c of claims) {
      if (c.draft) continue;
      let score = 0;
      const job = normalise(c.job_number);
      const jobDigits = String(c.job_number || '').replace(/\D/g, '').replace(/^0+/, '');
      const reg = normalise(c.reg);
      if (q && job === q) score = 100;
      else if (digits && jobDigits && jobDigits === digits && q.length <= 10) score = 90;
      else if (q.length >= 4 && reg && (reg === q)) score = 95;
      else if (q.length >= 4 && reg && reg.includes(q)) score = 70;
      else if (q.length >= 4 && normalise(c.claim_ref) === q) score = 85;
      else {
        const fields = [c.client_name, c.bodyshop, c.insurer, c.referrer, c.make_model, c.credit_repair_company_name]
          .map((v: any) => String(v || '').toLowerCase());
        if (qLower.length >= 3 && fields.some((f: string) => f && f.includes(qLower))) score = 50;
      }
      if (score > 0) {
        if (isOpen(c)) score += 5; // prefer live claims
        scored.push({ c, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);

    if (!scored.length) return Response.json({ found: 0, message: `No claim matched "${raw}".` });

    const top = scored[0];
    const exact = top.score >= 85 || scored.length === 1 || (scored[1] && top.score - scored[1].score >= 20);
    if (!exact) {
      return Response.json({
        found: scored.length,
        message: 'Several claims match. Ask Paul which one, or summarise them.',
        matches: scored.slice(0, 8).map(s => ({ ...brief(s.c), open: isOpen(s.c) })),
      });
    }

    const claim = top.c;
    let updates: any[] = [];
    try {
      const rows = await base44.asServiceRole.entities.ClaimUpdate.filter({ claim_id: claim.id }, '-created_date', 6);
      updates = (rows || []).map((u: any) => ({
        date: u.created_date || null,
        type: u.update_type || null,
        by: String(u.created_by || '').includes('anthony') ? 'Anthony' : String(u.created_by || '').includes('paul') ? 'Paul' : 'System/other',
        with: u.contacted_party_name || null,
        direction: u.direction || null,
        note: redact(u.description || '').slice(0, 400),
        next_steps: u.next_steps ? redact(u.next_steps).slice(0, 200) : null,
      }));
    } catch (_) { /* updates are optional */ }

    return Response.json({
      found: 1,
      open: isOpen(claim),
      claim: summarise(claim),
      recent_updates: updates,
      other_matches: scored.slice(1, 4).map(s => brief(s.c)),
    });
  } catch (error: any) {
    console.error('jarvisFindClaim error:', error?.message, error?.stack);
    return Response.json({ error: 'Lookup failed. Try again.' }, { status: 500 });
  }
});
