/**
 * Apple's reader-app rule (App Store guideline 3.1.1): an app that doesn't
 * sell digital content via Apple IAP must not offer any way to buy that
 * content from inside the app — no Stripe Checkout, no "upgrade" link out.
 * Decision: Examik ships as a reader app on iOS (Ultra/Pro subscriptions
 * stay web-only, examik.net), so every purchase entry point in the native
 * build is replaced with inert "manage your plan on the website" copy.
 * This is the single switch that decision hangs on.
 */
import { Capacitor } from "@capacitor/core";

export function isNativeIOS(): boolean {
  return Capacitor.getPlatform() === "ios" && Capacitor.isNativePlatform();
}

// Capacitor bundles the built SPA and loads it from capacitor://localhost —
// a relative fetch("/api/...") resolves against THAT origin, which has no
// server behind it, instead of the deployed Vercel functions. Every /api/*
// call must go through this so it hits the real backend on native while
// staying a normal relative path (and same-origin, no CORS) on web.
const PROD_API_ORIGIN = "https://examik.net";

export function apiUrl(path: string): string {
  return isNativeIOS() ? `${PROD_API_ORIGIN}${path}` : path;
}

// curriculum-store.jsx is a plain window-global script (no imports, per its
// own module marker) — publish here so it can reach apiUrl the same way it
// reaches every other cross-module helper.
Object.assign(window, { apiUrl });
