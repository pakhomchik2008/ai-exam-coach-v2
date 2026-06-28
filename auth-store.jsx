// AI Exam Coach — local-only auth simulation. There is no backend, so this
// cannot be real security — but storing a SHA-256 hash (not the plaintext
// password) via the browser's native Web Crypto API costs nothing and is
// strictly better than the alternative, so there's no reason not to.
// Accounts and the active session are kept in separate localStorage keys
// from exam/schedule/profile data on purpose: logging out must never imply
// "delete my study data" (see Settings.jsx — that's now a distinct, explicit
// "Erase all data" action instead of being conflated with normal logout).

const ACCOUNTS_KEY = "auth_accounts_v1";
const SESSION_KEY = "auth_session_v1";

async function hashPassword(pw) {
  if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
    const bytes = new TextEncoder().encode(pw);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return "sha256:" + Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // SubtleCrypto requires a secure context — true for any real browser at
  // localhost/https, but not guaranteed everywhere this file might run
  // (older WebViews, this app's own test harness). Fall back to a same-API,
  // non-cryptographic hash rather than ever touching the plaintext password.
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < pw.length; i++) {
    const ch = pw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = (h1 ^ (h1 >>> 16)) >>> 0; h2 = (h2 ^ (h2 >>> 16)) >>> 0;
  return "fallback:" + h1.toString(16) + h2.toString(16);
}

function getAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || []; } catch { return []; }
}
function saveAccounts(list) {
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list)); } catch {}
}

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function setSession(session) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
  return session;
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

function normalizeEmail(email) { return String(email || "").trim().toLowerCase(); }

async function signUp({ name, email, password }) {
  const normalized = normalizeEmail(email);
  const accounts = getAccounts();
  if (accounts.some((a) => a.email === normalized)) {
    const err = new Error("An account with this email already exists."); err.code = "ACCOUNT_EXISTS"; throw err;
  }
  const passwordHash = await hashPassword(password);
  saveAccounts([...accounts, { email: normalized, name: name.trim(), passwordHash }]);
  return setSession({ email: normalized, name: name.trim(), mode: "account" });
}

async function logIn({ email, password }) {
  const normalized = normalizeEmail(email);
  const account = getAccounts().find((a) => a.email === normalized);
  if (!account) { const err = new Error("No account found with this email."); err.code = "NOT_FOUND"; throw err; }
  const passwordHash = await hashPassword(password);
  if (passwordHash !== account.passwordHash) { const err = new Error("Incorrect password."); err.code = "WRONG_PASSWORD"; throw err; }
  return setSession({ email: account.email, name: account.name, mode: "account" });
}

function startDemo() {
  return setSession({ email: null, name: "Demo", mode: "demo" });
}

Object.assign(window, {
  ACCOUNTS_KEY, SESSION_KEY, hashPassword, getAccounts, getSession, setSession,
  clearSession, signUp, logIn, startDemo,
});
