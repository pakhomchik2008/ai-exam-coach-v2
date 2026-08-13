/**
 * Phase 4.4 motion runtime. One place for reduced-motion, haptics,
 * View Transitions, and Lenis so screens do not each invent a path.
 */
import React from "react";
import { MOTION } from "../styles/motion";

export type HapticKind = "light" | "medium" | "heavy";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined"
    && !!window.matchMedia
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = React.useState(prefersReducedMotion);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

export function fireHaptic(kind: HapticKind = "light"): void {
  if (typeof window === "undefined") return;
  if (prefersReducedMotion()) return;
  try {
    const cap = (window as unknown as {
      Capacitor?: { Plugins?: { Haptics?: { impact?: (opts: { style: string }) => void } } };
    }).Capacitor;
    const style = kind === "heavy" ? "Heavy" : kind === "medium" ? "Medium" : "Light";
    if (cap?.Plugins?.Haptics?.impact) {
      cap.Plugins.Haptics.impact({ style });
      return;
    }
  } catch {
    // web
  }
  try {
    const ms = kind === "heavy" ? 32 : kind === "medium" ? 18 : 8;
    window.navigator?.vibrate?.(ms);
  } catch {
    // desktop Chrome without vibration
  }
}

export function navigateWithViewTransition(update: () => void): void {
  if (prefersReducedMotion() || typeof document === "undefined") {
    update();
    return;
  }
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => void;
  };
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(update);
    return;
  }
  update();
}

export function reducedFadeMs(): number {
  return MOTION.duration.micro;
}

/** Bind --glow-x / --glow-y on an element to the pointer. GPU-cheap aura. */
export function bindAmbientPointer(el: HTMLElement | null): () => void {
  if (!el || prefersReducedMotion()) return () => undefined;
  const onMove = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / Math.max(1, r.width)) * 100;
    const y = ((e.clientY - r.top) / Math.max(1, r.height)) * 100;
    el.style.setProperty("--glow-x", `${x}%`);
    el.style.setProperty("--glow-y", `${y}%`);
  };
  el.addEventListener("pointermove", onMove, { passive: true });
  return () => el.removeEventListener("pointermove", onMove);
}

export async function startLenis(root?: HTMLElement): Promise<() => void> {
  if (prefersReducedMotion() || typeof window === "undefined") {
    return () => undefined;
  }
  const { default: Lenis } = await import("lenis");
  const lenis = new Lenis(root
    ? { wrapper: root, autoRaf: true, lerp: 0.12 }
    : { autoRaf: true, lerp: 0.12 });
  return () => lenis.destroy();
}
