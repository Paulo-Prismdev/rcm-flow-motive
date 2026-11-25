import React, { useEffect, useRef, useState } from "react";

/**
 * The app's loading screen (approved preview, 16 Nov 2026).
 *
 * - RCM navy with slowly drifting green and blue glows; the logo on a glass panel with a
 *   light sweeping across it.
 * - A progress line with words that match what is actually happening:
 *     stage="signin"   → Signing you in…
 *     stage="settings" → Loading your settings…
 *     stage="page"     → Opening <page>… (worked out from the address)
 *   The line carries on across stages, so it never jumps backwards.
 * - Quick loads skip the screen (nothing shows for the first ~250ms).
 * - When loading finishes it fades into the page instead of cutting.
 * - After 10 seconds it offers "This is taking longer than usual" with Try again.
 * - Devices set to reduce motion get the same look without movement.
 */

const LOGO = "/rcm-logo.png";
const SHOW_AFTER_MS = 250;
const SLOW_AFTER_MS = 10000;

// Shared across every loading screen shown during one load, so the bar keeps its place
// when one stage hands over to the next.
const session = { started: 0, progress: 0, mounted: 0, shown: false };

const STAGE = {
  signin: { from: 5, to: 40, text: () => "Signing you in…" },
  settings: { from: 40, to: 70, text: () => "Loading your settings…" },
  page: { from: 70, to: 94, text: () => `Opening ${pageName()}…` },
};

// Friendly names for the pages people land on.
const PAGE_NAMES = {
  "": "Flowmotive", dashboard: "the dashboard", claims: "Repairs", tasks: "your tasks",
  estimating: "Estimating", engineering: "Engineering", parts: "Parts", tyrerequests: "Tyre requests",
  invoicing: "Invoicing", reports: "Reports", settings: "Settings", bodyshopmap: "the map",
  clientportal: "your portal", repairerportal: "your portal", referrerportal: "your portal",
  login: "sign in", "forgot-password": "password reset", "reset-password": "password reset",
};
function pageName() {
  const seg = (window.location.pathname.split("/").filter(Boolean)[0] || "").toLowerCase();
  if (seg in PAGE_NAMES) return PAGE_NAMES[seg];
  if (seg.endsWith("-form") || seg === "parts-request" || seg === "bodyshop-update" || seg === "repairer-details") return "your form";
  if (seg.endsWith("directory") || seg === "admin") return "the directory";
  return "your page";
}

export default function LoadingScreen({ stage = "page" }) {
  const conf = STAGE[stage] || STAGE.page;
  const rootRef = useRef(null);
  const [visible, setVisible] = useState(session.shown);
  const [progress, setProgress] = useState(Math.max(session.progress, conf.from));
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    // Keep hold of the element now: React clears the ref before this effect's clean-up runs.
    const node = rootRef.current;
    session.mounted += 1;
    if (!session.started) session.started = Date.now();
    const elapsed = Date.now() - session.started;

    // Skip the screen on quick loads.
    const showTimer = session.shown ? null : setTimeout(() => { session.shown = true; setVisible(true); }, Math.max(0, SHOW_AFTER_MS - elapsed));

    // Creep towards the end of this stage (never past it): real progress, gently filled in.
    const tick = setInterval(() => {
      setProgress((p) => {
        const next = p + (conf.to - p) * 0.08;
        session.progress = next;
        return next;
      });
    }, 250);

    const slowTimer = setTimeout(() => setSlow(true), Math.max(0, SLOW_AFTER_MS - elapsed));

    return () => {
      clearTimeout(showTimer); clearInterval(tick); clearTimeout(slowTimer);
      session.mounted -= 1;
      // If no other loading screen takes over, fade this one out over the page.
      const wasShown = session.shown;
      setTimeout(() => {
        if (session.mounted > 0) return;
        session.started = 0; session.progress = 0; session.shown = false;
        if (!wasShown || !node || typeof document === "undefined") return;
        const ghost = node.cloneNode(true);
        ghost.classList.add("fm-loading--leaving");
        ghost.setAttribute("aria-hidden", "true");
        const bar = ghost.querySelector(".fm-loading__bar");
        if (bar) bar.style.width = "100%";
        document.body.appendChild(ghost);
        requestAnimationFrame(() => requestAnimationFrame(() => ghost.classList.add("fm-loading--gone")));
        setTimeout(() => ghost.remove(), 700);
      }, 0);
    };
  }, [conf.to]);

  const label = conf.text();

  return (
    <div
      ref={rootRef}
      className={`fm-loading ${visible ? "fm-loading--visible" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={slow ? "This is taking longer than usual" : label}
    >
      <div className="fm-loading__glow fm-loading__glow--green" aria-hidden="true" />
      <div className="fm-loading__glow fm-loading__glow--blue" aria-hidden="true" />
      <div className="fm-loading__glow fm-loading__glow--violet" aria-hidden="true" />

      <div className="fm-loading__centre">
        <div className="fm-loading__glass">
          <img src={LOGO} alt="RCM Automotive" className="fm-loading__logo" />
        </div>

        {!slow ? (
          <div className="fm-loading__progress">
            <div className="fm-loading__track" aria-hidden="true">
              <div className="fm-loading__bar" style={{ width: `${progress}%` }} />
            </div>
            <div className="fm-loading__step">{label}</div>
          </div>
        ) : (
          <div className="fm-loading__slow">
            <p>
              <strong>This is taking longer than usual.</strong>
              Check your internet connection, then try again. Nothing you've saved is lost.
            </p>
            <button type="button" className="fm-loading__retry" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
