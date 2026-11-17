import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { jarvisAuthorised, deny, loadClaims, brief, isOpen, daysSince } from '../../shared/jarvis.ts';

// Jarvis tool (read-only): overview of the live claims book.
// - no filter: totals, counts by status, red flags and the stalest claims
// - status: claims currently in a status (e.g. "Awaiting Authority")
// - view: "red" (overdue updates or client comms), "stale" (longest without an update),
//         "new" (received in the last 7 days), "complete" (repairs complete, awaiting close-out)
// Called by the ElevenLabs agent as a webhook. Requires the x-jarvis-key header.
Deno.serve(async (req) => {
  try {
    if (!jarvisAuthorised(req)) return deny(req);
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const status = String(body?.status ?? '').slice(0, 60).trim().toLowerCase();
    const view = String(body?.view ?? '').slice(0, 20).trim().toLowerCase();

    const all = await loadClaims(base44);
    const open = all.filter(isOpen);
    const stalest = (list: any[]) =>
      [...list].sort((a, b) => (daysSince(b.last_updated_at || b.updated_date) ?? 0) - (daysSince(a.last_updated_at || a.updated_date) ?? 0));

    if (status) {
      const statusOf = (c: any) => String(c.secondary_status || c.job_status || '').toLowerCase().trim();
      const words = status.split(/\s+/).filter(Boolean);
      const matches = open.filter(c => {
        const s = statusOf(c);
        return s === status || words.every(w => s.includes(w));
      });
      return Response.json({
        status_requested: body.status,
        count: matches.length,
        claims: stalest(matches).slice(0, 15).map(brief),
        note: matches.length > 15 ? `Showing the 15 longest without an update out of ${matches.length}.` : undefined,
      });
    }

    if (view === 'red') {
      const red = open.filter(c => c.update_status_flag === 'Red' || c.client_comm_status_flag === 'Red');
      return Response.json({
        count: red.length,
        claims: stalest(red).slice(0, 15).map(c => ({
          ...brief(c),
          overdue_update: c.update_status_flag === 'Red',
          overdue_client_comms: c.client_comm_status_flag === 'Red',
          days_since_client_update: daysSince(c.last_client_comm_at),
        })),
      });
    }

    if (view === 'stale') {
      return Response.json({ claims: stalest(open).slice(0, 10).map(brief) });
    }

    if (view === 'new') {
      const recent = open.filter(c => (daysSince(c.date_received || c.created_date) ?? 999) <= 7);
      return Response.json({ count: recent.length, claims: recent.slice(0, 15).map(brief) });
    }

    if (view === 'complete') {
      const done = open.filter(c => /repairs complete|invoice/i.test(String(c.secondary_status || '')) || (c.completion_date && !c.claim_complete_date));
      return Response.json({ count: done.length, claims: stalest(done).slice(0, 15).map(c => ({ ...brief(c), invoice_status: c.invoice_status || null })) });
    }

    // Default: the whole picture
    const byStatus: Record<string, number> = {};
    for (const c of open) {
      const s = c.secondary_status || c.job_status || 'No status';
      byStatus[s] = (byStatus[s] || 0) + 1;
    }
    const redUpdates = open.filter(c => c.update_status_flag === 'Red').length;
    const redComms = open.filter(c => c.client_comm_status_flag === 'Red').length;
    const newThisWeek = open.filter(c => (daysSince(c.date_received || c.created_date) ?? 999) <= 7).length;
    return Response.json({
      open_claims: open.length,
      new_in_last_7_days: newThisWeek,
      overdue_updates: redUpdates,
      overdue_client_comms: redComms,
      by_status: Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([s, n]) => ({ status: s, count: n })),
      longest_without_update: stalest(open).slice(0, 5).map(brief),
    });
  } catch (error: any) {
    console.error('jarvisClaimsOverview error:', error?.message, error?.stack);
    return Response.json({ error: 'Overview failed. Try again.' }, { status: 500 });
  }
});
