/**
 * Missing-key CI for the 5 UI languages. Landing copy is merged into LANGS
 * in i18n.jsx — a key that exists in UK but not DE would ship a blank headline.
 */
import { describe, it, expect } from "vitest";
import "../bootstrap";

type LangPack = Record<string, unknown> & { code: string };

describe("i18n key parity", () => {
  const langs = (window as unknown as { LANGS: Record<string, LangPack> }).LANGS;

  it("exposes en uk ru fr de", () => {
    expect(Object.keys(langs).sort()).toEqual(["de", "en", "fr", "ru", "uk"]);
  });

  it("every language has the same keys as en", () => {
    const en = langs.en;
    if (!en) throw new Error("missing LANGS.en");
    const enKeys = Object.keys(en).sort();
    for (const code of Object.keys(langs)) {
      const pack = langs[code];
      if (!pack) throw new Error(`missing LANGS.${code}`);
      expect(Object.keys(pack).sort(), code).toEqual(enKeys);
    }
  });

  it("Ukrainian hero is the source headline", () => {
    expect(String(langs.uk?.land_hero_title)).toContain("Прогнозуй");
  });
});
