// AI Exam Coach — global user preferences, separate from exam data. One
// profile, shared by every exam the user creates: weekly study hours,
// materials they have, how they like to learn. Captured once (onboarding)
// and reused (Add Exam prefills + lets the user tweak it) instead of asking
// the same questions again per exam. Same get/save/subscribe/migrate shape
// as exams-store.jsx/schedule-store.jsx.

const PROFILE_KEY = "user_profile_v1";
const PROFILE_SCHEMA_VERSION = 1;

function isFiniteNumber(n) { return typeof n === "number" && Number.isFinite(n); }

function migrateProfile(raw) {
  const p = raw && typeof raw === "object" ? raw : {};
  return {
    weeklyHours: isFiniteNumber(p.weeklyHours) && p.weeklyHours > 0 ? Math.round(p.weeklyHours) : 12,
    materials: Array.isArray(p.materials) ? p.materials.filter((x) => typeof x === "string") : ["notes", "papers"],
    prefs: Array.isArray(p.prefs) ? p.prefs.filter((x) => typeof x === "string") : ["chat", "recall", "spaced"],
    lang: typeof p.lang === "string" && p.lang ? p.lang : "en",
    timezone: typeof p.timezone === "string" ? p.timezone : null, // null = not yet set; UI can call detectTimezone()
    fullName: typeof p.fullName === "string" ? p.fullName : "",
    email: typeof p.email === "string" ? p.email : "",
    reminderEnabled: typeof p.reminderEnabled === "boolean" ? p.reminderEnabled : true,
    reminderHour: isFiniteNumber(p.reminderHour) && p.reminderHour >= 0 && p.reminderHour <= 23 ? Math.round(p.reminderHour) : 9,
    _v: PROFILE_SCHEMA_VERSION,
  };
}

let _profileRaw = null;
let _profileCache = null;
const _profileListeners = new Set();

function subscribeProfile(fn) { _profileListeners.add(fn); return () => _profileListeners.delete(fn); }
function _notifyProfile() { _profileListeners.forEach((fn) => fn()); }

function hasProfile() {
  try { return localStorage.getItem(PROFILE_KEY) !== null; } catch { return false; }
}

function getProfile() {
  let raw;
  try { raw = localStorage.getItem(PROFILE_KEY); } catch { raw = null; }
  if (raw === _profileRaw && _profileCache) return _profileCache; // nothing changed — stable reference
  _profileRaw = raw;
  try { _profileCache = migrateProfile(raw ? JSON.parse(raw) : null); }
  catch { _profileCache = migrateProfile(null); }
  return _profileCache;
}

function saveProfile(patch) {
  const next = migrateProfile({ ...getProfile(), ...patch });
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch {}
  _profileRaw = JSON.stringify(next);
  _profileCache = next;
  _notifyProfile();
  return next;
}

Object.assign(window, { PROFILE_KEY, getProfile, saveProfile, subscribeProfile, migrateProfile, hasProfile });
