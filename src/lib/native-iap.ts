// Native-iOS Pro/Ultra purchases via RevenueCat (StoreKit under the hood).
// Counterpart to lib/billing.ts's Stripe checkout — same tiers, same
// `subscriptions` table as source of truth, different store.
//
// RevenueCat's webhook (api/revenuecat-webhook.js) is what actually writes
// the `subscriptions` row; this module's job is just to run the purchase and
// then nudge the UI to re-read that row. RevenueCat's appUserID is set to our
// Supabase user id (see init() below) specifically so the webhook needs no
// separate identity-mapping table.
import { Purchases } from "@revenuecat/purchases-capacitor";
import { isNativeIOS } from "./platform";
import type { BillingInterval, BillingTier } from "./billing";

// One RevenueCat offering ("default"), four packages with these exact custom
// identifiers — set up to match in the RevenueCat dashboard when Hlib
// creates the offering. Not $rc_monthly/$rc_annual because we need four
// distinct products (pro/ultra × monthly/yearly), not two.
function packageId(tier: BillingTier, interval: BillingInterval): string {
  return `${tier}_${interval}`;
}

let configured = false;

// Call once, right after a real (non-demo) session resolves — mirrors where
// startDataSync() gets kicked off in auth-store.jsx. Safe to call repeatedly;
// only the first call with a given userId actually reconfigures.
export async function initNativeIAP(userId: string | null | undefined): Promise<void> {
  if (!isNativeIOS() || !userId || configured) return;
  const apiKey = import.meta.env.VITE_REVENUECAT_IOS_API_KEY as string | undefined;
  if (!apiKey) return; // not configured yet — native purchase buttons stay hidden, see hasNativeIAP()
  configured = true;
  try {
    await Purchases.configure({ apiKey, appUserID: userId });
  } catch {
    configured = false;
  }
}

export function hasNativeIAP(): boolean {
  return isNativeIOS() && Boolean(import.meta.env.VITE_REVENUECAT_IOS_API_KEY);
}

// Logout on a shared device (audit finding #29, see auth-store.jsx's
// PERSONAL_DATA_KEYS comment) must not leave RevenueCat's SDK still bound to
// the previous student's appUserID — the next sign-in's initNativeIAP() call
// would otherwise be swallowed by the `configured` guard and silently keep
// running purchases against the wrong account.
export async function resetNativeIAP(): Promise<void> {
  if (!configured) return;
  configured = false;
  try {
    await Purchases.logOut();
  } catch {
    // Not logged in / not configured — nothing to undo.
  }
}

export async function purchaseNative(
  tier: BillingTier,
  interval: BillingInterval,
): Promise<{ ok?: true; error?: string }> {
  try {
    const { current } = await Purchases.getOfferings();
    const pkg = current?.availablePackages.find((p) => p.identifier === packageId(tier, interval));
    if (!pkg) return { error: "That plan isn't available yet." };
    await Purchases.purchasePackage({ aPackage: pkg });
    return { ok: true };
  } catch (e) {
    const err = e as { userCancelled?: boolean; message?: string };
    if (err?.userCancelled) return {};
    return { error: err?.message || "Purchase failed." };
  }
}

export async function restoreNativePurchases(): Promise<{ ok?: true; error?: string }> {
  try {
    await Purchases.restorePurchases();
    return { ok: true };
  } catch (e) {
    return { error: (e as { message?: string })?.message || "Restore failed." };
  }
}
