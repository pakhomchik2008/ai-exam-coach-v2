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
import { createElement } from "react";
import type { ComponentType } from "react";

const w = window as unknown as Record<string, unknown>;

// NB: not named `require` — bundlers treat that identifier as CommonJS interop
// even inside an ES module and rewrite it out from under you.
function mustGet(name: string): unknown {
  const value = w[name];
  if (value == null) throw new Error(`Legacy global not loaded: ${name}`);
  return value;
}

/**
 * A React component still defined by a legacy `.jsx` module.
 *
 * Returns a stable wrapper created once, at module scope, which looks the real
 * component up on `window` at render time. The indirection matters twice over:
 * the caller gets one unchanging component identity (so React never remounts the
 * subtree), while the `window` read stays deferred until render, so this can be
 * called before `bootstrap` has finished loading the module that defines it.
 */
export function legacyComponent<P extends object>(name: string): ComponentType<P> {
  const Wrapper = (props: P) => createElement(mustGet(name) as ComponentType<P>, props);
  Wrapper.displayName = `Legacy(${name})`;
  return Wrapper;
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
