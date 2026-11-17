import { useEffect, useRef, useState } from 'react';

// Back navigation that matches what's on screen.
//
// useBackLayer: a screen that opens over another (a claim over the Repairs list,
// a section over the claim summary) adds one step to the browser's history. The
// phone's back gesture, the browser's back button and the on-screen Back button
// then all do the same thing: close that one screen. Closing it on screen takes
// its history step away again, so steps never pile up.
//
// installBackGuard: once signed in, stepping back from the first screen used to
// leave the app for the sign-in page. A spare history step now sits under the
// first screen; landing on it puts you straight back where you were.

// Matches the widths that show the phone layout of a claim (below Tailwind lg).
export function usePhoneLayout(maxWidth = 1023) {
  const query = `(max-width: ${maxWidth}px)`;
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatch(mql.matches);
    mql.addEventListener('change', onChange);
    onChange();
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return match;
}

let pendingBack = 0;
let flushQueued = false;
// Several screens can close at once (closing a claim that has a section open);
// their history steps are taken away together in one go.
function queueBack() {
  pendingBack += 1;
  if (flushQueued) return;
  flushQueued = true;
  setTimeout(() => {
    const steps = pendingBack;
    pendingBack = 0;
    flushQueued = false;
    if (steps > 0) window.history.go(-steps);
  }, 0);
}

export function useBackLayer(active, onClose, name) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!active || typeof window === 'undefined') return undefined;
    window.history.pushState({ ...(window.history.state || {}), fmLayer: name }, '');
    let mine = true;
    const onPop = (e) => {
      // Still showing this screen's step (a screen above it was closed): stay open.
      if (e.state?.fmLayer === name) return;
      mine = false;
      closeRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // Only take the step away while it is still the latest one: if the app has
      // moved to another page since, going back would undo that move.
      if (mine && window.history.state?.fmLayer === name) queueBack();
    };
  }, [active, name]);
}

// Android Chrome skips history steps that were added without a tap, so the spare
// step is only added on the first tap in the app, and added again (inside the
// back gesture's own event) whenever back lands on it.
export function installBackGuard() {
  if (typeof window === 'undefined' || window.__fmBackGuard) return;
  window.__fmBackGuard = true;
  const arm = () => {
    window.removeEventListener('pointerdown', arm, true);
    if (window.history.state?.fmBase === false) return;
    const base = { ...(window.history.state || {}), fmBase: true };
    window.history.replaceState(base, '');
    window.history.pushState({ ...base, fmBase: false }, '');
  };
  window.addEventListener('pointerdown', arm, true);
  window.addEventListener('popstate', (e) => {
    if (e.state?.fmBase === true) {
      window.history.pushState({ ...e.state, fmBase: false }, '');
    }
  });
}
