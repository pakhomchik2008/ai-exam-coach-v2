// AI Exam Coach — Phase 3 §3.5 notifications. Vercel Cron hits this ONCE a
// day (see vercel.json). Runs all six triggers in one pass and sends real
// email via Resend; every send is deduplicated through notification_log
// (supabase/15_notification_log.sql, trigger list extended in 18_subscriptions.sql)
// so a retried invocation is a no-op.
//
// Deliberately reads prefs/data from the SAME `user_data` sync table every
// other feature already writes to (see profile-store.jsx's header on the
// synced notify* fields) — no separate prefs table, no separate data path.
//
// Required Vercel environment variables:
//   RESEND_API_KEY             resend.com → API Keys. SECRET.
//   RESEND_FROM                sender address, e.g. "AI Exam Coach <onboarding@resend.dev>".
//                               Defaults to the Resend sandbox sender below —
//                               works immediately but is rate-limited (100/day)
//                               and lands in spam more often than a verified
//                               domain. Swap once a real domain is verified.
//   ONESIGNAL_APP_ID           onesignal.com app → Keys & IDs. Public-ish
//                               (also lives client-side as VITE_ONESIGNAL_APP_ID).
//   ONESIGNAL_REST_API_KEY     onesignal.com app → Keys & IDs. SECRET.
//                               Both optional — push is a best-effort second
//                               channel on top of email, never blocks it. If
//                               unset, sendPush() no-ops silently.
//   SUPABASE_SERVICE_ROLE_KEY  Settings → API → service_role. SECRET. (already set for /api/complete)
//   CRON_SECRET                Vercel Project Settings → Cron Jobs auto-sets
//                               this and sends it as `Authorization: Bearer …`
//                               on every invocation — see Vercel's "Securing
//                               Cron Jobs" doc. Without it set, this endpoint
//                               refuses to run outside a manual `?dryRun=1` GET
//                               done by a signed-in admin (there is no admin
//                               check here yet, so treat this as trusted only
//                               once CRON_SECRET is configured).
//
// Known limits, honest not hidden:
//   - One fixed daily run (Vercel Hobby's cron ceiling) means "remind me at
//     6pm" isn't literal — everyone gets their daily reminder at the same
//     UTC hour (see CRON_HOUR_UTC below). Precise per-user timing needs
//     Vercel Pro's 15-min cron; decided against it for launch cost, see
//     docs/phase-3-plan.md §3.5.
//   - user_data is paged at 1000 rows per key per run. Fine at launch scale;
//     will silently under-cover once total (users × 4 keys) exceeds that —
//     flagged here, not a problem to solve before there are that many users.

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cyftpdiabopydwytyudt.supabase.co";
const RESEND_FROM = process.env.RESEND_FROM || "AI Exam Coach <onboarding@resend.dev>";
const APP_URL = process.env.APP_URL || "https://ai-exam-coach-v2.vercel.app";

// Which UTC hour the (single, Hobby-plan) daily cron actually fires at —
// see vercel.json. ~16:00 UTC lands in the evening across Europe/Africa/ME
// (where the initial NMT/IELTS user base concentrates) while still being
// daytime in the Americas for a same-day nudge rather than a 3am one.
const CRON_HOUR_UTC = 16;

import { trialEmailDue } from "./_stripe.js";

const RELEVANT_KEYS = ["user_profile_v1", "exams_list_v2", "study_schedule_v1", "mistakes_v1"];
const DAY_MS = 86400000;
const COUNTDOWN_DAYS = [30, 14, 7, 3, 1];

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}

function utcDateKey(d) {
  return d.toISOString().slice(0, 10);
}

// ISO 8601 week number — ("2026-W33"). Used only as a dedupe key, doesn't
// need to match any particular locale's week-start convention.
function isoWeekKey(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / DAY_MS + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Same rule as progress-metrics.jsx's computeStreak, ported to run on the
// server against UTC dates instead of the browser's local dates — a daily
// batch job has no single "local" timezone to anchor to, and a 1-day skew at
// a user's midnight is an acceptable trade for not needing per-user tz data
// this endpoint doesn't reliably have (profile.timezone is often unset).
function computeStreakUtc(sessions, today) {
  const doneDates = new Set((sessions || []).filter((s) => s.status === "completed" && s.date).map((s) => s.date));
  if (!doneDates.size) return { streak: 0, studiedToday: false };
  const studiedToday = doneDates.has(utcDateKey(today));
  const cursor = new Date(today);
  if (!studiedToday) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (doneDates.has(utcDateKey(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return { streak, studiedToday };
}

// Same overdue/due-today split as mistakes-store.jsx's computeReviewQueue,
// against UTC date-keys for the same reason as computeStreakUtc above.
function countDueMistakes(mistakes, today) {
  const todayKey = utcDateKey(today);
  return (mistakes || []).filter((m) => {
    if (!m || m.status === "recovered" || typeof m.nextReviewAt !== "number") return false;
    return utcDateKey(new Date(m.nextReviewAt)) <= todayKey;
  }).length;
}

async function fetchAllUserData(headers) {
  // One query per relevant key rather than one giant OR — keeps each request
  // well under PostgREST's row cap and makes a slow/failing key isolable.
  const byUser = new Map(); // user_id -> { user_profile_v1, exams_list_v2, ... }
  for (const key of RELEVANT_KEYS) {
    const url = `${SUPABASE_URL}/rest/v1/user_data?key=eq.${key}&select=user_id,value&limit=1000`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) continue; // one bad key shouldn't blank the whole run
    const rows = await resp.json();
    for (const row of rows) {
      if (!byUser.has(row.user_id)) byUser.set(row.user_id, {});
      byUser.get(row.user_id)[key] = row.value;
    }
  }
  return byUser;
}

async function alreadySent(headers, userId, triggerKey, dedupeKey) {
  const url = `${SUPABASE_URL}/rest/v1/notification_log?user_id=eq.${userId}&trigger_key=eq.${triggerKey}&dedupe_key=eq.${encodeURIComponent(dedupeKey)}&select=id&limit=1`;
  const resp = await fetch(url, { headers });
  if (!resp.ok) return true; // fail closed — a broken dedup check must not resend
  const rows = await resp.json();
  return rows.length > 0;
}

async function markSent(headers, userId, triggerKey, dedupeKey) {
  await fetch(`${SUPABASE_URL}/rest/v1/notification_log`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify({ user_id: userId, trigger_key: triggerKey, dedupe_key: dedupeKey }),
  });
}

function unsubscribeFooter(userId, lang) {
  const url = `${APP_URL}/api/unsubscribe?u=${userId}`;
  const label = { uk: "Відписатися від сповіщень", ru: "Отписаться от уведомлений" }[lang] || "Unsubscribe from these emails";
  return `<p style="margin-top:24px;font-size:12px;color:#94a3b8;">
    <a href="${url}" style="color:#94a3b8;">${label}</a> · AI Exam Coach
  </p>`;
}

async function sendEmail(resendKey, to, subject, html) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
  });
  return resp.ok;
}

// Best-effort second channel — src/lib/push.ts tags each browser's OneSignal
// subscription with the Supabase user id as `external_id` on sign-in, so no
// subscription-storage table exists on our side; targeting by id alone sends
// to 0 recipients (a harmless no-op) for a user who never granted push.
// NEVER throws or gates email delivery — a push failure must not lose the
// email send that already succeeded.
async function sendPush(appId, restKey, userId, title, message) {
  if (!appId || !restKey) return;
  try {
    await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${restKey}` },
      body: JSON.stringify({
        app_id: appId,
        include_aliases: { external_id: [userId] },
        target_channel: "push",
        headings: { en: title },
        contents: { en: message },
      }),
    });
  } catch {
    // best-effort — a push failure must not block the email send above
  }
}

// ─── per-trigger email copy ─────────────────────────────────────────────────
// English only for v1 — every trigger is a plain-text-shaped nudge and the
// profile's `lang` field exists to extend this later; not blocking launch on
// 5-language email templates when the in-app UI already carries the product.

function dailyReminderEmail(name) {
  return {
    subject: "Today's study session is waiting",
    html: `<p>Hi${name ? " " + name : ""},</p><p>You've got a study session queued for today. A few minutes now keeps your plan on track.</p>`,
  };
}
function examCountdownEmail(examName, days) {
  const noun = days === 1 ? "day" : "days";
  return {
    subject: `${examName}: ${days} ${noun} to go`,
    html: `<p>${examName} is ${days} ${noun} away. Open your plan to see what's left to cover.</p>`,
  };
}
function weeklyDigestEmail(hoursStudied, sessionsCompleted, streak) {
  return {
    subject: "Your week in review",
    html: `<p>This week: <strong>${hoursStudied}h</strong> studied, <strong>${sessionsCompleted}</strong> sessions completed, <strong>${streak}</strong>-day streak.</p>`,
  };
}
function streakDangerEmail(streak) {
  return {
    subject: `Keep your ${streak}-day streak alive`,
    html: `<p>You're on a ${streak}-day streak and haven't studied yet today. One session keeps it going.</p>`,
  };
}
function mistakeReviewEmail(count) {
  return {
    subject: `${count} mistake${count === 1 ? "" : "s"} ready to review`,
    html: `<p>You have ${count} mistake${count === 1 ? "" : "s"} due for review in your Mistake Journal.</p>`,
  };
}
function trialEndEmail() {
  return {
    subject: "Your Pro trial ends tomorrow",
    html: `<p>Your 3-day Pro trial ends tomorrow. The $4/month charge starts then. Cancel from the Stripe email if you do not want to continue.</p>`,
  };
}

async function fetchTrialing(headers) {
  const url = `${SUPABASE_URL}/rest/v1/subscriptions?status=eq.trialing&select=user_id,trial_end&limit=1000`;
  const resp = await fetch(url, { headers });
  if (!resp.ok) return []; // table missing (PGRST205) until Hlib runs 18_subscriptions.sql
  return resp.json();
}

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${cronSecret}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
  const oneSignalRestKey = process.env.ONESIGNAL_REST_API_KEY;
  const headers = serviceHeaders();
  if (!resendKey || !headers) {
    res.status(500).json({ error: "RESEND_API_KEY or SUPABASE_SERVICE_ROLE_KEY is not set." });
    return;
  }

  const dryRun = req.query && req.query.dryRun === "1";
  const now = new Date();
  const todayKey = utcDateKey(now);
  const isSunday = now.getUTCDay() === 0;
  const weekKey = isoWeekKey(now);

  const byUser = await fetchAllUserData(headers);
  const trialByUser = new Map();
  for (const row of await fetchTrialing(headers)) {
    if (row && row.user_id) trialByUser.set(row.user_id, row.trial_end);
  }
  const results = { checked: 0, sent: 0, skipped: 0, errors: 0 };

  for (const [userId, data] of byUser) {
    results.checked++;
    const profile = data.user_profile_v1;
    if (!profile || typeof profile !== "object") continue;
    const email = typeof profile.email === "string" ? profile.email.trim() : "";
    if (!email) continue; // never captured one — nothing to send to
    const unsubscribed = profile.notifUnsubscribed === true;

    const exams = Array.isArray(data.exams_list_v2) ? data.exams_list_v2 : [];
    const schedule = data.study_schedule_v1 && typeof data.study_schedule_v1 === "object" ? data.study_schedule_v1 : {};
    const sessions = Array.isArray(schedule.sessions) ? schedule.sessions : [];
    const mistakes = Array.isArray(data.mistakes_v1) ? data.mistakes_v1 : [];
    const activeExams = exams.filter((e) => e && e.examDate && new Date(e.examDate) > now);
    const footer = (lang) => unsubscribeFooter(userId, lang);

    async function fire(triggerKey, dedupeKey, buildEmail) {
      if (dryRun) { results.sent++; return; }
      if (await alreadySent(headers, userId, triggerKey, dedupeKey)) { results.skipped++; return; }
      const { subject, html } = buildEmail();
      const ok = await sendEmail(resendKey, email, subject, html + footer(profile.lang));
      // Push reuses the email copy (strip tags, cap length) rather than a
      // second set of per-trigger copy — one content source, two channels.
      const plain = html.replace(/<[^>]+>/g, "").trim().slice(0, 150);
      await sendPush(oneSignalAppId, oneSignalRestKey, userId, subject, plain);
      if (ok) { await markSent(headers, userId, triggerKey, dedupeKey); results.sent++; }
      else results.errors++;
    }

    // 1–5 are study reminders. Skip them after one-click unsubscribe.
    // 6 (trial_end) is a billing notice — still send, or the card charges
    // with no warning the next day.
    if (!unsubscribed) {
    // 1. Daily reminder — only if there's a pending session today AND they
    // haven't already completed one (redundant to nudge someone who's done).
    const todaysSessions = sessions.filter((s) => s.date === todayKey);
    const hasCompletedToday = todaysSessions.some((s) => s.status === "completed");
    const hasPendingToday = todaysSessions.some((s) => s.status === "pending");
    if (profile.reminderEnabled && hasPendingToday && !hasCompletedToday) {
      await fire("daily_reminder", todayKey, () => dailyReminderEmail(profile.fullName));
    }

    // 2. Exam countdown — one email per exam per named T-day, exactly once.
    if (profile.notifyExamCountdown) {
      for (const exam of activeExams) {
        const daysLeft = Math.ceil((new Date(exam.examDate) - now) / DAY_MS);
        if (COUNTDOWN_DAYS.includes(daysLeft)) {
          await fire("exam_countdown", `${exam.id}:T${daysLeft}`, () => examCountdownEmail(exam.name || "Your exam", daysLeft));
        }
      }
    }

    // 3. Weekly digest — Sundays only, real numbers from this week's sessions.
    if (profile.notifyWeeklyDigest && isSunday) {
      const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
      const thisWeek = sessions.filter((s) => s.status === "completed" && s.date && new Date(s.date) >= weekAgo);
      const hoursStudied = Math.round((thisWeek.reduce((sum, s) => sum + (s.durationSec || (s.durationMin || 0) * 60), 0) / 3600) * 10) / 10;
      const { streak } = computeStreakUtc(sessions, now);
      await fire("weekly_digest", weekKey, () => weeklyDigestEmail(hoursStudied, thisWeek.length, streak));
    }

    // 4. Streak in danger — has a real streak, hasn't studied today yet.
    if (profile.notifyStreakDanger) {
      const { streak, studiedToday } = computeStreakUtc(sessions, now);
      if (streak >= 2 && !studiedToday) {
        await fire("streak_danger", todayKey, () => streakDangerEmail(streak));
      }
    }

    // 5. Mistake review — batched, at most one email per day regardless of
    // how many are due (the dedupe key is just the date).
    if (profile.notifyMistakeReview) {
      const dueCount = countDueMistakes(mistakes, now);
      if (dueCount > 0) {
        await fire("mistake_review", todayKey, () => mistakeReviewEmail(dueCount));
      }
    }
    }

    // 6. Trial ending — UTC day before trial_end. Billing, not marketing.
    const trialEnd = trialByUser.get(userId);
    if (trialEmailDue(trialEnd, now)) {
      await fire("trial_end", utcDateKey(new Date(trialEnd)), () => trialEndEmail());
    }
  }

  res.status(200).json({ ranAt: now.toISOString(), cronHourUtc: CRON_HOUR_UTC, dryRun, ...results });
}
