/**
 * Named palettes from the Settings theme carousel.
 * data-theme on <html> plus --theme-* vars; data-tier still only
 * paints the XP wash, so the two do not fight.
 *
 * trading.card / arcade.card were truncated on the spec screenshot —
 * 10–12% accent washes match the glowing cards in the mock.
 */
export const THEME_IDS = ["cream", "midnight", "trading", "violet", "arcade", "mono"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const THEMES = {
  cream:    { bg: "#F7F5F0", text: "#0E0F10", accent: "#141822", card: "#F2F0EA" },
  midnight: { bg: "#0B0C0D", text: "#F5F5F5", accent: "#F3D062", card: "#141618" },
  trading:  { bg: "#0A0F14", text: "#F5F5F5", accent: "#39FF14", card: "rgba(57,255,20,0.10)" },
  violet:   { bg: "#F4F1FB", text: "#26215C", accent: "#534AB7", card: "#EEEDFE" },
  arcade:   { bg: "#0F0B14", text: "#F0E7FA", accent: "#FF10A5", card: "rgba(255,16,165,0.12)" },
  mono:     { bg: "#F7F6F3", text: "#2C2C2A", accent: "#0E0F10", card: "#EFEDE7" },
} as const;

type Copy = { en: string; uk: string; ru: string; fr: string; de: string };

export const THEME_META: { id: ThemeId; name: Copy; blurb: Copy }[] = [
  {
    id: "cream",
    name: { en: "Cream Paper", uk: "Cream Paper", ru: "Cream Paper", fr: "Cream Paper", de: "Cream Paper" },
    blurb: { en: "Warm paper, navy accent", uk: "Теплий папір, navy", ru: "Тёплая бумага, navy", fr: "Papier chaud, navy", de: "Warmes Papier, Navy" },
  },
  {
    id: "midnight",
    name: { en: "Midnight Amber", uk: "Midnight Amber", ru: "Midnight Amber", fr: "Midnight Amber", de: "Midnight Amber" },
    blurb: { en: "Dark, gold, terminal", uk: "Темна, золото, термінал", ru: "Тёмная, золото, терминал", fr: "Sombre, or, terminal", de: "Dunkel, Gold, Terminal" },
  },
  {
    id: "trading",
    name: { en: "Trading Floor", uk: "Trading Floor", ru: "Trading Floor", fr: "Trading Floor", de: "Trading Floor" },
    blurb: { en: "Ticker green, predictor", uk: "Тікер, предиктор", ru: "Тикер, предиктор", fr: "Ticker, prédicteur", de: "Ticker, Prediktor" },
  },
  {
    id: "violet",
    name: { en: "Soft Violet", uk: "Soft Violet", ru: "Soft Violet", fr: "Soft Violet", de: "Soft Violet" },
    blurb: { en: "Soft, study-cosy", uk: "М’яка, затишна", ru: "Мягкая, уютная", fr: "Douce, cosy", de: "Sanft, gemütlich" },
  },
  {
    id: "arcade",
    name: { en: "Neon Arcade", uk: "Neon Arcade", ru: "Neon Arcade", fr: "Neon Arcade", de: "Neon Arcade" },
    blurb: { en: "Hot pink, demo-loud", uk: "Рожева, для демо", ru: "Розовая, для демо", fr: "Rose, démo", de: "Pink, Demo" },
  },
  {
    id: "mono",
    name: { en: "Mono Slate", uk: "Mono Slate", ru: "Mono Slate", fr: "Mono Slate", de: "Mono Slate" },
    blurb: { en: "Black and white, focus", uk: "Чорно-біла, фокус", ru: "Чёрно-белая, фокус", fr: "N&B, focus", de: "S/W, Fokus" },
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

/** Old light/dark/system profiles land on cream; dark → midnight. */
export function resolveThemeId(raw: unknown): ThemeId {
  if (isThemeId(raw)) return raw;
  if (raw === "dark") return "midnight";
  return "cream";
}

export function applyThemeVars(id: ThemeId, root: HTMLElement = document.documentElement): void {
  const palette = THEMES[id];
  root.style.setProperty("--theme-bg", palette.bg);
  root.style.setProperty("--theme-text", palette.text);
  root.style.setProperty("--theme-accent", palette.accent);
  root.style.setProperty("--theme-card", palette.card);
  root.setAttribute("data-theme", id);
}
