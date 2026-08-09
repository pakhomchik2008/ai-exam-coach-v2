/**
 * Typed access to the components and helpers that unconverted modules still
 * publish onto `window`.
 *
 * This exists so the boundary between converted TypeScript and the legacy global
 * layer is explicit and greppable — `legacy("Dashboard")` is a to-do list of
 * what Phase 1b still has to convert, and it throws loudly with the missing name
 * instead of rendering `undefined` if a module failed to load or the import
 * order in main.tsx drifts.
 *
 * `window.X` is a stable reference once its module has evaluated, so repeated
 * calls return the same object and React never sees a changed component type.
 */
import type { ComponentType } from "react";

const w = window as unknown as Record<string, unknown>;

// NB: not named `require` — bundlers treat that identifier as CommonJS interop
// even inside an ES module and rewrite it out from under you.
function mustGet(name: string): unknown {
  const value = w[name];
  if (value == null) throw new Error(`Legacy global not loaded: ${name}`);
  return value;
}

/** A React component still defined by a legacy `.jsx` module. */
export function legacyComponent<P>(name: string): ComponentType<P> {
  return mustGet(name) as ComponentType<P>;
}

/** A plain function still defined by a legacy `.jsx` module. */
export function legacyFn<F extends (...args: never[]) => unknown>(name: string): F {
  return mustGet(name) as F;
}

/** Reads an optional legacy global without throwing — for genuinely optional ones. */
export function legacyOptional<T>(name: string): T | undefined {
  return w[name] as T | undefined;
}

/**
 * Asserts every global the app needs is present after all imports have run.
 * Six of the seven load-order dependencies documented in ARCHITECTURE_AUDIT.md
 * §4.3 fail *silently* when violated; this converts all of them into one loud
 * error at boot naming exactly what is missing.
 */
export function assertGlobalsLoaded(names: readonly string[]): void {
  const missing = names.filter((n) => w[n] == null);
  if (missing.length) {
    throw new Error(
      `Boot assertion failed — ${missing.length} module(s) did not publish their globals: ${missing.join(", ")}`,
    );
  }
}
