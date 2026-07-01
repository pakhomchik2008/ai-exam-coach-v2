// AI Exam Coach — Supabase-backed auth.
// Drop-in replacement for the local-only version: keeps the same
// window.getSession / signUp / logIn / startDemo / clearSession API
// so every other file that calls those functions works without changes.
// OAuth (Google, GitHub, Apple) added via window.signInWithOAuth(provider).

const ACCOUNTS_KEY = "auth_accounts_v1"; // kept for compat
const SESSION_KEY  = "auth_session_v1";

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
  } else if (event === "SIGNED_OUT") {
    _cachedSession = null;
    try { localStorage.removeItem(SESSION_KEY); } catch {}
    window.dispatchEvent(new StorageEvent("storage", { key: SESSION_KEY }));
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

function clearSession() {
  _cachedSession = null;
  try { localStorage.removeItem(SESSION_KEY); } catch {}
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

function startDemo() {
  return setSession({ email: null, name: "Demo", mode: "demo" });
}

// Legacy stubs — kept so any file that imports these symbols still compiles
function getAccounts()  { return []; }
function saveAccounts() {}
async function hashPassword(pw) { return pw; }

Object.assign(window, {
  ACCOUNTS_KEY, SESSION_KEY, _supabase,
  hashPassword, getAccounts, saveAccounts,
  getSession, setSession, clearSession,
  signUp, logIn, startDemo, signInWithOAuth,
});
