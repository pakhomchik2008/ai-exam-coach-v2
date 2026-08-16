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
    expect(String(langs.uk?.land_hero_title)).toContain("Examik");
  });

  it("price copy matches Checkout: first-unit counts, no yearly SKU, hash not exam-board", () => {
    for (const code of Object.keys(langs)) {
      const pack = langs[code];
      if (!pack) throw new Error(`missing LANGS.${code}`);
      expect(String(pack.land_price_free_body), code).toMatch(/7/);
      expect(String(pack.land_price_free_body), code).toMatch(/10/);
      expect(String(pack.land_price_sub), code).not.toMatch(/\$54|54\s*\$/);
      expect(String(pack.land_faq_1_a), code).not.toMatch(/\$54|54\s*\$/);
      expect(String(pack.land_faq_7_a), code).not.toMatch(/unless you pick yearly|якщо не обереш рік|если не выберешь год|si tu ne prends pas|wenn du nicht das Jahr/);
      expect(String(pack.land_hero_sub), code).toMatch(/IELTS/);
      expect(String(pack.land_hero_sub), code).not.toMatch(/SAT|A-Level|GCSE/);
      expect(String(pack.land_faq_9_a), code).toMatch(/hash|хеш|hach|gehash/i);
      expect(String(pack.land_faq_8_a), code).not.toMatch(/вересня|September|septembre/);
      expect(String(pack.land_about_p1), code).not.toMatch(/Ідеальний|ideal|Идеальный|tuteur qu’il te faut|Der Tutor für/i);
      expect(String(pack.land_about_p3), code).not.toMatch(/вересня|September|septembre|2026/);
      expect(String(pack.land_reel_title), code).toMatch(/Pro/);
      expect(pack.land_cta_d47, code).toBeUndefined();
      expect(pack.land_price_max_name, code).toBeUndefined();
      expect(pack.land_feat_novelty_body, code).toBeUndefined();
    }
  });

  it("privacy copy says Settings wipe the auth account, not a Phase 6 cascade", () => {
    for (const code of Object.keys(langs)) {
      const body = String(langs[code]?.legal_privacy_body);
      expect(body, code).not.toMatch(/phase 6|фаз[іе] 6/i);
      expect(body, code).toMatch(/auth/i);
    }
  });
});
