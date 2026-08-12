// AI Exam Coach — Supabase-backed auth.
// Drop-in replacement for the local-only version: keeps the same
// window.getSession / signUp / logIn / startDemo / clearSession API
// so every other file that calls those functions works without changes.
// OAuth (Google, GitHub, Apple) added via window.signInWithOAuth(provider).

import { startDataSync, stopDataSync } from "../lib/data-sync";

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
  "tier_seen_v1", ACCOUNTS_KEY,
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
  "sb_publishable_wL5HRZEHk9zAMUNWJa0BMA_IA4cC9Wo"
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
    // Covers a refresh while already signed in — onAuthStateChange's SIGNED_IN
    // only fires on a *new* sign-in event, not on a session merely resuming.
    void startDataSync(_supabase, session.user.id);
  } else {
    // Restore demo mode from localStorage if the user was demoing
    try {
      const raw = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (raw?.mode === "demo") _cachedSession = raw;
    } catch {}
  }
});

// Stay in sync for the lifetime of the page
_supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" && session?.user) {
    _persistSession(_supabaseUserToSession(session.user));
    void startDataSync(_supabase, session.user.id);
  } else if (event === "SIGNED_OUT") {
    _cachedSession = null;
    try { localStorage.removeItem(SESSION_KEY); } catch {}
    window.dispatchEvent(new StorageEvent("storage", { key: SESSION_KEY }));
    stopDataSync(_supabase);
  }
});

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

async function signUp({ name, email, password }) {
  const { data, error } = await _supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { full_name: name.trim() } },
  });
  if (error) {
    const err = new Error(error.message);
    err.code = "SIGNUP_ERROR";
    throw err;
  }
  if (data.session?.user) {
    const session = _supabaseUserToSession(data.session.user);
    window.saveProfile && window.saveProfile({ fullName: session.name, email: session.email });
    return setSession(session);
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
  // redirectTo must be listed in Supabase → Authentication → URL Configuration
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await _supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  if (error) throw new Error(error.message);
  // Browser will navigate away to the OAuth provider — nothing more to do here
}

// Demo mode used to be a localStorage-only session with no server identity,
// which is why /api/complete had to accept unauthenticated callers. It now signs
// in anonymously, so a demo visitor carries a real JWT and a real (smaller)
// daily quota — see supabase/07_ai_usage.sql, key 'complete:anon'.
//
// Requires Supabase → Authentication → Sign In / Providers → "Allow anonymous
// sign-ins". If it is off, the demo still opens but every AI call returns 401.
async function startDemo() {
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
  // Password first: it is applied immediately and is what makes the account
  // recoverable. If the email step then needs confirmation, the student still
  // has a real credential rather than a half-made account.
  const pw = await _supabase.auth.updateUser({ password, data: { full_name: name.trim() } });
  if (pw.error) {
    const err = new Error(pw.error.message);
    err.code = "SIGNUP_ERROR";
    throw err;
  }

  const em = await _supabase.auth.updateUser({ email: cleanEmail });
  if (em.error) {
    const err = new Error(em.error.message);
    err.code = "SIGNUP_ERROR";
    throw err;
  }

  // `email_confirmed_at` stays null until the link is clicked; new_email holds
  // the pending address in that case.
  const updated = em.data?.user || null;
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
  signUp, logIn, startDemo, signInWithOAuth, upgradeAnonymousAccount,
  getAccessToken, apiHeaders,
});

// Module marker: these files carry no import/export of their own (they still
// communicate via `window` globals), and without one the JSX transform treats
// the file as a CommonJS script and emits a bare `require()` call that throws
// in the browser. Removed once this module uses real imports.
export {};
