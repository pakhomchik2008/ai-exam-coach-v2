// One-time spotlight tip — scrim with a cutout over a target element plus a
// callout bubble. Each host screen renders its own <CoachMark>, gated on
// hasSeenTourStep(id); dismissing marks the step seen and the component
// unmounts itself (no central tour-runner, no route registry — simpler to
// reason about, and each screen already knows when it's "first opened").
import { hasSeenTourStep, markTourStepSeen, TOUR_STEP_SEEN_EVENT } from "../lib/onboarding-tour";

function resolveTarget(selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    const el = document.querySelector(sel);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return rect;
    }
  }
  return null;
}

export function CoachMark({ id, targetSelector, step, total, body, gotItLabel = "Got it", placement = "bottom", inset = 8, waitFor, onDone }) {
  const [seen, setSeen] = React.useState(() => hasSeenTourStep(id));
  const [waiting, setWaiting] = React.useState(() => !!waitFor && !hasSeenTourStep(waitFor));
  const [rect, setRect] = React.useState(null);

  React.useEffect(() => {
    if (!waitFor) return;
    const onSeen = (e) => { if (e.detail === waitFor) setWaiting(false); };
    window.addEventListener(TOUR_STEP_SEEN_EVENT, onSeen);
    return () => window.removeEventListener(TOUR_STEP_SEEN_EVENT, onSeen);
  }, [waitFor]);

  React.useEffect(() => {
    if (seen || waiting) return;
    const measure = () => setRect(resolveTarget(targetSelector));
    measure();
    // Layout settles a frame or two after mount (fonts, images, the sheet
    // this tip lives on finishing its own entrance) — remeasure once more.
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [seen, waiting, targetSelector]);

  if (seen || waiting || !rect) return null;

  function dismiss() {
    markTourStepSeen(id);
    setSeen(true);
    onDone?.();
  }

  // Clamp the target rect to the viewport first — a tall grid (e.g. the
  // Coach mode cards) can have a real bounding box taller than the screen,
  // which used to push the callout's math (rect.bottom + ...) off-screen
  // entirely, making the tip look broken/invisible (Hlib, 28 Aug 2026).
  const visTop = Math.max(0, rect.top);
  const visBottom = Math.min(window.innerHeight, rect.bottom);

  const spot = {
    position: "fixed", zIndex: 210, pointerEvents: "none",
    left: rect.left - inset, top: visTop - inset,
    width: rect.width + inset * 2, height: Math.max(0, visBottom - visTop) + inset * 2,
    borderRadius: Math.min(24, rect.height / 2 + inset),
    boxShadow: "0 0 0 2000px rgba(10,12,18,0.62)",
    outline: "2px solid var(--chrome-gold)",
  };

  const below = placement === "bottom";
  const calloutWidth = 240;
  const calloutHeight = 170; // rough, deliberately generous — better a few px of gap above than a clipped button below
  const rawLeft = rect.left + rect.width / 2 - calloutWidth / 2;
  const left = Math.max(12, Math.min(rawLeft, window.innerWidth - calloutWidth - 12));
  const arrowLeft = rect.left + rect.width / 2 - left - 6;
  // The mobile bottom tab bar is fixed and outranks the callout visually if
  // we clamp right up against window.innerHeight — reserve its real height.
  const tabBar = document.querySelector(".app-nav-bottom-bar");
  const tabBarH = tabBar && getComputedStyle(tabBar).display !== "none" ? tabBar.getBoundingClientRect().height : 0;
  const rawTop = below ? visBottom + inset + 14 : visTop - inset - 14 - calloutHeight;
  const top = Math.max(12, Math.min(rawTop, window.innerHeight - tabBarH - calloutHeight - 12));

  const callout = {
    position: "fixed", zIndex: 211, width: calloutWidth,
    left, top,
    background: "var(--chrome-ink)", color: "var(--chrome-paper)", borderRadius: 16,
    padding: "14px 16px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)", fontFamily: "var(--font-sans)",
  };

  return (
    <>
      <div style={spot} aria-hidden="true" />
      <div role="dialog" aria-label={body} style={callout}>
        <div style={{
          position: "absolute", width: 12, height: 12, background: "var(--chrome-ink)", transform: "rotate(45deg)",
          left: arrowLeft, [below ? "top" : "bottom"]: -6,
        }} aria-hidden="true" />
        {total > 1 && (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--chrome-gold)", marginBottom: 6 }}>
            Step {step} of {total}
          </div>
        )}
        <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.45 }}>{body}</p>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={dismiss} style={{
            background: "var(--chrome-gold)", color: "#1F1400", border: "none", borderRadius: 999,
            padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-sans)",
          }}>{gotItLabel}</button>
        </div>
      </div>
    </>
  );
}
