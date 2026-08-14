// Pro gate sheet — shown when a free student taps a locked Learn topic.
// Checkout is a server redirect. This sheet is the in-Learn pay click.

import { startProCheckout } from "../../lib/billing";

export function ProSheet({ lockedCount, freeCount, onClose, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  async function upgrade() {
    setBusy(true);
    setError("");
    const result = await startProCheckout();
    if (result.alreadyPro) {
      onClose();
      return;
    }
    if (result.error) {
      setError(result.error);
      setBusy(false);
    }
  }

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
    React.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--indigo-600)", marginBottom: 6 } }, "Pro"),
    React.createElement("h3", { style: { margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "var(--text-strong)" } },
      L("The rest of the syllabus", "Решта програми", "Остальная программа", "Le reste du programme", "Der Rest des Lehrplans")),
    React.createElement("p", { style: { margin: "0 0 18px", fontSize: 15, lineHeight: 1.55, color: "var(--text-muted)" } },
      L(`${freeCount} topics are free. ${lockedCount} more unlock with Pro — 3 days trial, then $4/month. Card at checkout.`,
        `${freeCount} тем безкоштовно. Ще ${lockedCount} відкриються в Pro — 3 дні тріалу, далі $4/міс. Картка на Checkout.`,
        `${freeCount} тем бесплатно. Ещё ${lockedCount} откроются в Pro — 3 дня триала, дальше $4/мес. Карта на Checkout.`,
        `${freeCount} sujets gratuits. ${lockedCount} de plus avec Pro — 3 jours d’essai, puis $4/mois.`,
        `${freeCount} Themen gratis. ${lockedCount} weitere mit Pro — 3 Tage Trial, dann $4/Monat.`)),
    error ? React.createElement("p", { style: { margin: "0 0 12px", fontSize: 13, color: "var(--red-600)" } }, error) : null,
    React.createElement("button", {
      type: "button",
      disabled: busy,
      onClick: upgrade,
      style: { width: "100%", padding: "14px 16px", borderRadius: 12, border: "none", background: "var(--indigo-600)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: busy ? "wait" : "pointer", fontFamily: "var(--font-sans)", opacity: busy ? 0.7 : 1 },
    }, busy
      ? L("Redirecting…", "Перехід…", "Переход…", "Redirection…", "Weiterleitung…")
      : L("Start 3-day trial", "Почати 3-денний тріал", "Начать 3-дневный триал", "Commencer l’essai", "3-Tage-Trial starten")),
    React.createElement("button", {
      type: "button",
      onClick: onClose,
      style: { width: "100%", marginTop: 8, padding: "12px 16px", borderRadius: 12, border: "none", background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "var(--font-sans)" },
    }, L("Not now", "Не зараз", "Не сейчас", "Pas maintenant", "Nicht jetzt")),
  ));
}
