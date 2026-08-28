/**
 * Client billing. Checkout lives on the server so the Stripe secret never
 * ships in the bundle. This module redirects, then refreshes Pro from the
 * `subscriptions` row the webhook writes.
 *
 * isProStatus is duplicated from api/_stripe.js on purpose — importing
 * that file here would pull node:crypto into the Vite browser bundle.
 */
export function isProStatus(status: string | undefined | null): boolean {
  return status === "trialing" || status === "active" || status === "past_due";
}

type SessionLike = { id?: string; mode?: string };
type ProfileLike = { pro?: boolean; tier?: string };
type BillingFlag = "success" | "cancel";

function w(): Window & {
  getSession?: () => SessionLike | null;
  getProfile?: () => ProfileLike;
  saveProfile?: (patch: ProfileLike) => void;
  apiHeaders?: () => Promise<Record<string, string>>;
  _supabase?: {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{
            data: { status?: string; trial_end?: string; current_period_end?: string; tier?: string } | null;
            error: { code?: string } | null;
          }>;
        };
      };
    };
  };
} {
  return window;
}

export function consumeBillingQuery(): BillingFlag | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const billing = params.get("billing");
  if (billing !== "success" && billing !== "cancel") return null;
  params.delete("billing");
  const qs = params.toString();
  const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", next);
  return billing;
}

async function postBilling(path: string, jsonBody?: unknown): Promise<{ ok?: true; error?: string; alreadyPro?: boolean }> {
  const session = w().getSession?.();
  if (!session || session.mode === "demo") {
    return { error: "Create an account to start Pro." };
  }
  const headers = await w().apiHeaders?.();
  if (!headers || !headers.Authorization) {
    return { error: "Sign in to start Pro." };
  }
  let res: Response;
  try {
    res = jsonBody
      ? await fetch(path, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(jsonBody) })
      : await fetch(path, { method: "POST", headers });
  } catch {
    return { error: "Could not reach billing." };
  }
  const body = await res.json().catch(() => ({})) as { url?: string; error?: string };
  if (res.status === 409) return { error: body.error || "Already Pro.", alreadyPro: true };
  if (!res.ok || !body.url) return { error: body.error || "Could not start checkout." };
  window.location.href = body.url;
  return { ok: true };
}

export type BillingTier = "pro" | "ultra";
export type BillingInterval = "monthly" | "yearly";

export async function startCheckout(tier: BillingTier, interval: BillingInterval, skipTrial = false): Promise<{ ok?: true; error?: string; alreadyPro?: boolean }> {
  return postBilling("/api/stripe-checkout", { tier, interval, skipTrial });
}

export async function startBillingPortal(): Promise<{ ok?: true; error?: string }> {
  return postBilling("/api/stripe-portal");
}

export async function refreshProStatus(): Promise<boolean> {
  const session = w().getSession?.();
  const sb = w()._supabase;
  const cached = w().getProfile?.()?.pro === true;
  if (!session?.id || !sb) return cached;
  const { data, error } = await sb.from("subscriptions").select("status,tier").eq("user_id", session.id).maybeSingle();
  if (error) return cached;
  if (!data) return cached;
  const pro = isProStatus(data.status);
  const tier = data.tier === "sprint" || data.tier === "pro" || data.tier === "ultra" ? data.tier : "free";
  const current = w().getProfile?.();
  if (current && (current.pro !== pro || current.tier !== tier)) w().saveProfile?.({ pro, tier });
  return pro;
}
