// Manage-subscriptions panel — opened from the top nav (both demo and real
// accounts). Free/Pro/Ultra cards + monthly/yearly toggle, same dark-ink +
// gold language as ProSheet.jsx (that file owns the paywall moment; this one
// owns "let me see and change my plan" as its own screen, not a paywall).

import { startCheckout, startBillingPortal } from "../../lib/billing";
import { isNativeIOS } from "../../lib/platform";

function L5(t, en, uk, ru, fr, de) {
  return { en, uk, ru, fr, de }[t?.code] || en;
}

const COPY = {
  title: (t) => L5(t, "Manage subscription", "Керування підпискою", "Управление подпиской", "Gérer l'abonnement", "Abo verwalten"),
  billed: (t) => L5(t, "Billed", "Оплата", "Оплата", "Facturation", "Abrechnung"),
  monthly: (t) => L5(t, "Monthly", "Щомісяця", "Ежемесячно", "Mensuel", "Monatlich"),
  yearly: (t) => L5(t, "Yearly", "Щорічно", "Ежегодно", "Annuel", "Jährlich"),
  yearlyBadge: (t) => L5(t, "2 months free", "2 місяці безкоштовно", "2 месяца бесплатно", "2 mois offerts", "2 Monate gratis"),
  current: (t) => L5(t, "Current plan", "Поточний план", "Текущий план", "Plan actuel", "Aktueller Plan"),
  manageBilling: (t) => L5(t, "Manage billing", "Керувати оплатою", "Управлять оплатой", "Gérer la facturation", "Zahlung verwalten"),
  redirecting: (t) => L5(t, "Redirecting…", "Перехід…", "Переход…", "Redirection…", "Weiterleitung…"),
  tryFree: (t) => L5(t, "Try 3 days free", "3 дні безкоштовно", "3 дня бесплатно", "3 jours gratuits", "3 Tage gratis"),
  upgrade: (t) => L5(t, "Upgrade", "Оновити", "Обновить", "Passer à ce plan", "Upgraden"),
  native: (t) => L5(t, "Manage your plan on examik.net", "Керуй планом на examik.net", "Управляй планом на examik.net", "Gère ton abonnement sur examik.net", "Verwalte deinen Plan auf examik.net"),
  demoError: (t) => L5(t, "Create an account to start Pro.", "Створи акаунт, щоб почати Pro.", "Создай аккаунт, чтобы начать Pro.", "Crée un compte pour démarrer Pro.", "Erstelle ein Konto, um Pro zu starten."),
};

const PLANS = [
  {
    id: "free",
    name: (t) => L5(t, "Free", "Free", "Free", "Free", "Free"),
    blurb: (t) => L5(t, "First unit of every subject, one exam.", "Перший юніт кожного предмета, один іспит.", "Первый юнит каждого предмета, один экзамен.", "Premier chapitre de chaque matière, un examen.", "Erste Einheit jedes Fachs, eine Prüfung."),
    price: { monthly: "$0", yearly: "$0" },
  },
  {
    id: "pro",
    name: (t) => L5(t, "Pro", "Pro", "Pro", "Pro", "Pro"),
    blurb: (t) => L5(t, "Full syllabus, calendar, mistake journal.", "Повна програма, календар, журнал помилок.", "Полная программа, календарь, журнал ошибок.", "Programme complet, calendrier, journal.", "Voller Lehrplan, Kalender, Fehlerjournal."),
    price: { monthly: "$5.99", yearly: "$59.99" },
    badge: (t) => L5(t, "Most popular", "Найпопулярніший", "Самый популярный", "Le plus populaire", "Am beliebtesten"),
  },
  {
    id: "ultra",
    name: (t) => L5(t, "Ultra", "Ultra", "Ultra", "Ultra", "Ultra"),
    blurb: (t) => L5(t, "Smarter AI + Weekly Deep Report.", "Розумніший AI + щотижневий звіт.", "Более умный AI + еженедельный отчёт.", "IA plus performante + rapport hebdo.", "Klügere KI + Wochenbericht."),
    price: { monthly: "$9.99", yearly: "$99.99" },
    badge: (t) => L5(t, "Best value", "Найвигідніший", "Самый выгодный", "Meilleure valeur", "Bester Wert"),
  },
];

function PlanCard({ plan, t, interval, currentTier, busy, onPick }) {
  const isCurrent = currentTier === plan.id;
  const price = plan.price[interval];
  return (
    <div style={{
      flex: "1 1 200px", minWidth: 200, borderRadius: 20, padding: 20,
      background: isCurrent ? "color-mix(in srgb, var(--chrome-gold) 12%, var(--chrome-ink))" : "rgba(255,255,255,0.04)",
      border: isCurrent ? "1px solid var(--chrome-gold)" : "1px solid rgba(255,255,255,0.08)",
      display: "flex", flexDirection: "column", position: "relative",
    }}>
      {plan.badge && (
        <span style={{ position: "absolute", top: -11, left: 20, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 9px", borderRadius: 999, background: "var(--chrome-gold)", color: "#1F1400" }}>
          {plan.badge(t)}
        </span>
      )}
      <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "var(--chrome-paper)", marginTop: plan.badge ? 6 : 0 }}>{plan.name(t)}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--chrome-paper)", margin: "8px 0 2px" }}>
        {price}<span style={{ fontSize: 13, fontWeight: 500, color: "color-mix(in srgb, var(--chrome-paper) 55%, transparent)" }}>
          /{interval === "yearly" ? L5(t, "yr", "рік", "год", "an", "Jahr") : L5(t, "mo", "міс", "мес", "mois", "Monat")}
        </span>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: "color-mix(in srgb, var(--chrome-paper) 65%, transparent)", margin: "6px 0 16px", flex: 1 }}>{plan.blurb(t)}</p>
      {isCurrent ? (
        <div style={{ textAlign: "center", padding: "10px 0", fontSize: 13, fontWeight: 700, color: "var(--chrome-gold)" }}>{COPY.current(t)}</div>
      ) : plan.id === "free" ? null : (
        <button type="button" disabled={busy} onClick={() => onPick(plan.id)} style={{
          width: "100%", padding: 12, borderRadius: 999, border: "none", cursor: busy ? "default" : "pointer",
          background: plan.id === "pro" ? "var(--chrome-purple)" : "transparent",
          color: plan.id === "pro" ? "#fff" : "var(--chrome-gold)",
          boxShadow: plan.id === "ultra" ? "inset 0 0 0 1px color-mix(in srgb, var(--chrome-gold) 45%, transparent)" : "none",
          fontWeight: 700, fontSize: 14, fontFamily: "var(--font-sans)", opacity: busy ? 0.7 : 1,
        }}>{currentTier === "free" ? COPY.tryFree(t) : COPY.upgrade(t)}</button>
      )}
    </div>
  );
}

export function SubscriptionsPanel({ onClose, t }) {
  const profile = window.getProfile ? window.getProfile() : {};
  const currentTier = profile.tier === "pro" || profile.tier === "ultra" ? profile.tier : "free";
  const native = isNativeIOS();
  const [interval, setInterval] = React.useState("monthly");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  async function pick(tier) {
    setBusy(true);
    setError("");
    const result = await startCheckout(tier, interval);
    if (result.alreadyPro) { onClose?.(); return; }
    if (result.error) { setError(result.error); setBusy(false); }
  }

  async function manageBilling() {
    setBusy(true);
    setError("");
    const result = await startBillingPortal();
    if (result.error) { setError(result.error); setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "var(--font-sans)" }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={COPY.title(t)} style={{
        width: "100%", maxWidth: 760, maxHeight: "90vh", overflowY: "auto",
        background: "var(--chrome-ink)", borderRadius: 24, padding: "28px 24px", boxSizing: "border-box",
        boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "var(--chrome-paper)" }}>{COPY.title(t)}</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: "none", background: "transparent", color: "color-mix(in srgb, var(--chrome-paper) 60%, transparent)", fontSize: 22, lineHeight: 1, cursor: "pointer", padding: 4 }}>×</button>
        </div>

        {native ? (
          <p style={{ margin: "20px 0", textAlign: "center", fontSize: 15, fontWeight: 600, color: "color-mix(in srgb, var(--chrome-paper) 72%, transparent)" }}>{COPY.native(t)}</p>
        ) : (
          <>
            {currentTier !== "free" && (
              <button type="button" disabled={busy} onClick={manageBilling} style={{
                marginBottom: 18, padding: "10px 18px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.16)",
                background: "transparent", color: "var(--chrome-paper)", fontWeight: 600, fontSize: 13, cursor: busy ? "default" : "pointer", fontFamily: "var(--font-sans)",
              }}>{busy ? COPY.redirecting(t) : COPY.manageBilling(t)}</button>
            )}

            <div style={{ display: "inline-flex", alignItems: "center", gap: 2, padding: 3, borderRadius: 999, background: "rgba(255,255,255,0.06)", marginBottom: 20 }}>
              {["monthly", "yearly"].map((iv) => (
                <button key={iv} type="button" onClick={() => setInterval(iv)} style={{
                  padding: "7px 16px", borderRadius: 999, border: "none", cursor: "pointer",
                  background: interval === iv ? "var(--chrome-paper)" : "transparent",
                  color: interval === iv ? "var(--chrome-ink)" : "color-mix(in srgb, var(--chrome-paper) 70%, transparent)",
                  fontWeight: 700, fontSize: 13, fontFamily: "var(--font-sans)",
                }}>
                  {iv === "monthly" ? COPY.monthly(t) : COPY.yearly(t)}
                  {iv === "yearly" && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "var(--chrome-gold)" }}>{COPY.yearlyBadge(t)}</span>}
                </button>
              ))}
            </div>

            {error && <p style={{ margin: "0 0 14px", fontSize: 13, color: "#F87171" }}>{error}</p>}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {PLANS.map((plan) => (
                <PlanCard key={plan.id} plan={plan} t={t} interval={interval} currentTier={currentTier} busy={busy} onPick={pick} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
window.SubscriptionsPanel = SubscriptionsPanel;
