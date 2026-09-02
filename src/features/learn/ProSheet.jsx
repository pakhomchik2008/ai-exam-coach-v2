// Pro gate — Learn lock, second exam, calendar, journal.
// Copy stays tied to what Free actually opens. Checkout is a server redirect.

import { startCheckout, pollProStatus } from "../../lib/billing";
import { isNativeIOS } from "../../lib/platform";
import { hasNativeIAP, purchaseNative } from "../../lib/native-iap";

function L5(t, en, uk, ru, fr, de) {
  return { en, uk, ru, fr, de }[t?.code] || en;
}

function paywallCopy(reason, t, freeCount, lockedCount) {
  if (reason === "calendar") {
    return {
      title: L5(t, "Calendar is Pro", "Календар — у Pro", "Календарь — в Pro", "Le calendrier est Pro", "Kalender ist Pro"),
      body: L5(t,
        "Free keeps the first unit. The week plan, drag, and exam-date grid unlock with Pro — 3 days free, then $5.99/month. Card at checkout.",
        "На Free — перший юніт. Тижневий план, перетягування і сітка дати іспиту відкриваються в Pro — 3 дні безкоштовно, далі $5.99/міс. Картка на Checkout.",
        "На Free — первый юнит. Недельный план, перетаскивание и сетка даты экзамена открываются в Pro — 3 дня бесплатно, дальше $5.99/мес. Карта на Checkout.",
        "Free garde le premier chapitre. Le plan de la semaine s’ouvre avec Pro — 3 jours gratuits, puis $5.99/mois.",
        "Free behält die erste Einheit. Wochenplan und Prüfungsdatum öffnen sich mit Pro — 3 Tage gratis, dann $5.99/Monat."),
    };
  }
  if (reason === "journal") {
    return {
      title: L5(t, "Mistake journal is Pro", "Журнал помилок — у Pro", "Журнал ошибок — в Pro", "Le journal est Pro", "Fehlerjournal ist Pro"),
      body: L5(t,
        "Misses stay in the session recap on Free. The journal — what you failed, how often, what came back — unlocks with Pro. 3 days free, then $5.99/month.",
        "На Free промах лишається в розборі сесії. Журнал — що впало, скільки разів, що вже повернулось — відкривається в Pro. 3 дні безкоштовно, далі $5.99/міс.",
        "На Free промах остаётся в разборе сессии. Журнал — что упало, сколько раз, что уже вернулось — открывается в Pro. 3 дня бесплатно, дальше $5.99/мес.",
        "Free garde le recap de séance. Le journal s’ouvre avec Pro. 3 jours gratuits, puis $5.99/mois.",
        "Free behält den Sitzungs-Recap. Das Journal öffnet sich mit Pro. 3 Tage gratis, dann $5.99/Monat."),
    };
  }
  if (reason === "exam_slot") {
    return {
      title: L5(t, "One exam on Free", "На Free — один іспит", "На Free — один экзамен", "Un examen en Free", "Eine Prüfung in Free"),
      body: L5(t,
        "Free holds one exam and the first unit of its tree (7 topics on NMT Maths, 10 on IELTS Listening). A second exam is Pro — 3 days free, then $5.99/month. Card at checkout.",
        "Free тримає один іспит і перший юніт дерева (7 тем у НМТ-математиці, 10 у IELTS Listening). Другий іспит — у Pro. 3 дні безкоштовно, далі $5.99/міс. Картка на Checkout.",
        "Free держит один экзамен и первый юнит дерева (7 тем в НМТ-математике, 10 в IELTS Listening). Второй экзамен — в Pro. 3 дня бесплатно, дальше $5.99/мес. Карта на Checkout.",
        "Free garde un examen et le premier chapitre de l’arbre (7 sujets NMT maths, 10 IELTS Listening). Un deuxième examen, c’est Pro. 3 jours gratuits, puis $5.99/mois.",
        "Free hält eine Prüfung und die erste Einheit (7 Themen NMT-Mathe, 10 IELTS Listening). Eine zweite Prüfung ist Pro. 3 Tage gratis, dann $5.99/Monat."),
    };
  }
  return {
    title: L5(t, "The rest of the syllabus", "Решта програми", "Остальная программа", "Le reste du programme", "Der Rest des Lehrplans"),
    body: L5(t,
      `${freeCount} topics in the first unit are free. ${lockedCount} more unlock with Pro — 3 days of Pro free, then $5.99/month. Card at checkout.`,
      `${freeCount} тем у першому юніті безкоштовно. Ще ${lockedCount} відкриються в Pro — 3 дні Pro безкоштовно, далі $5.99/міс. Картка на Checkout.`,
      `${freeCount} тем в первом юните бесплатно. Ещё ${lockedCount} откроются в Pro — 3 дня Pro бесплатно, дальше $5.99/мес. Карта на Checkout.`,
      `${freeCount} sujets du premier chapitre sont gratuits. ${lockedCount} de plus avec Pro — 3 jours de Pro gratuits, puis $5.99/mois.`,
      `${freeCount} Themen der ersten Einheit gratis. ${lockedCount} weitere mit Pro — 3 Tage Pro kostenlos, dann $5.99/Monat.`),
  };
}

function PaywallBody({ reason, freeCount, lockedCount, onClose, t, page }) {
  const { title, body } = paywallCopy(reason, t, freeCount, lockedCount);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const native = isNativeIOS();
  // A Stripe web subscriber opening the native app must never be asked to
  // buy again through StoreKit (App Review 3.1.3(b), cross-platform
  // entitlement recognition) — profile.tier is server-authoritative
  // regardless of which store paid for it, so an existing paid tier always
  // routes to "manage on examik.net", IAP or not.
  const alreadyPaid = ["pro", "ultra"].includes(window.getProfile?.()?.tier);
  // A demo session never gets Purchases.configure() called (native-iap.ts's
  // initNativeIAP guards on !is_anonymous), so its RevenueCat SDK is never
  // initialized — purchaseNative() would fail confusingly instead of showing
  // the same "create an account" prompt the web checkout path already has.
  const isDemoSession = window.getSession?.()?.mode === "demo";
  const canBuyNative = native && hasNativeIAP() && !alreadyPaid && !isDemoSession;
  // "Manage on examik.net" is the safe fallback for native — but only when
  // there's genuinely nowhere else to send the tap. A demo visitor still
  // gets a real button: upgrade() falls through to startCheckout(), which
  // shows "Create an account to start Pro." inline without ever navigating
  // the WebView anywhere (postBilling checks session.mode before any fetch).
  const showManageText = native && !isDemoSession && (alreadyPaid || !hasNativeIAP());

  async function upgrade(tier = "pro") {
    setBusy(true);
    setError("");
    const result = canBuyNative ? await purchaseNative(tier, "monthly") : await startCheckout(tier, "monthly");
    if (result.alreadyPro) {
      onClose?.();
      return;
    }
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    if (result.ok) {
      setBusy(false);
      if (canBuyNative) void pollProStatus(); // webhook lags the purchase promise — see billing.ts
      onClose?.();
    } else {
      // purchaseNative() resolves with {} (no ok, no error) on a user-cancelled
      // StoreKit sheet — not an error, just let them try again.
      setBusy(false);
    }
  }

  return React.createElement(React.Fragment, null,
    React.createElement("div", { style: { fontFamily: "'JetBrains Mono', var(--font-mono)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--chrome-gold)", marginBottom: 12 } }, "PRO"),
    React.createElement("h3", { style: { margin: "0 0 10px", fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.15, color: "var(--chrome-paper)" } }, title),
    React.createElement("p", { style: { margin: "0 0 20px", fontSize: 16, lineHeight: 1.55, color: "color-mix(in srgb, var(--chrome-paper) 72%, transparent)" } }, body),
    error ? React.createElement("p", { style: { margin: "0 0 12px", fontSize: 13, color: "#F87171" } }, error) : null,
    showManageText
      ? React.createElement("p", { style: { margin: 0, padding: "17px 0", textAlign: "center", fontSize: 15, fontWeight: 600, color: "color-mix(in srgb, var(--chrome-paper) 72%, transparent)" } },
          L5(t, "Manage your plan on examik.net", "Керуй планом на examik.net", "Управляй планом на examik.net", "Gère ton abonnement sur examik.net", "Verwalte deinen Plan auf examik.net"))
      : React.createElement(React.Fragment, null,
          React.createElement("button", {
            type: "button",
            disabled: busy,
            onClick: () => upgrade("pro"),
            style: { width: "100%", padding: 17, borderRadius: 999, background: "var(--chrome-purple)", color: "#fff", border: "none", fontSize: 17, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1, fontFamily: "var(--font-sans)" },
          }, busy
            ? (canBuyNative
                ? L5(t, "Purchasing…", "Купівля…", "Покупка…", "Achat…", "Kauf läuft…")
                : L5(t, "Redirecting…", "Перехід…", "Переход…", "Redirection…", "Weiterleitung…"))
            : (canBuyNative
                ? L5(t, "Get Pro — $5.99/mo", "Отримати Pro — $5.99/міс", "Получить Pro — $5.99/мес", "Passer à Pro — $5.99/mois", "Pro holen — $5.99/Monat")
                : L5(t, "Try 3 days of Pro free", "Спробуй 3 дні Pro безкоштовно", "Попробуй 3 дня Pro бесплатно", "Essaie 3 jours de Pro gratuits", "Teste 3 Tage Pro gratis"))),
          React.createElement("button", {
            type: "button",
            disabled: busy,
            onClick: () => upgrade("ultra"),
            style: { width: "100%", marginTop: 10, padding: "12px 16px", borderRadius: 12, border: "1px solid color-mix(in srgb, var(--chrome-gold) 45%, transparent)", background: "transparent", color: "var(--chrome-gold)", fontSize: 14, fontWeight: 600, cursor: busy ? "default" : "pointer", fontFamily: "var(--font-sans)" },
          }, L5(t, "Or go Ultra — smarter AI + Weekly Deep Report, $9.99/mo", "Або Ultra — розумніший AI + щотижневий звіт, $9.99/міс", "Или Ultra — более умный AI + еженедельный отчёт, $9.99/мес", "Ou passe à Ultra — IA plus performante + rapport hebdo, $9.99/mois", "Oder Ultra — klügere KI + Wochenbericht, $9.99/Monat")),
          React.createElement("p", { style: { margin: "14px 0 0", textAlign: "center", fontFamily: "'JetBrains Mono', var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", color: "color-mix(in srgb, var(--chrome-paper) 45%, transparent)" } },
            // Apple (not Examik) handles refunds and cancellation for a
            // StoreKit purchase — the Stripe 14-day-refund line would promise
            // something Examik doesn't control on this path.
            canBuyNative
              ? L5(t, "BILLED BY APPLE · CANCEL ANYTIME IN SETTINGS", "ОПЛАТА ЧЕРЕЗ APPLE · СКАСУВАННЯ В НАЛАШТУВАННЯХ", "ОПЛАТА ЧЕРЕЗ APPLE · ОТМЕНА В НАСТРОЙКАХ", "FACTURÉ PAR APPLE · ANNULATION DANS LES RÉGLAGES", "ABGERECHNET VON APPLE · KÜNDIGUNG IN DEN EINSTELLUNGEN")
              : L5(t, "REFUNDS 14 DAYS · CANCEL ANYTIME", "ПОВЕРНЕННЯ 14 ДНІВ · СКАСУВАННЯ БУДЬ-КОЛИ", "ВОЗВРАТ 14 ДНЕЙ · ОТМЕНА В ЛЮБОЙ МОМЕНТ", "REMBOURSEMENT 14 JOURS · ANNULATION LIBRE", "RÜCKERSTATTUNG 14 TAGE · JEDERZEIT KÜNDBAR"))),
    onClose && !page ? React.createElement("button", {
      type: "button",
      onClick: onClose,
      style: { width: "100%", marginTop: 10, padding: "12px 16px", borderRadius: 12, border: "none", background: "transparent", color: "color-mix(in srgb, var(--chrome-paper) 55%, transparent)", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "var(--font-sans)" },
    }, L5(t, "Not now", "Не зараз", "Не сейчас", "Pas maintenant", "Nicht jetzt")) : null,
  );
}

export function ProSheet({ lockedCount, freeCount, onClose, t, reason = "learn" }) {
  return React.createElement("div", {
    className: "learn-sheet-backdrop",
    onClick: onClose,
    style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 120, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  }, React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    className: "learn-sheet-panel-safe",
    onClick: (e) => e.stopPropagation(),
    style: { background: "var(--chrome-ink)", padding: "16px 24px calc(30px + env(safe-area-inset-bottom, 0px))", borderRadius: "28px 28px 0 0", width: "100%", maxWidth: 520, boxSizing: "border-box" },
  },
    React.createElement("div", { "aria-hidden": "true", style: { width: 40, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.24)", margin: "0 auto 20px" } }),
    React.createElement(PaywallBody, { reason, freeCount, lockedCount, onClose, t }),
  ));
}

/** Full-tab stand-in when Calendar or Journal is locked. Not a modal. Dark
 * ink card — PaywallBody's text colors assume the dark scheme now (matches
 * the ProSheet redesign), so this wrapper stays in sync with it. */
export function ProGatePage({ reason, t }) {
  return React.createElement("div", {
    style: { maxWidth: 520, margin: "24px auto", padding: "32px 28px", background: "var(--chrome-ink)", borderRadius: 28 },
  }, React.createElement(PaywallBody, { reason, t, page: true }));
}
