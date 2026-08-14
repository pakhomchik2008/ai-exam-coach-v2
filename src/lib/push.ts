// AI Exam Coach — OneSignal Web Push glue (Phase 3 §3.5 follow-up).
//
// The SDK is injected from here, not from index.html. OneSignal's dashboard
// is scoped to production; loading it on a preview origin throws
// "Can only be used on: https://ai-exam-coach-v2.vercel.app" and the leftover
// service worker intercepts hashed /assets/*.js after a deploy — Safari
// then whitescreens. Preview/local skip the SDK and drop any worker.
//
// `external_id` = the Supabase user id — set via OneSignal.login() on sign-in
// so api/notifications-cron.js can target a user by id alone.

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

const PROD_PUSH_HOSTS = new Set([
  "ai-exam-coach-v2.vercel.app",
  "exam.coach",
  "www.exam.coach",
]);

function isProdPushHost(): boolean {
  return typeof window !== "undefined" && PROD_PUSH_HOSTS.has(window.location.hostname);
}

function isPushSupported(): boolean {
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
  withOneSignal((OneSignal) => OneSignal.login(userId));
}

function logoutPushUser(): void {
  withOneSignal((OneSignal) => OneSignal.logout());
}

function requestPushPermission(): Promise<string> {
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
