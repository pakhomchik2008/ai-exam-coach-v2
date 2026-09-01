// Examik — Supabase-backed auth.
// Drop-in replacement for the local-only version: keeps the same
// window.getSession / signUp / logIn / startDemo / clearSession API
// so every other file that calls those functions works without changes.
// OAuth (Google, GitHub, Apple) added via window.signInWithOAuth(provider).

import { startDataSync, stopDataSync } from "../lib/data-sync";
import { isNativeIOS } from "../lib/platform";
import { initNativeIAP, resetNativeIAP } from "../lib/native-iap";
import { Browser } from "@capacitor/browser";
import { App as CapApp } from "@capacitor/app";

// Custom URL scheme registered in ios/App/App/Info.plist (CFBundleURLTypes).
// Google/Apple refuse to complete OAuth inside an embedded WKWebView
// ("disallowed_useragent"), and even if they didn't, Supabase's redirect
// would land on the web origin with no app behind it to catch the code.
// So on native we open the OAuth URL in the system browser (skipBrowserRedirect)
// and wait for iOS to hand control back to this scheme via appUrlOpen, then
// finish the PKCE exchange ourselves.
const NATIVE_OAUTH_REDIRECT = "app.examik.ios://auth-callback";

async function _oauthNative(provider, { link = false } = {}) {
  const method = link ? "linkIdentity" : "signInWithOAuth";
  const { data, error } = await _supabase.auth[method]({
    provider,
    options: { redirectTo: NATIVE_OAUTH_REDIRECT, skipBrowserRedirect: true },
  });
  if (error) throw new Error(error.message);
  return new Promise((resolve, reject) => {
    let sub;
    const cleanup = () => { try { sub?.remove(); } catch {} };
    sub = CapApp.addListener("appUrlOpen", async ({ url }) => {
      if (!url || !url.startsWith(NATIVE_OAUTH_REDIRECT)) return;
      cleanup();
      Browser.close().catch(() => {});
      try {
        // exchangeCodeForSession() takes the bare auth code, not the deep-link
        // URL it arrived in — passing the full URL sends it as auth_code and
        // GoTrue rejects the exchange ("auth code and code verifier should be
        // non empty").
        const params = new URL(url).searchParams;
        const authError = params.get("error_description") || params.get("error");
        if (authError) throw new Error(authError);
        const code = params.get("code");
        if (!code) throw new Error("No auth code in OAuth redirect.");
        const { error: exErr } = await _supabase.auth.exchangeCodeForSession(code);
        if (exErr) throw new Error(exErr.message);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
    Browser.open({ url: data.url }).catch((e) => { cleanup(); reject(e); });
  });
}

const ACCOUNTS_KEY = "auth_accounts_v1"; // kept for compat
const SESSION_KEY  = "auth_session_v1";

// Every localStorage key that holds this student's own data — exams, schedule,
// mastery, mistakes, chat caches. Cleared on explicit logout (audit finding
// #29): before this fix, logOut() only removed the auth session, so on a
// shared device (school computer, family laptop) the next person to open the
// app saw the previous student's exams, mistake journal, and AI chat context.
// Deliberately excludes the shared exam-catalog caches (curriculum/
// qualifications) — those are not personal, are identical for every visitor,
// and are expensive to refetch, plus the UI display prefs (calendar view) —
// device settings, not this student's content.
const PERSONAL_DATA_KEYS = [
  "exams_list_v2", "courses_v1", "study_schedule_v1", "user_profile_v1",
  "mistakes_v1", "mistake_review_log_v1", "active_session_v1", "exam_attempts_v1",
  "brain_mastery_v1", "brain_kb_v1", "brain_memory_v1", "brain_xp_v1",
  "brain_difficulty_v1", "brain_lessoncache_v1", "study_result_v1",
  "tier_seen_v1", "learn_progress_v1",
  "aicoach_chat_msgs_v2", "aicoach_chat_hist_v2", ACCOUNTS_KEY,
];
// Note on "tier_seen_v1": tier-theme.jsx's subscribeBrain callback reacts to
// the SIGNED_OUT StorageEvent dispatched below and immediately rewrites this
// key to whatever xpTier() resolves to at that instant. Since brain_xp_v1 is
// already gone by then, that is always "novice" (the correct fresh-account
// default) — not the previous student's real tier. Harmless; left as-is
// rather than reordering the clear around the signOut() call for a
// non-personal, self-correcting field.

// ─── Supabase client ──────────────────────────────────────────────────────────

const { createClient } = window.supabase;
const _supabase = createClient(
  "https://cyftpdiabopydwytyudt.supabase.co",
  "sb_publishable_wL5HRZEHk9zAMUNWJa0BMA_IA4cC9Wo",
  // supabase-js defaults to flowType "implicit" (tokens in a URL #fragment).
  // The native OAuth flow (_oauthNative above) calls exchangeCodeForSession,
  // which only works with the pkce flow's ?code= query param — implicit mode
  // leaves that call with nothing to exchange.
  { auth: { flowType: "pkce" } }
);

// ─── Session cache (sync-readable, async-updated) ─────────────────────────────

let _cachedSession = null;

function _supabaseUserToSession(user) {
  if (!user) return null;
  // "Try the demo" is a real Supabase anonymous user (see startDemo). It must
  // still read as mode:"demo" everywhere, otherwise onAuthStateChange would
  // silently promote a demo visitor to a full account on sign-in and on every
  // page refresh.
  if (user.is_anonymous) {
    return { id: user.id, email: null, name: "Demo", mode: "demo" };
  }
  return {
    id:    user.id,
    email: user.email || null,
    name:  user.user_metadata?.full_name || user.user_metadata?.name
           || (user.email ? user.email.split("@")[0] : "User"),
    mode:  "account",
  };
}

function _persistSession(session) {
  _cachedSession = session;
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
  // Trigger the App's storage listener so it can re-route (login / logout)
  window.dispatchEvent(new StorageEvent("storage", { key: SESSION_KEY }));
}

// On every page load: pick up an existing Supabase session (covers OAuth
// redirect-back, tab refresh while logged in, etc.)
_supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
    _persistSession(_supabaseUserToSession(session.user));
    _syncProfileFromUser(session.user);
    // Covers a refresh while already signed in — onAuthStateChange's SIGNED_IN
    // only fires on a *new* sign-in event, not on a session merely resuming.
    void startDataSync(_supabase, session.user.id);
    if (!session.user.is_anonymous) void initNativeIAP(session.user.id);
  } else {
    // Restore demo mode from localStorage if the user was demoing
    try {
      const raw = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (raw?.mode === "demo") _cachedSession = raw;
    } catch {}
  }
});

// Set only while a password-recovery link's session is active — App.tsx
// checks this to route to the "set new password" screen instead of the
// dashboard. sessionStorage (not the SESSION_KEY the rest of auth uses):
// this must NOT survive a normal tab close/reopen, only the current
// recovery-link tab, and it must not collide with PERSONAL_DATA_KEYS
// clearing logic since it isn't a session key.
const RECOVERY_FLAG_KEY = "auth_password_recovery_v1";

// OAuth (signInWithOAuth or linkIdentity) fills in email/name on the
// Supabase session/user object, but nothing wrote it into profile-store —
// Settings.jsx reads profile.email/profile.fullName, not the auth session,
// so a Google sign-in left both blank there, and Settings' "Change
// password" (which requires a real email to send the reset link to) then
// had nothing to send it to. Only fills gaps — never overwrites an email
// or name the student already has saved, in profile-store or Settings.
function _syncProfileFromUser(user) {
  if (!user || user.is_anonymous || !window.getProfile || !window.saveProfile) return;
  const current = window.getProfile();
  const patch = {};
  if (!current.email && user.email) patch.email = user.email;
  const oauthName = user.user_metadata?.full_name || user.user_metadata?.name;
  if (!current.fullName && oauthName) patch.fullName = oauthName;
  if (Object.keys(patch).length) window.saveProfile(patch);
}

// Stay in sync for the lifetime of the page
_supabase.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY" && session?.user) {
    // The recovery link signs the user in with a real (temporary-intent)
    // session so updateUser({password}) below has something to act on —
    // same session Supabase would give a normal sign-in. Flagged separately
    // so the app routes to "set new password" instead of the dashboard.
    try { sessionStorage.setItem(RECOVERY_FLAG_KEY, "1"); } catch {}
    _persistSession(_supabaseUserToSession(session.user));
    void startDataSync(_supabase, session.user.id);
  } else if (event === "SIGNED_IN" && session?.user) {
    _persistSession(_supabaseUserToSession(session.user));
    _syncProfileFromUser(session.user);
    void startDataSync(_supabase, session.user.id);
    if (!session.user.is_anonymous) void initNativeIAP(session.user.id);
    // Tags this browser's OneSignal push subscription with the Supabase user
    // id (external_id) so api/notifications-cron.js can target it by id —
    // see src/lib/push.ts's header.
    if (window.identifyPushUser) window.identifyPushUser(session.user.id);
  } else if (event === "USER_UPDATED" && session?.user) {
    // linkIdentity() (Google account linking from an anonymous session)
    // fires this, not SIGNED_IN, since it's the same session gaining an
    // identity rather than a new sign-in.
    _persistSession(_supabaseUserToSession(session.user));
    _syncProfileFromUser(session.user);
  } else if (event === "SIGNED_OUT") {
    _cachedSession = null;
    try { localStorage.removeItem(SESSION_KEY); } catch {}
    window.dispatchEvent(new StorageEvent("storage", { key: SESSION_KEY }));
    stopDataSync(_supabase);
    void resetNativeIAP();
    if (window.logoutPushUser) window.logoutPushUser();
  }
});

function isPasswordRecovery() {
  try { return sessionStorage.getItem(RECOVERY_FLAG_KEY) === "1"; } catch { return false; }
}

function clearPasswordRecovery() {
  try { sessionStorage.removeItem(RECOVERY_FLAG_KEY); } catch {}
}

// Sends the reset email. redirectTo must be an exact match (or wildcard
// match) in Supabase → Authentication → URL Configuration → Redirect URLs,
// or Supabase silently falls back to the project's Site URL instead —
// the same class of misconfiguration that made the very first version of
// this link land nowhere useful.
async function requestPasswordReset(email) {
  const { error } = await _supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: window.location.origin + window.location.pathname,
  });
  if (error) throw new Error(error.message);
}

// Finishes the flow the recovery link started: the PASSWORD_RECOVERY
// session above is what makes this call valid, exactly like Settings'
// updateAccount() password change already relies on an active session.
async function completePasswordReset(password) {
  const { error } = await _supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
  clearPasswordRecovery();
}

// ─── Public API ───────────────────────────────────────────────────────────────

function getSession() {
  if (_cachedSession) return _cachedSession;
  // Demo session lives only in localStorage (Supabase doesn't know about it)
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (raw?.mode === "demo") return raw;
  } catch {}
  return null;
}

function setSession(session) {
  _cachedSession = session;
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
  return session;
}

// Called ONLY from the explicit "Log out" button (Settings.jsx). Deliberately
// not wired into the SIGNED_OUT branch of onAuthStateChange below — that fires
// on any session invalidation, including a transient one (expired token,
// network hiccup), and wiping a student's exams because of that would be worse
// than the leak this function exists to fix.
function clearSession() {
  _cachedSession = null;
  // Stopped synchronously, before the localStorage sweep below and before
  // signOut()'s own async SIGNED_OUT event lands — otherwise the realtime
  // channel stays open on the now-stale user id for however long that promise
  // takes to settle, and a reconcile racing in that window would run against
  // a session that is already gone.
  stopDataSync(_supabase);
  try { localStorage.removeItem(SESSION_KEY); } catch {}
  for (const key of PERSONAL_DATA_KEYS) {
    try { localStorage.removeItem(key); } catch {}
  }
  _supabase.auth.signOut().catch(() => {}); // fire-and-forget
}

function _accountExistsError() {
  const err = new Error("An account with this email already exists — log in instead.");
  err.code = "ACCOUNT_EXISTS";
  return err;
}

async function signUp({ name, email, password }) {
  const { data, error } = await _supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { full_name: name.trim() } },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) throw _accountExistsError();
    const err = new Error(error.message);
    err.code = "SIGNUP_ERROR";
    throw err;
  }
  if (data.session?.user) {
    const session = _supabaseUserToSession(data.session.user);
    window.saveProfile && window.saveProfile({ fullName: session.name, email: session.email });
    return setSession(session);
  }
  // Supabase's email-enumeration protection: signUp() for an address that
  // already belongs to a confirmed account returns no error and no session
  // — identical to a brand-new pending signup — except `identities` comes
  // back empty. That's the only signal it isn't actually a new account.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw _accountExistsError();
  }
  // Supabase requires email confirmation before the session is live
  const err = new Error("Check your email to confirm your account, then log in.");
  err.code = "EMAIL_CONFIRMATION";
  throw err;
}

async function logIn({ email, password }) {
  const { data, error } = await _supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) {
    const err = new Error(
      error.message.toLowerCase().includes("invalid")
        ? "Incorrect email or password."
        : error.message
    );
    err.code = "WRONG_PASSWORD";
    throw err;
  }
  const session = _supabaseUserToSession(data.user);
  window.saveProfile && window.saveProfile({ fullName: session.name, email: session.email });
  return session;
}

async function signInWithOAuth(provider) {
  if (isNativeIOS()) return _oauthNative(provider);
  // redirectTo must be listed in Supabase → Authentication → URL Configuration
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await _supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  if (error) throw new Error(error.message);
  // Browser will navigate away to the OAuth provider — nothing more to do here
}

// Upgrades an anonymous demo session straight to a real account via Google,
// same idea as upgradeAnonymousAccount() but for OAuth instead of
// email/password. linkIdentity (not signInWithOAuth) is what keeps the SAME
// user id/session across the redirect — signInWithOAuth would start a brand
// new anonymous-vs-real identity instead of upgrading this one, silently
// orphaning whatever the student already did in this demo session.
async function linkGoogleAccount() {
  if (isNativeIOS()) return _oauthNative("google", { link: true });
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await _supabase.auth.linkIdentity({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw new Error(error.message);
  // Browser will navigate away to Google — nothing more to do here
}

// Same as linkGoogleAccount() but for Apple — required alongside Google by
// App Review Guideline 4.8 (any third-party sign-in requires Sign in with
// Apple as an equal option). Needs the Apple provider actually configured
// in Supabase (Services ID, Team ID, Key ID, private key from Apple
// Developer) before this does anything but error.
async function linkAppleAccount() {
  if (isNativeIOS()) return _oauthNative("apple", { link: true });
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await _supabase.auth.linkIdentity({
    provider: "apple",
    options: { redirectTo },
  });
  if (error) throw new Error(error.message);
  // Browser will navigate away to Apple — nothing more to do here
}

// Demo mode used to be a localStorage-only session with no server identity,
// which is why /api/complete had to accept unauthenticated callers. It now signs
// in anonymously, so a demo visitor carries a real JWT and a real (smaller)
// daily quota — see supabase/07_ai_usage.sql, key 'complete:anon'.
//
// Requires Supabase → Authentication → Sign In / Providers → "Allow anonymous
// sign-ins". If it is off, the demo still opens but every AI call returns 401.
async function startDemo() {
  // Reuse an existing anonymous session instead of minting a new Supabase
  // user every call — signInAnonymously() has no rate limit, so a repeat
  // caller (or a script looping the "Try the demo" button) could otherwise
  // mint unlimited fresh per-user AI quotas (supabase/07_ai_usage.sql,
  // 'complete:anon').
  const current = getSession();
  if (current && current.mode === "demo" && current.id) return current;

  // Set the local session first so the caller can route immediately even if
  // Supabase is slow — the anonymous user id fills in a moment later.
  const local = setSession({ id: null, email: null, name: "Demo", mode: "demo" });
  try {
    const { data, error } = await _supabase.auth.signInAnonymously();
    if (error) throw error;
    if (data?.user) return setSession(_supabaseUserToSession(data.user));
  } catch (err) {
    console.warn(
      "[auth] Anonymous sign-in failed — demo mode will have no AI access. " +
      "Enable it in Supabase → Authentication → Sign In / Providers.", err
    );
  }
  return local;
}

// Converts the CURRENT anonymous session into a real account, in place.
//
// Not the same as signUp(): signUp() creates a NEW user with a NEW id, which
// would orphan everything the anonymous user already has server-side (their
// `user_data` sync rows, their `user_seen_questions` history) and reset their
// AI quota row. updateUser() keeps the same auth.users row, so a visitor who
// built a whole study plan before signing up keeps it — which is the entire
// point of letting onboarding run before the account exists.
//
// Falls back to signUp() when there is no anonymous session to upgrade (a
// visitor who arrived with anonymous sign-ins disabled, or with no session at
// all), so the caller has one function to call either way.
//
// Note on email confirmation: if the project requires it, the address is not
// live until the student clicks the link, but the session — and therefore
// their data — keeps working the whole time. That is reported back as
// `emailPending: true` rather than thrown, because nothing actually failed.
async function upgradeAnonymousAccount({ name, email, password }) {
  const { data: { user } } = await _supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user || !user.is_anonymous) {
    return { session: await signUp({ name, email, password }), emailPending: false };
  }

  const cleanEmail = email.trim().toLowerCase();
  // Supabase rejects setting a password on an anonymous user before it has
  // an email or phone identity attached — "Updating password of an
  // anonymous user without email or phone is not allowed." Sending both in
  // ONE call (rather than password-then-email, which looked reasonable but
  // fails outright) attaches the identity and the credential together.
  const res = await _supabase.auth.updateUser({ email: cleanEmail, password, data: { full_name: name.trim() } });
  if (res.error) {
    if (/already registered|already exists|already been registered/i.test(res.error.message)) throw _accountExistsError();
    const err = new Error(res.error.message);
    err.code = "SIGNUP_ERROR";
    throw err;
  }

  // `email_confirmed_at` stays null until the link is clicked; new_email holds
  // the pending address in that case.
  const updated = res.data?.user || null;
  const emailPending = !!updated && !updated.email;
  const session = setSession({
    id: (updated && updated.id) || user.id,
    email: (updated && updated.email) || cleanEmail,
    name: name.trim() || cleanEmail.split("@")[0],
    mode: "account",
  });
  window.saveProfile && window.saveProfile({ fullName: session.name, email: cleanEmail });
  return { session, emailPending };
}

// Same 8-char floor as the landing signup form. Shorter values are rejected
// here so Settings never hits Supabase with a password the signup UI would
// have blocked.
const MIN_PASSWORD_LEN = 8;

/**
 * Logged-in account edits from Settings. Demo / anonymous sessions only
 * write the local profile — they have no recoverable password.
 */
async function updateAccount({ name, email, password } = {}) {
  const session = getSession();
  const trimmedName = typeof name === "string" ? name.trim() : "";
  const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const nextPassword = typeof password === "string" ? password : "";

  if (nextPassword && nextPassword.length < MIN_PASSWORD_LEN) {
    const err = new Error(`Use at least ${MIN_PASSWORD_LEN} characters.`);
    err.code = "PASSWORD_SHORT";
    throw err;
  }

  const profilePatch = {};
  if (trimmedName) profilePatch.fullName = trimmedName;
  if (trimmedEmail) profilePatch.email = trimmedEmail;
  if (Object.keys(profilePatch).length && window.saveProfile) window.saveProfile(profilePatch);

  const isDemo = !session || session.mode === "demo" || !session.id;
  if (isDemo) {
    if (nextPassword) {
      const err = new Error("Create an account to set a password.");
      err.code = "DEMO";
      throw err;
    }
    if (session && trimmedName) setSession({ ...session, name: trimmedName });
    return { emailPending: false, localOnly: true };
  }

  const patch = {};
  if (nextPassword) patch.password = nextPassword;
  if (trimmedEmail && trimmedEmail !== (session.email || "").toLowerCase()) patch.email = trimmedEmail;
  if (trimmedName) patch.data = { full_name: trimmedName };
  if (!Object.keys(patch).length) return { emailPending: false, localOnly: false };

  const { data, error } = await _supabase.auth.updateUser(patch);
  if (error) {
    const err = new Error(error.message);
    err.code = "UPDATE_ERROR";
    throw err;
  }

  const user = data?.user || null;
  const emailPending = !!(patch.email && user && (user.new_email || user.email !== patch.email));
  if (user) {
    const next = _supabaseUserToSession(user);
    if (next && next.mode === "account") {
      setSession({
        ...next,
        name: trimmedName || next.name,
        email: emailPending ? session.email : (next.email || session.email),
      });
    }
  } else if (trimmedName) {
    setSession({ ...session, name: trimmedName });
  }
  return { emailPending, localOnly: false };
}

// ─── server-call credentials ──────────────────────────────────────────────────
// /api/complete and /api/fetch-url both require a live access token (api/_guard.js).
// getSession() refreshes an expired token before returning it.

async function getAccessToken() {
  try {
    const { data } = await _supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

async function apiHeaders() {
  const token = await getAccessToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// Legacy stubs — kept so any file that imports these symbols still compiles
function getAccounts()  { return []; }
function saveAccounts() {}
async function hashPassword(pw) { return pw; }

Object.assign(window, {
  ACCOUNTS_KEY, SESSION_KEY, _supabase, PERSONAL_DATA_KEYS,
  hashPassword, getAccounts, saveAccounts,
  getSession, setSession, clearSession,
  signUp, logIn, startDemo, signInWithOAuth, upgradeAnonymousAccount, linkGoogleAccount, linkAppleAccount,
  updateAccount, MIN_PASSWORD_LEN,
  getAccessToken, apiHeaders,
  requestPasswordReset, completePasswordReset, isPasswordRecovery, clearPasswordRecovery,
});

// Module marker: these files carry no import/export of their own (they still
// communicate via `window` globals), and without one the JSX transform treats
// the file as a CommonJS script and emits a bare `require()` call that throws
// in the browser. Removed once this module uses real imports.
export {};
