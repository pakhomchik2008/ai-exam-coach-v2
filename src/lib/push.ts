// AI Exam Coach — OneSignal Web Push glue (Phase 3 §3.5 follow-up).
//
// Thin wrapper around the OneSignal SDK, which is loaded as a <script> tag in
// index.html (must be a real <script> — OneSignal's own init sequence expects
// `window.OneSignalDeferred` to exist before its bundle runs, which an ES
// import can't guarantee the ordering of). This module is the only place that
// touches `window.OneSignalDeferred` — everything else calls the four
// `window.*` functions exported at the bottom, same window-global pattern as
// every other store in this codebase (see profile-store.jsx's header).
//
// `external_id` = the Supabase user id — set via OneSignal.login() on sign-in
// so api/notifications-cron.js can target a user by id alone, with no
// separate subscription-storage table on our side (OneSignal already stores
// the push subscription itself).

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

function isPushSupported(): boolean {
  return typeof window !== "undefined" && !!APP_ID && typeof window.OneSignalDeferred !== "undefined";
}

// Queues `fn` to run once the OneSignal SDK has finished loading — a no-op
// (never calls fn) if the SDK script isn't present, e.g. VITE_ONESIGNAL_APP_ID
// wasn't set at build time. Same graceful-degradation shape as the
// PGRST205-table-missing pattern elsewhere: missing config disables the
// feature, never breaks the page around it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- OneSignal ships no types
function withOneSignal(fn: (oneSignal: any) => void): void {
  if (!isPushSupported()) return;
  window.OneSignalDeferred!.push(fn);
}

function initPush(): void {
  withOneSignal((OneSignal) => OneSignal.init({ appId: APP_ID }));
}

function identifyPushUser(userId: string): void {
  if (!userId) return;
  withOneSignal((OneSignal) => OneSignal.login(userId));
}

function logoutPushUser(): void {
  withOneSignal((OneSignal) => OneSignal.logout());
}

// Resolves the OS-level permission string ("granted" | "denied" | "default")
// so Settings.jsx can show real state, not just "did we ask".
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

// Init once at module load — safe to call even when unsupported/unconfigured,
// see withOneSignal's no-op guard above.
initPush();

// Module marker — see profile-store.jsx's header for why this file has no
// real import/export of its own.
export {};
