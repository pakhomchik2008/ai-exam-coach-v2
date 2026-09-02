// Manage-subscriptions panel — opened from the top nav (both demo and real
// accounts). Free/Pro/Ultra cards + monthly/yearly toggle, same dark-ink +
// gold language as ProSheet.jsx (that file owns the paywall moment; this one
// owns "let me see and change my plan" as its own screen, not a paywall).

import { startCheckout, startBillingPortal, pollProStatus } from "../../lib/billing";
import { isNativeIOS } from "../../lib/platform";
import { hasNativeIAP, purchaseNative, restoreNativePurchases } from "../../lib/native-iap";

function L5(t, en, uk, ru, fr, de) {
  return { en, uk, ru, fr, de }[t?.code] || en;
}

const COPY = {
  title: (t) => L5(t, "Manage subscription", "Керування підпискою", "Управление подпиской", "Gérer l'abonnement", "Abo verwalten"),
  billed: (t) => L5(t, "Billed", "Оплата", "Оплата", "Facturation", "Abrechnung"),
  monthly: (t) => L5(t, "Monthly", "Щомісяця", "Ежемесячно", "Mensuel", "Monatlich"),
  yearly: (t) => L5(t, "Yearly", "Щорічно", "Ежегодно", "Annuel", "Jährlich"),
  current: (t) => L5(t, "Current plan", "Поточний план", "Текущий план", "Plan actuel", "Aktueller Plan"),
  manageBilling: (t) => L5(t, "Manage billing", "Керувати оплатою", "Управлять оплатой", "Gérer la facturation", "Zahlung verwalten"),
  redirecting: (t) => L5(t, "Redirecting…", "Перехід…", "Переход…", "Redirection…", "Weiterleitung…"),
  tryFree: (t) => L5(t, "Try 3 days free", "3 дні безкоштовно", "3 дня бесплатно", "3 jours gratuits", "3 Tage gratis"),
  payNow: (t) => L5(t, "Pay now", "Оплатити зараз", "Оплатить сейчас", "Payer maintenant", "Jetzt bezahlen"),
  // StoreKit doesn't do the Stripe 3-day-trial flow — a native purchase is
  // an immediate charge, so the button says exactly that instead of
  // promising a trial the App Store checkout sheet won't actually give.
  buyNow: (t, plan) => L5(t, `Buy ${plan}`, `Купити ${plan}`, `Купить ${plan}`, `Acheter ${plan}`, `${plan} kaufen`),
  skipTrial: (t) => L5(t, "Skip the 3-day trial — charge me today", "Без 3-денного пробного — оплата сьогодні", "Без 3-дневного пробного — оплата сегодня", "Sans les 3 jours d'essai — facturer aujourd'hui", "Ohne 3-Tage-Testphase — heute abrechnen"),
  native: (t) => L5(t, "Manage your plan on examik.net", "Керуй планом на examik.net", "Управляй планом на examik.net", "Gère ton abonnement sur examik.net", "Verwalte deinen Plan auf examik.net"),
  demoError: (t) => L5(t, "Create an account to start Pro.", "Створи акаунт, щоб почати Pro.", "Создай аккаунт, чтобы начать Pro.", "Crée un compte pour démarrer Pro.", "Erstelle ein Konto, um Pro zu starten."),
  purchasing: (t) => L5(t, "Purchasing…", "Купівля…", "Покупка…", "Achat…", "Kauf läuft…"),
  restore: (t) => L5(t, "Restore purchases", "Відновити покупки", "Восстановить покупки", "Restaurer les achats", "Käufe wiederherstellen"),
  restoring: (t) => L5(t, "Restoring…", "Відновлення…", "Восстановление…", "Restauration…", "Wird wiederhergestellt…"),
  billedByApple: (t) => L5(t, "Billed by Apple · cancel anytime in Settings", "Оплата через Apple · скасування в Налаштуваннях", "Оплата через Apple · отмена в Настройках", "Facturé par Apple · annulation dans Réglages", "Abgerechnet von Apple · Kündigung in den Einstellungen"),
};

const PLANS = [
  {
    id: "free",
    name: (t) => L5(t, "Free", "Free", "Free", "Free", "Free"),
    price: { monthly: "$0", yearly: "$0" },
    features: (t) => [
      L5(t, "First unit of every subject", "Перший юніт кожного предмета", "Первый юнит каждого предмета", "Premier chapitre de chaque matière", "Erste Einheit jedes Fachs"),
      L5(t, "1 saved exam", "1 збережений іспит", "1 сохранённый экзамен", "1 examen enregistré", "1 gespeicherte Prüfung"),
      L5(t, "AI Coach chat", "Чат з AI Coach", "Чат с AI Coach", "Chat AI Coach", "AI-Coach-Chat"),
      L5(t, "Practice Engine & Speed Round", "Practice Engine і Speed Round", "Practice Engine и Speed Round", "Practice Engine et Speed Round", "Practice Engine & Speed Round"),
    ],
  },
  {
    id: "pro",
    name: (t) => L5(t, "Pro", "Pro", "Pro", "Pro", "Pro"),
    price: { monthly: "$5.99", yearly: "$59.99" },
    badge: (t) => L5(t, "Most popular", "Найпопулярніший", "Самый популярный", "Le plus populaire", "Am beliebtesten"),
    features: (t) => [
      L5(t, "Everything in Free", "Все з Free", "Всё из Free", "Tout Free", "Alles aus Free"),
      L5(t, "Full syllabus, every unit", "Повна програма, кожен юніт", "Полная программа, каждый юнит", "Programme complet, chaque chapitre", "Voller Lehrplan, jede Einheit"),
      L5(t, "Unlimited exams", "Необмежена кількість іспитів", "Неограниченное число экзаменов", "Examens illimités", "Unbegrenzte Prüfungen"),
      L5(t, "Weekly study calendar", "Тижневий план навчання", "Недельный план обучения", "Calendrier hebdomadaire", "Wöchentlicher Studienplan"),
      L5(t, "Mistake journal", "Журнал помилок", "Журнал ошибок", "Journal d'erreurs", "Fehlerjournal"),
      L5(t, "Exam Simulation & flashcards", "Симуляція іспиту та картки", "Симуляция экзамена и карточки", "Simulation d'examen et fiches", "Prüfungssimulation & Karteikarten"),
    ],
  },
  {
    id: "ultra",
    name: (t) => L5(t, "Ultra", "Ultra", "Ultra", "Ultra", "Ultra"),
    price: { monthly: "$9.99", yearly: "$99.99" },
    badge: (t) => L5(t, "Best value", "Найвигідніший", "Самый выгодный", "Meilleure valeur", "Bester Wert"),
    features: (t) => [
      L5(t, "Everything in Pro", "Все з Pro", "Всё из Pro", "Tout Pro", "Alles aus Pro"),
      L5(t, "Smarter AI model", "Розумніша модель AI", "Более умная модель AI", "Modèle IA plus performant", "Klügeres KI-Modell"),
      L5(t, "Weekly Deep Report", "Щотижневий поглиблений звіт", "Еженедельный углублённый отчёт", "Rapport hebdomadaire approfondi", "Wöchentlicher Tiefenbericht"),
    ],
  },
];

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
      <circle cx="10" cy="10" r="10" fill="var(--chrome-gold)" />
      <path d="M6 10.3l2.4 2.4L14 7" stroke="#1F1400" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlanCard({ plan, t, interval, currentTier, busy, skipTrial, canBuyNative, onPick }) {
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
      <ul style={{ listStyle: "none", margin: "14px 0 16px", padding: 0, display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
        {plan.features(t).map((f, i) => (
          <li key={i} style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.4, color: "color-mix(in srgb, var(--chrome-paper) 82%, transparent)" }}>
            <CheckIcon />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {isCurrent ? (
        <div style={{ textAlign: "center", padding: "10px 0", fontSize: 13, fontWeight: 700, color: "var(--chrome-gold)" }}>{COPY.current(t)}</div>
      ) : plan.id === "free" ? null : (
        <button type="button" disabled={busy} onClick={() => onPick(plan.id)} style={{
          width: "100%", padding: 12, borderRadius: 999, border: "none", cursor: busy ? "default" : "pointer",
          background: plan.id === "pro" ? "var(--chrome-purple)" : "transparent",
          color: plan.id === "pro" ? "#fff" : "var(--chrome-gold)",
          boxShadow: plan.id === "ultra" ? "inset 0 0 0 1px color-mix(in srgb, var(--chrome-gold) 45%, transparent)" : "none",
          fontWeight: 700, fontSize: 14, fontFamily: "var(--font-sans)", opacity: busy ? 0.7 : 1,
        }}>{canBuyNative ? COPY.buyNow(t, plan.name(t)) : (skipTrial ? COPY.payNow(t) : COPY.tryFree(t))}</button>
      )}
    </div>
  );
}

export function SubscriptionsPanel({ onClose, t }) {
  const profile = window.getProfile ? window.getProfile() : {};
  const currentTier = profile.tier === "pro" || profile.tier === "ultra" ? profile.tier : "free";
  const native = isNativeIOS();
  // Same cross-platform-entitlement rule as ProSheet.jsx: a Stripe web
  // subscriber must never be offered a second, StoreKit purchase for a plan
  // they already have. A demo session is excluded too — its RevenueCat SDK
  // is never configured (native-iap.ts's initNativeIAP guards on
  // !is_anonymous), so purchaseNative() would fail; startCheckout()'s
  // existing "Create an account to start Pro." demo check is the correct
  // path here instead.
  const isDemoSession = window.getSession?.()?.mode === "demo";
  const canBuyNative = native && hasNativeIAP() && currentTier === "free" && !isDemoSession;
  const showManageText = native && !isDemoSession && (currentTier !== "free" || !hasNativeIAP());
  const [interval, setInterval] = React.useState("monthly");
  const [skipTrial, setSkipTrial] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [restoring, setRestoring] = React.useState(false);
  const [error, setError] = React.useState("");

  async function pick(tier) {
    setBusy(true);
    setError("");
    const result = canBuyNative ? await purchaseNative(tier, interval) : await startCheckout(tier, interval, skipTrial);
    if (result.alreadyPro) { onClose?.(); return; }
    if (result.error) { setError(result.error); setBusy(false); return; }
    if (result.ok) {
      setBusy(false);
      if (canBuyNative) void pollProStatus(); // webhook lags the purchase promise — see billing.ts
      onClose?.();
      return;
    }
    setBusy(false); // purchaseNative(): {} means the StoreKit sheet was cancelled — not an error
  }

  async function restore() {
    setRestoring(true);
    setError("");
    const result = await restoreNativePurchases();
    if (result.error) setError(result.error);
    else void pollProStatus();
    setRestoring(false);
  }

  async function manageBilling() {
    setBusy(true);
    setError("");
    const result = await startBillingPortal();
    if (!result.error) return;
    // profile.tier can say "pro"/"ultra" with no real Stripe customer behind
    // it yet (stale cache, or the dev demo-Ultra override) — the portal 404s
    // with "Start a trial first" and there was no way out. Fall back to a
    // real checkout for the current tier instead of leaving the user stuck.
    const checkout = await startCheckout(currentTier, interval, skipTrial);
    if (checkout.error) { setError(checkout.error); }
    setBusy(false);
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

        {showManageText ? (
          <>
            <p style={{ margin: "20px 0", textAlign: "center", fontSize: 15, fontWeight: 600, color: "color-mix(in srgb, var(--chrome-paper) 72%, transparent)" }}>{COPY.native(t)}</p>
            {native && hasNativeIAP() && (
              <button type="button" disabled={restoring} onClick={restore} style={{
                display: "block", margin: "0 auto", padding: "10px 18px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.16)",
                background: "transparent", color: "var(--chrome-paper)", fontWeight: 600, fontSize: 13, cursor: restoring ? "default" : "pointer", fontFamily: "var(--font-sans)",
              }}>{restoring ? COPY.restoring(t) : COPY.restore(t)}</button>
            )}
            {error && <p style={{ margin: "14px 0 0", textAlign: "center", fontSize: 13, color: "#F87171" }}>{error}</p>}
          </>
        ) : (
          <>
            {currentTier !== "free" && !native && (
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
                </button>
              ))}
            </div>

            {!canBuyNative && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, fontSize: 13, color: "color-mix(in srgb, var(--chrome-paper) 78%, transparent)", cursor: "pointer" }}>
                <input type="checkbox" checked={skipTrial} onChange={(e) => setSkipTrial(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--chrome-gold)" }} />
                {COPY.skipTrial(t)}
              </label>
            )}

            {error && <p style={{ margin: "0 0 14px", fontSize: 13, color: "#F87171" }}>{error}</p>}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {PLANS.map((plan) => (
                <PlanCard key={plan.id} plan={plan} t={t} interval={interval} currentTier={currentTier} busy={busy} skipTrial={skipTrial} canBuyNative={canBuyNative} onPick={pick} />
              ))}
            </div>

            {canBuyNative && (
              <>
                <p style={{ margin: "16px 0 0", textAlign: "center", fontFamily: "'JetBrains Mono', var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", color: "color-mix(in srgb, var(--chrome-paper) 45%, transparent)" }}>
                  {COPY.billedByApple(t)}
                </p>
                <button type="button" disabled={restoring} onClick={restore} style={{
                  display: "block", margin: "12px auto 0", padding: "8px 16px", borderRadius: 999, border: "none",
                  background: "transparent", color: "color-mix(in srgb, var(--chrome-paper) 60%, transparent)", fontWeight: 600, fontSize: 12, cursor: restoring ? "default" : "pointer", fontFamily: "var(--font-sans)",
                }}>{restoring ? COPY.restoring(t) : COPY.restore(t)}</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
window.SubscriptionsPanel = SubscriptionsPanel;
