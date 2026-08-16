// Pro gate — Learn lock, second exam, calendar, journal.
// Copy stays tied to what Free actually opens. Checkout is a server redirect.

import { startProCheckout } from "../../lib/billing";

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

  async function upgrade() {
    setBusy(true);
    setError("");
    const result = await startProCheckout();
    if (result.alreadyPro) {
      onClose?.();
      return;
    }
    if (result.error) {
      setError(result.error);
      setBusy(false);
    }
  }

  return React.createElement(React.Fragment, null,
    React.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--indigo-600)", marginBottom: 6 } }, "Pro"),
    React.createElement("h3", { style: { margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "var(--text-strong)" } }, title),
    React.createElement("p", { style: { margin: "0 0 18px", fontSize: 15, lineHeight: 1.55, color: "var(--text-muted)" } }, body),
    error ? React.createElement("p", { style: { margin: "0 0 12px", fontSize: 13, color: "var(--red-600)" } }, error) : null,
    React.createElement("button", {
      type: "button",
      disabled: busy,
      onClick: upgrade,
      style: { width: "100%", padding: "14px 16px", borderRadius: 12, border: "none", background: "var(--indigo-600)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: busy ? "wait" : "pointer", fontFamily: "var(--font-sans)", opacity: busy ? 0.7 : 1 },
    }, busy
      ? L5(t, "Redirecting…", "Перехід…", "Переход…", "Redirection…", "Weiterleitung…")
      : L5(t, "Start 3-day trial", "Почати 3-денний тріал", "Начать 3-дневный триал", "Commencer l’essai", "3-Tage-Trial starten")),
    onClose && !page ? React.createElement("button", {
      type: "button",
      onClick: onClose,
      style: { width: "100%", marginTop: 8, padding: "12px 16px", borderRadius: 12, border: "none", background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "var(--font-sans)" },
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
    onClick: (e) => e.stopPropagation(),
    style: { background: "var(--surface-card)", padding: "16px 20px calc(28px + env(safe-area-inset-bottom, 0px))", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 520, boxSizing: "border-box" },
  },
    React.createElement("div", { "aria-hidden": "true", style: { width: 36, height: 4, borderRadius: 99, background: "var(--border-strong)", margin: "0 auto 14px" } }),
    React.createElement(PaywallBody, { reason, freeCount, lockedCount, onClose, t }),
  ));
}

/** Full-tab stand-in when Calendar or Journal is locked. Not a modal. */
export function ProGatePage({ reason, t }) {
  return React.createElement("div", {
    style: { maxWidth: 520, margin: "24px auto", padding: "28px 24px", background: "var(--surface-card)", borderRadius: 16, border: "1px solid var(--border-subtle)" },
  }, React.createElement(PaywallBody, { reason, t, page: true }));
}
