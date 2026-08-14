/**
 * Design tweaks — accent / density / depth, applied as CSS custom properties on
 * :root. Lifted out of the inline <script> in index.html unchanged.
 */

export const TWEAK_DEFAULTS = {
  accent: "Indigo",
  density: "Comfortable",
  depth: "Default",
} as const;

type VarSet = Record<string, string>;

/**
 * Accent palettes — each swaps the entire indigo/accent token set. "Indigo" is
 * the default (Tailwind indigo), the look from before the pine wash.
 */
const ACCENT_PALETTES: Record<string, VarSet> = {
  Indigo: {
    "--indigo-50": "#EEF2FF",
    "--indigo-100": "#E0E7FF",
    "--indigo-500": "#6366F1",
    "--indigo-600": "#4F46E5",
    "--indigo-700": "#4338CA",
    "--action-accent": "#4F46E5",
    "--action-accent-hover": "#4338CA",
  },
  Violet: {
    "--indigo-50": "#F5F3FF",
    "--indigo-100": "#EDE9FE",
    "--indigo-500": "#8B5CF6",
    "--indigo-600": "#7C3AED",
    "--indigo-700": "#6D28D9",
    "--action-accent": "#7C3AED",
    "--action-accent-hover": "#6D28D9",
  },
  Rose: {
    "--indigo-50": "#FFF1F2",
    "--indigo-100": "#FFE4E6",
    "--indigo-500": "#F43F5E",
    "--indigo-600": "#E11D48",
    "--indigo-700": "#BE123C",
    "--action-accent": "#E11D48",
    "--action-accent-hover": "#BE123C",
  },
  Amber: {
    "--indigo-50": "#FFFBEB",
    "--indigo-100": "#FEF3C7",
    "--indigo-500": "#F59E0B",
    "--indigo-600": "#D97706",
    "--indigo-700": "#B45309",
    "--action-accent": "#D97706",
    "--action-accent-hover": "#B45309",
  },
};

/** Density — rescales spacing multiplier + base text size. */
const DENSITY_VARS: Record<string, VarSet> = {
  Compact: {
    "--space-2": "0.35rem",
    "--space-3": "0.6rem",
    "--space-4": "0.75rem",
    "--space-5": "0.9rem",
    "--space-6": "1.1rem",
    "--space-8": "1.5rem",
    "--text-sm": "0.8rem",
    "--text-base": "0.9rem",
    "--text-lg": "1rem",
    "--text-xl": "1.1rem",
    "--text-2xl": "1.3rem",
  },
  Comfortable: {}, // token defaults — no overrides needed
  Spacious: {
    "--space-2": "0.65rem",
    "--space-3": "1rem",
    "--space-4": "1.35rem",
    "--space-5": "1.6rem",
    "--space-6": "2rem",
    "--space-8": "2.75rem",
    "--text-sm": "0.95rem",
    "--text-base": "1.1rem",
    "--text-lg": "1.25rem",
    "--text-xl": "1.4rem",
    "--text-2xl": "1.75rem",
  },
};

/** Depth — shifts shadow + border intensity. */
const DEPTH_VARS: Record<string, VarSet> = {
  Flat: {
    "--shadow-sm": "none",
    "--shadow-md": "none",
    "--shadow-lg": "none",
    "--border-default": "var(--slate-200)",
    "--border-subtle": "var(--slate-200)",
  },
  Default: {}, // token defaults
  Floating: {
    "--shadow-sm": "0 4px 18px -2px rgba(15,23,42,0.11), 0 2px 6px -2px rgba(15,23,42,0.07)",
    "--shadow-md": "0 10px 36px -4px rgba(15,23,42,0.14), 0 4px 12px -4px rgba(15,23,42,0.08)",
    "--shadow-lg": "0 20px 56px -6px rgba(15,23,42,0.18), 0 8px 20px -6px rgba(15,23,42,0.10)",
    "--border-default": "transparent",
    "--border-subtle": "transparent",
  },
};

/** Injects all active tweaks as CSS custom properties on :root. */
export function applyTweaks(accent: string, density: string, depth: string): void {
  const vars: VarSet = {
    ...(ACCENT_PALETTES[accent] ?? {}),
    ...(DENSITY_VARS[density] ?? {}),
    ...(DEPTH_VARS[depth] ?? {}),
  };

  let style = document.getElementById("__tweak-overrides");
  if (!style) {
    style = document.createElement("style");
    style.id = "__tweak-overrides";
    document.head.appendChild(style);
  }

  const rules = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v} !important;`)
    .join("\n");
  style.textContent = `:root {\n${rules}\n}`;
}

export const ACCENT_OPTIONS = Object.keys(ACCENT_PALETTES);
export const DENSITY_OPTIONS = Object.keys(DENSITY_VARS);
export const DEPTH_OPTIONS = Object.keys(DEPTH_VARS);
