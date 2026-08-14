/**
 * Appearance from the profile: named palette, dyslexia spacing, accent.
 * Applied on boot and whenever Settings writes those fields so the rest
 * of the app (not only the Settings tab) flips immediately.
 */
import { applyTweaks } from "../app/tweaks";
import { applyThemeVars, resolveThemeId, type ThemeId } from "../styles/themes";

export type AppearanceTheme = ThemeId;

export function applyAppearance(profile: {
  theme?: string;
  accent?: string;
  dyslexiaFont?: boolean;
} | null | undefined): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  applyThemeVars(resolveThemeId(profile?.theme), root);
  root.classList.toggle("dyslexia", profile?.dyslexiaFont === true);
  const accent = typeof profile?.accent === "string" && profile.accent ? profile.accent : "Indigo";
  applyTweaks(accent, "Comfortable", "Default");
}
