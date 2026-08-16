// Examik — Level TIER controller.
// The XP level system (brain-store.jsx xpLevel) groups levels into "tiers".
// Each tier re-themes the whole app by setting  data-tier  on <html> — the
// CSS in tokens/tiers.css does the rest. This file owns: the tier ladder,
// applying the right tier automatically as the student levels up, a one-time
// celebration when a new tier unlocks, and a preview hook for trying tiers.
//
// Loads AFTER brain-store.jsx (needs window.xpLevel / subscribeBrain) and
// profile-store.jsx (needs getProfile/saveProfile for the on/off setting).

(function () {
  // Tier ladder. `minLevel` is the level at which the tier unlocks.
  //
  // All five tiers theme the page (audit finding #11 — previously only "legend"
  // did, so leveling through the first four changed nothing visible). The lower
  // four are deliberately subtle light-mode treatments that re-tint the ambient
  // wash only; "legend" is the one full re-skin. See src/styles/tokens/tiers.css
  // for why the lower tiers must not override the accent tokens.
  const XP_TIERS = [
    { id: "novice",  minLevel: 1,  theme: true, emoji: "🌱", title: { en: "Novice",  uk: "Новачок",  ru: "Новичок",  fr: "Novice",  de: "Neuling" } },
    { id: "scholar", minLevel: 3,  theme: true, emoji: "📘", title: { en: "Scholar", uk: "Учень",    ru: "Ученик",   fr: "Élève",   de: "Schüler" } },
    { id: "adept",   minLevel: 5,  theme: true, emoji: "🔷", title: { en: "Adept",   uk: "Знавець",  ru: "Знаток",   fr: "Adepte",  de: "Kenner" } },
    { id: "master",  minLevel: 8,  theme: true, emoji: "🟣", title: { en: "Master",  uk: "Майстер",  ru: "Мастер",   fr: "Maître",  de: "Meister" } },
    { id: "legend",  minLevel: 12, theme: true, emoji: "👑", title: { en: "Legend",  uk: "Легенда",  ru: "Легенда",  fr: "Légende", de: "Legende" } },
  ];

  function tierForLevel(level) {
    let t = XP_TIERS[0];
    for (const tier of XP_TIERS) if (level >= tier.minLevel) t = tier;
    return t;
  }
  function tierTitle(tier, langCode) {
    return (tier.title && (tier.title[langCode] || tier.title.en)) || tier.id;
  }
  function currentLang() {
    return (window.getProfile && window.getProfile().lang) || "en";
  }
  // The tier the student is currently at (level-derived), regardless of the
  // on/off theme setting — used for the rank badge everywhere.
  function xpTier() {
    const lvl = (window.xpLevel ? window.xpLevel().level : 1);
    return tierForLevel(lvl);
  }

  const SEEN_TIER_KEY = "tier_seen_v1";
  let _previewing = null; // tier id when previewing, else null

  // Write the active tier onto <html>. Honors the user's on/off setting
  // (profile.tierThemeDisabled) and any active preview. Only themed tiers get
  // a data-tier value; base tiers clear it so the default look returns.
  function applyTierTheme() {
    const root = document.documentElement;
    if (_previewing) { root.setAttribute("data-tier", _previewing); return; }
    const disabled = window.getProfile && window.getProfile().tierThemeDisabled;
    const tier = xpTier();
    if (!disabled && tier.theme) root.setAttribute("data-tier", tier.id);
    else root.removeAttribute("data-tier");
  }

  // Fire a one-time celebration the first time a student reaches a new tier.
  function maybeCelebrate() {
    const tier = xpTier();
    let seen = null;
    try { seen = localStorage.getItem(SEEN_TIER_KEY); } catch {}
    if (seen === tier.id) return;
    const seenIdx = XP_TIERS.findIndex((t) => t.id === seen);
    const curIdx = XP_TIERS.findIndex((t) => t.id === tier.id);
    try { localStorage.setItem(SEEN_TIER_KEY, tier.id); } catch {}
    // Only celebrate a genuine promotion (not first-ever paint at novice, and
    // not a downward correction), and only for a themed tier.
    if (seen != null && curIdx > seenIdx && tier.theme) showTierToast(tier);
  }

  function showTierToast(tier) {
    const lang = currentLang();
    const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[lang] || en);
    // Now that every tier themes the page, this fires for bronze/silver/gold
    // promotions too — so the toast reads the tier's own accent instead of the
    // gold that was hardcoded back when only "legend" could reach here.
    // applyTierTheme() has already written data-tier by this point.
    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--tier-accent").trim() ||
      "#F3D062";
    const el = document.createElement("div");
    el.setAttribute("role", "status");
    el.style.cssText = [
      "position:fixed", "left:50%", "top:24px", "transform:translateX(-50%) translateY(-12px)",
      "z-index:6000", "display:flex", "align-items:center", "gap:12px",
      "padding:14px 20px", "border-radius:16px",
      "background:linear-gradient(135deg,#1b2119,#0f1410)",
      "border:1px solid " + accent,
      "box-shadow:0 12px 40px -12px rgba(0,0,0,0.6)",
      "color:#F3F6F1", "font-family:var(--font-sans,system-ui)", "font-weight:600",
      "opacity:0", "transition:opacity .5s ease,transform .5s cubic-bezier(0.16,1,0.3,1)",
    ].join(";");
    el.innerHTML =
      '<span style="font-size:26px">' + tier.emoji + '</span>' +
      '<span><span style="display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:' + accent + '">' +
      L("New tier unlocked", "Відкрито новий тир", "Открыт новый тир", "Nouveau palier", "Neue Stufe") +
      '</span><span style="font-size:16px">' + tierTitle(tier, lang) + '</span></span>';
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = "1"; el.style.transform = "translateX(-50%) translateY(0)"; });
    setTimeout(() => {
      el.style.opacity = "0"; el.style.transform = "translateX(-50%) translateY(-12px)";
      setTimeout(() => el.remove(), 600);
    }, 4200);
  }

  // Preview a tier without leveling up (used for trying tiers / QA). Pass null
  // to end the preview and return to the level-derived tier.
  function previewTier(id) {
    _previewing = id && XP_TIERS.some((t) => t.id === id) ? id : null;
    applyTierTheme();
    return _previewing;
  }

  // React to XP/level changes: re-apply the theme and celebrate promotions.
  if (window.subscribeBrain) window.subscribeBrain(() => { applyTierTheme(); maybeCelebrate(); });
  // Re-apply if the profile (language / on-off setting) changes via storage.
  window.addEventListener("storage", (e) => { if (!e.key || /profile/i.test(e.key)) applyTierTheme(); });

  // Initial paint. Seed "seen" on first ever load so we don't celebrate the
  // starting tier, then apply.
  try { if (localStorage.getItem(SEEN_TIER_KEY) == null) localStorage.setItem(SEEN_TIER_KEY, xpTier().id); } catch {}
  applyTierTheme();

  Object.assign(window, {
    XP_TIERS, xpTier, tierForLevel, tierTitle, applyTierTheme, previewTier,
  });
})();

// Module marker: these files carry no import/export of their own (they still
// communicate via `window` globals), and without one the JSX transform treats
// the file as a CommonJS script and emits a bare `require()` call that throws
// in the browser. Removed once this module uses real imports.
export {};
