/**
 * Appearance from the profile: color scheme, dyslexia spacing, accent.
 * Applied on boot and whenever Settings writes those fields so the rest
 * of the app (not only the Settings tab) flips immediately.
 */
import { applyTweaks } from "../app/tweaks";

export type AppearanceTheme = "system" | "light" | "dark";

export function applyAppearance(profile: {
  theme?: string;
  accent?: string;
  dyslexiaFont?: boolean;
} | null | undefined): void {
  if (typeof document === "undefined") return;
  const theme = profile?.theme === "light" || profile?.theme === "dark" ? profile.theme : "system";
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  root.classList.toggle("dyslexia", profile?.dyslexiaFont === true);
  const accent = typeof profile?.accent === "string" && profile.accent ? profile.accent : "Indigo";
  applyTweaks(accent, "Comfortable", "Default");
}
