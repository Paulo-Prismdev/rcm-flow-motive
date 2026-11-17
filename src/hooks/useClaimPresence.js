import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Who else has this claim open. Each open claim screen keeps one ClaimPresence record
// fresh every 20 seconds and removes it on close; anyone not seen for 70 seconds is
// treated as gone (a closed laptop or lost connection never leaves a stale warning).
const BEAT_MS = 20000;
const GONE_MS = 70000;

// One id per browser tab, so the same person with the claim open twice still sees it.
const SESSION_ID = (() => {
  try { return crypto.randomUUID(); } catch { return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
})();

const itemsOf = (page) => (Array.isArray(page) ? page : page?.items || []);
const nameOf = (u) => u?.display_name || u?.full_name || u?.email || 'A colleague';

export default function useClaimPresence(claimId, currentUser, enabled = true) {
  const [others, setOthers] = useState([]);
  const recordId = useRef(null);

  useEffect(() => {
    if (!enabled || !claimId || !currentUser?.email) return undefined;
    let stopped = false;
    const Presence = base44.entities.ClaimPresence;

    const beat = async () => {
      const now = new Date().toISOString();
      try {
        if (recordId.current) {
          await Presence.update(recordId.current, { last_seen: now });
        } else {
          const created = await Presence.create({
            claim_id: claimId, user_email: currentUser.email, user_name: nameOf(currentUser),
            session_id: SESSION_ID, last_seen: now,
          });
          recordId.current = created?.id || null;
        }
      } catch {
        // The record may have been tidied away by someone else: start a fresh one next time.
        recordId.current = null;
      }
      try {
        const rows = itemsOf(await Presence.filter({ claim_id: claimId }, '-last_seen', 50));
        const cutoff = Date.now() - GONE_MS;
        const seen = new Map();
        for (const r of rows) {
          if (r.session_id === SESSION_ID) continue;
          const t = Date.parse(r.last_seen || '');
          if (Number.isNaN(t)) continue;
          if (t < cutoff) {
            // Long gone (closed without saying goodbye): tidy it up.
            if (t < Date.now() - GONE_MS * 10) Presence.delete(r.id).catch(() => {});
            continue;
          }
          if (r.user_email === currentUser.email) continue; // your own other tab
          if (!seen.has(r.user_email)) seen.set(r.user_email, { email: r.user_email, name: r.user_name || r.user_email });
        }
        if (!stopped) setOthers([...seen.values()]);
      } catch {
        if (!stopped) setOthers([]);
      }
    };

    const leave = () => {
      const id = recordId.current;
      recordId.current = null;
      if (id) Presence.delete(id).catch(() => {});
    };

    beat();
    const timer = setInterval(beat, BEAT_MS);
    const onHide = () => { if (document.visibilityState === 'visible') beat(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', leave);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', leave);
      leave();
      setOthers([]);
    };
  }, [claimId, currentUser?.email, enabled]);

  return others;
}
