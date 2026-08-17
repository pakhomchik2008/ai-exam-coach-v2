// Phase 5 slice B — the Weekly Deep Report's number + AI commentary.
//
// The formula duplicates exams-store.jsx's deriveCourse() gradeProbability on
// purpose, same reasoning as computeStreakUtc/countDueMistakes in
// notifications-cron.js: this cron has no browser, no window.getExams(), and
// no bundler to import a client store through — it works from the same raw
// exams_list_v2 / mistakes_v1 rows the client stores, recomputed server-side.
// If the formula in exams-store.jsx ever changes, mirror it here too — see
// "Honest gaps today" in docs/phase-5-billing-tiers-plan.md.

const PREP_WINDOW_DAYS = 90;

function clamp(min, max, n) {
  return Math.max(min, Math.min(max, n));
}

function daysAway(examDate, now) {
  return Math.ceil((new Date(examDate).getTime() - now.getTime()) / 86400000);
}

// Mirrors exams-store.jsx's deriveCourse(): completionPct*0.6 + confidencePct*0.25
// + paceDelta*0.3, clamped 0-99. paceDelta compares actual completion against
// what a fixed prep window says "should" be done by now.
export function gradeProbability(exam, now = new Date()) {
  const completionPct = clamp(0, 100, Number(exam.completionPct) || 0);
  const confidencePct = Number.isFinite(exam.confidencePct) ? exam.confidencePct : 50;
  const daysLeft = daysAway(exam.examDate, now);
  const totalDays = Math.max(daysLeft, PREP_WINDOW_DAYS);
  const required = totalDays <= 0 ? 100 : Math.round(((totalDays - daysLeft) / totalDays) * 100);
  const paceDelta = completionPct - required;
  return clamp(0, 99, Math.round(completionPct * 0.6 + confidencePct * 0.25 + paceDelta * 0.3));
}

// Ranks topics by active (non-recovered) mistake count, most-missed first.
// Same "General" fallback and `status === 'recovered'` rule as
// mistakes-store.jsx so a topic doesn't appear here right after the student
// clears it in the Journal.
export function weakestTopics(mistakes, limit = 3) {
  const counts = new Map();
  for (const m of mistakes || []) {
    if (!m || m.status === "recovered") continue;
    const topic = typeof m.topic === "string" && m.topic ? m.topic : "General";
    counts.set(topic, (counts.get(topic) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([topic]) => topic);
}

const LANG_NAMES = { en: "English", uk: "Ukrainian", ru: "Russian", fr: "French", de: "German" };

// One short, honest sentence — never invents a number the formula didn't
// produce. Model is chosen by the caller (Ultra traffic always gets Sonnet,
// per Decision #113); this function only builds the prompt.
export function predictorCommentaryPrompt({ examName, probability, weakTopics, lang }) {
  const langName = LANG_NAMES[lang] || "English";
  const weak = weakTopics && weakTopics.length ? weakTopics.join(", ") : null;
  return [
    `Student's predicted readiness for "${examName}" is ${probability}% (a formula, not your estimate — do not restate or contradict the number).`,
    weak
      ? `Their most-missed topics right now: ${weak}.`
      : `No recurring weak topics in their mistake journal right now.`,
    `Write exactly one short, honest, encouraging sentence for a weekly progress email. Plain language, no jargon, no percentages other than the one given, no exclamation marks.`,
    `Respond only in ${langName}.`,
  ].join(" ");
}

// Direct Anthropic call — this runs in the cron, not through api/complete.js,
// so it has no signed-in user to bill quota against and no client to award
// max_tokens excess to. Deliberately small (short sentence, no need for the
// 8192 ceiling complete.js uses). Returns null on any failure — a missing
// AI line must never break the rest of the weekly report.
export async function fetchPredictorCommentary(apiKey, prompt) {
  if (!apiKey || !prompt) return null;
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 200,
        thinking: { type: "disabled" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = (data.content || []).map((b) => b.text || "").join("").trim();
    return text || null;
  } catch {
    return null;
  }
}
