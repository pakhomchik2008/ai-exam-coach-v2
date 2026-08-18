/**
 * Apple's reader-app rule (App Store guideline 3.1.1): an app that doesn't
 * sell digital content via Apple IAP must not offer any way to buy that
 * content from inside the app — no Stripe Checkout, no "upgrade" link out.
 * Decision: Examik ships as a reader app on iOS (Ultra/Pro subscriptions
 * stay web-only, examik.app), so every purchase entry point in the native
 * build is replaced with inert "manage your plan on the website" copy.
 * This is the single switch that decision hangs on.
 */
import { Capacitor } from "@capacitor/core";

export function isNativeIOS(): boolean {
  return Capacitor.getPlatform() === "ios" && Capacitor.isNativePlatform();
}
