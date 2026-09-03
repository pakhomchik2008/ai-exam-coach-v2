// Examik — push notifications glue (Phase 3 §3.5, native follow-up).
//
// Two entirely separate delivery paths, both landing on the same OneSignal
// app id and the same `external_id` = Supabase user id, so
// api/notifications-cron.js's sendPush() (one REST call, targets by
// external_id) reaches whichever one the student actually has:
//
//   - Web: the JS SDK below, service-worker based. Only works on the real
//     prod origin (OneSignal's dashboard is scoped to it) — a Capacitor
//     WKWebView's origin is capacitor://localhost, not that origin, so this
//     path is a deliberate no-op on native.
//   - Native iOS: onesignal-cordova-plugin, OneSignal's own native SDK
//     wrapper. Registers the device with APNs directly; no web/service-worker
//     involved. Needs the aps-environment entitlement (App.entitlements) and
//     an APNs Auth Key uploaded to OneSignal's iOS platform settings — pure
//     app-code can't do either of those, see docs/phase-5-billing-tiers-plan.md
//     sibling audit notes for the manual setup checklist.
//
// `external_id` = the Supabase user id — set via OneSignal.login() on sign-in
// so api/notifications-cron.js can target a user by id alone.

import { isNativeIOS } from "./platform";
import NativeOneSignal from "onesignal-cordova-plugin";

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

const PROD_PUSH_HOSTS = new Set([
  "ai-exam-coach-v2.vercel.app",
  "examik.net",
  "www.examik.net",
]);

function isProdPushHost(): boolean {
  return typeof window !== "undefined" && PROD_PUSH_HOSTS.has(window.location.hostname);
}

function isPushSupported(): boolean {
  if (isNativeIOS()) return !!APP_ID;
  return typeof window !== "undefined" && !!APP_ID && isProdPushHost();
}

function dropForeignServiceWorkers(): void {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => { void reg.unregister(); });
  }).catch(() => {
    // Safari private mode can reject this — boot must not depend on it.
  });
}

// Queues `fn` to run once the OneSignal SDK has finished loading — a no-op
// if we are not on the production host or the app id is missing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- OneSignal ships no types
function withOneSignal(fn: (oneSignal: any) => void): void {
  if (!isPushSupported()) return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(fn);
}

function loadOneSignalSdk(): void {
  if (document.querySelector("script[data-onesignal-sdk]")) return;
  const script = document.createElement("script");
  script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
  script.async = true;
  script.dataset.onesignalSdk = "1";
  document.head.appendChild(script);
}

function initPush(): void {
  if (isNativeIOS()) {
    if (!APP_ID) return;
    try { NativeOneSignal.initialize(APP_ID); } catch { /* device without push entitlement, e.g. simulator */ }
    return;
  }
  if (!isProdPushHost()) {
    dropForeignServiceWorkers();
    return;
  }
  if (!APP_ID) return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  loadOneSignalSdk();
  withOneSignal((OneSignal) => {
    try {
      OneSignal.init({ appId: APP_ID });
    } catch {
      // Site-URL mismatch must not unmount React.
    }
  });
}

function identifyPushUser(userId: string): void {
  if (!userId) return;
  if (isNativeIOS()) {
    if (!isPushSupported()) return;
    try { NativeOneSignal.login(userId); } catch { /* not yet initialized */ }
    return;
  }
  withOneSignal((OneSignal) => OneSignal.login(userId));
}

function logoutPushUser(): void {
  if (isNativeIOS()) {
    if (!isPushSupported()) return;
    try { NativeOneSignal.logout(); } catch { /* not yet initialized */ }
    return;
  }
  withOneSignal((OneSignal) => OneSignal.logout());
}

function requestPushPermission(): Promise<string> {
  if (isNativeIOS()) {
    if (!isPushSupported()) return Promise.resolve("unsupported");
    return NativeOneSignal.Notifications.requestPermission(true)
      .then((granted: boolean) => (granted ? "granted" : "denied"))
      .catch(() => "denied");
  }
  return new Promise((resolve) => {
    if (!isPushSupported()) { resolve("unsupported"); return; }
    withOneSignal(async (OneSignal) => {
      try {
        await OneSignal.Notifications.requestPermission();
        resolve(OneSignal.Notifications.permission ? "granted" : "denied");
      } catch {
        resolve("denied");
      }
    });
  });
}

Object.assign(window, { initPush, identifyPushUser, logoutPushUser, requestPushPermission, isPushSupported });

initPush();

export {};
