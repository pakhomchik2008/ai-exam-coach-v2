// Pro gate sheet — shown when a free student taps a locked Learn topic.
// Billing is not wired. The point is to show the rest of the syllabus
// exists, not to hide it.

export function ProSheet({ lockedCount, freeCount, onClose, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
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
      L(`${freeCount} topics are free. ${lockedCount} more unlock with Pro — same list as the full tree, not a thinner course.`,
        `${freeCount} тем безкоштовно. Ще ${lockedCount} відкриються в Pro — той самий список, не урізаний курс.`,
        `${freeCount} тем бесплатно. Ещё ${lockedCount} откроются в Pro — тот же список, не урезанный курс.`,
        `${freeCount} sujets gratuits. ${lockedCount} de plus avec Pro.`,
        `${freeCount} Themen gratis. ${lockedCount} weitere mit Pro.`)),
    React.createElement("button", {
      type: "button",
      onClick: onClose,
      style: { width: "100%", padding: "14px 16px", borderRadius: 12, border: "none", background: "var(--indigo-600)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "var(--font-sans)" },
    }, L("Got it", "Зрозуміло", "Понятно", "Compris", "Verstanden")),
  ));
}
