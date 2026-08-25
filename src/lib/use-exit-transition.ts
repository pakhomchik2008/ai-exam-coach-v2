// Examik — keeps a conditionally-rendered overlay/sheet/modal mounted for
// one exit-transition duration after its trigger goes false, so closing
// plays a reverse animation instead of the whole subtree unmounting mid-
// transition (every `{cond && <Modal/>}` overlay in the app used to do
// this — see .ux-overlay's `is-closing` keyframes in motion.css).
import * as React from "react";

export function useExitTransition(open: boolean, durationMs = 220): { mounted: boolean; closing: boolean } {
  const [mounted, setMounted] = React.useState(open);
  const [closing, setClosing] = React.useState(false);
  const prevOpen = React.useRef(open);

  // React's own recommended alternative to an effect for state that must
  // reset the instant a prop changes ("adjusting state during render"):
  // https://react.dev/learn/you-might-not-need-an-effect — an effect here
  // would just resynchronize on the very next render anyway.
  if (open !== prevOpen.current) {
    prevOpen.current = open;
    if (open) {
      setMounted(true);
      setClosing(false);
    } else {
      setClosing(true);
    }
  }

  // The one real external-system subscription: a timer, which IS effect territory.
  React.useEffect(() => {
    if (!closing) return;
    const id = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, durationMs);
    return () => clearTimeout(id);
  }, [closing, durationMs]);

  return { mounted, closing };
}

Object.assign(window, { useExitTransition });
export {};
