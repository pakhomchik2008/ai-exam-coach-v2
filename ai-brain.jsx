// AI Exam Coach — the AI layer that sits on top of the brain.
//
// window.claude.complete() (index.html) is a raw pass-through: every feature
// hand-built its own prompt and none of them knew anything about the student.
// That is why the app "had AI" but never felt like it *understood you*.
//
// This module is the single choke point every AI call should go through. It:
//   • injects buildLearnerContext() — a compact snapshot of who the learner is
//     and what they know — into the system prompt of every request, so the AI
//     has memory by default instead of by accident;
//   • provides one robust JSON parser (three files reimplemented the fragile
//     raw.slice(indexOf('{')..) dance);
//   • exposes typed operations that write their results BACK into the brain —
//     a wrong quiz answer lowers that topic's mastery, an upload populates the
//     knowledge base — so the app is a loop, not a set of one-shot prompts.
//
// Must load AFTER brain-store.jsx and after index.html has defined window.claude.

// ─── robust JSON ─────────────────────────────────────────────────────────────

function parseJSON(raw, fallback = null) {
  if (typeof raw !== "string") return fallback;
  let s = raw.trim();
  // Strip ```json fences if the model added them despite instructions.
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = s.search(/[[{]/);
  if (start === -1) return fallback;
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  const end = s.lastIndexOf(close);
  if (end <= start) return fallback;
  try { return JSON.parse(s.slice(start, end + 1)); } catch { return fallback; }
}

// ─── learner context ─────────────────────────────────────────────────────────

// The paragraph of "everything we know about this student" that rides on every
// call. Deliberately compact (tokens cost money and dilute attention) — the
// weakest topics and recent mistakes matter far more than a full dump.
function buildLearnerContext() {
  if (!window.getBrain) return "";
  const b = window.getBrain();
  const p = b.profile || {};
  const lines = [];

  const name = p.fullName ? p.fullName.split(" ")[0] : null;
  lines.push(`You are this student's personal tutor.${name ? ` Their name is ${name}.` : ""}`);
  if (p.weeklyHours) lines.push(`They can study about ${p.weeklyHours} hours/week.`);
  if (b.memory && b.memory.learningStyle) lines.push(`Preferred learning style: ${b.memory.learningStyle}.`);
  if (b.memory && b.memory.notes && b.memory.notes.length)
    lines.push(`Remember about them: ${b.memory.notes.slice(0, 5).join("; ")}.`);

  if (b.examViews && b.examViews.length) {
    lines.push("Their exams:");
    b.examViews.forEach((e) => {
      const days = e.daysAway == null ? "" : e.daysAway < 0 ? " (already passed)" : ` in ${e.daysAway} days`;
      lines.push(`• ${e.name} (${e.examBoard}), target ${e.targetGrade}, ${e.readiness}% ready${days}.`);
    });
  }
  if (b.weakestTopics && b.weakestTopics.length) {
    lines.push("Weakest topics right now (lowest estimated retention):");
    b.weakestTopics.slice(0, 5).forEach((t) =>
      lines.push(`• ${t.topicName} (${t.examName}) — ${Math.round(t.retention * 100)}%`));
  }
  if (b.mistakes && b.mistakes.length) {
    lines.push("Recent mistakes to watch for:");
    b.mistakes.slice(0, 3).forEach((m) => lines.push(`• ${m.topic}: got "${m.question}" wrong`));
  }
  return lines.join("\n");
}

// ─── central completion ───────────────────────────────────────────────────────

// Every feature should call this instead of window.claude.complete directly.
// includeContext=false for the rare call that must not be biased by the learner
// snapshot (e.g. neutral extraction from an uploaded file).
async function brainComplete({ system, messages, prompt, includeContext = true } = {}) {
  if (!window.claude) throw new Error("AI is not available");
  const ctx = includeContext ? buildLearnerContext() : "";
  const fullSystem = [ctx, system].filter(Boolean).join("\n\n");
  const msgs = messages || [{ role: "user", content: prompt || "" }];
  return window.claude.complete({ system: fullSystem || undefined, messages: msgs });
}

async function brainCompleteJSON(opts, fallback = null) {
  const raw = await brainComplete(opts);
  return parseJSON(raw, fallback);
}

// ─── typed operations ─────────────────────────────────────────────────────────

// A real tutor turn: context-aware, concise, one concept at a time. Returns the
// assistant's text; callers own the message history.
async function aiTutorReply(history, userMessage) {
  const system =
    "You are a world-class personal tutor, not a chatbot. Teach ONE idea at a time, " +
    "then check understanding with a short question. Keep replies tight — a few sentences, " +
    "never a wall of text. Use the student's known weak topics and mistakes to steer. " +
    "Adapt difficulty to how they answer. Be warm, direct, and specific.";
  const messages = [...(history || []), { role: "user", content: userMessage }];
  return brainComplete({ system, messages });
}

// Generate an adaptive multiple-choice quiz for a topic. Difficulty is nudged
// by the topic's current mastery so a shaky topic isn't hit with hard items.
async function aiGenerateQuiz(examId, topicIdx, topicName, n = 5) {
  const mastery = window.getMastery ? window.getMastery()[window.topicKey(examId, topicIdx)] : null;
  const level = !mastery ? "introductory" : mastery.mastery > 0.7 ? "challenging" : mastery.mastery > 0.4 ? "moderate" : "foundational";
  const system =
    `Generate exactly ${n} ${level} multiple-choice questions on the topic below. ` +
    `Output ONLY valid JSON, no markdown: {"questions":[{"q":"...","options":["a","b","c","d"],"correct":0,"why":"one-line explanation"}]}. ` +
    `Four options each, exactly one correct, "correct" is its 0-based index.`;
  const data = await brainCompleteJSON({ system, prompt: `Topic: ${topicName}` }, { questions: [] });
  return Array.isArray(data.questions) ? data.questions.slice(0, n) : [];
}

// Explain a concept a DIFFERENT way — the "I still don't get it" button. Uses
// learner memory so the alternative actually differs along a useful axis.
async function aiExplainDifferently(concept, priorExplanation) {
  const system =
    "The student did not understand the previous explanation. Explain the SAME concept a " +
    "genuinely different way — switch to a concrete analogy or worked example if you were abstract, " +
    "or vice versa. Keep it short.";
  const prompt = `Concept: ${concept}\n\nPrevious explanation they didn't get:\n${priorExplanation || "(none)"}`;
  return brainComplete({ system, prompt });
}

// THE upload payoff. Deep-extract an uploaded course into a structured
// knowledge base and PERSIST it to the brain, so every other screen can use it.
// files: File[]. Returns the saved KB (or throws).
async function aiExtractCourse(examId, files) {
  if (!window.fileToClaudeContent || !window.saveExamKB) throw new Error("extraction unavailable");
  window.saveExamKB(examId, { status: "extracting" });

  const blocks = [];
  for (const f of (files || []).slice(0, 3)) blocks.push(...(await window.fileToClaudeContent(f)));
  blocks.push({ type: "text", text:
    "Extract a structured study knowledge base from the material above. If it is not study " +
    "material, return {\"notStudyMaterial\":true}. Otherwise output ONLY valid JSON, no markdown:\n" +
    "{\"chapters\":[{\"title\":\"...\",\"topics\":[\"...\"],\"objectives\":[\"...\"],\"keyFacts\":[\"...\"]," +
    "\"formulas\":[\"...\"],\"difficulty\":1-3,\"estMinutes\":30}],\"glossary\":[{\"term\":\"...\",\"def\":\"...\"}]}" });

  const system =
    "You are extracting a precise, faithful study knowledge base from a student's own materials. " +
    "Do not invent content that isn't supported by the source. Be thorough but concise.";
  // includeContext:false — extraction should reflect the FILE, not our prior beliefs.
  const data = await brainCompleteJSON(
    { system, messages: [{ role: "user", content: blocks }], includeContext: false },
    null
  );

  if (!data || data.notStudyMaterial) {
    window.saveExamKB(examId, { status: "not_study_material", chapters: [] });
    throw new Error("not study material");
  }
  const kb = {
    status: "ready",
    chapters: Array.isArray(data.chapters) ? data.chapters : [],
    glossary: Array.isArray(data.glossary) ? data.glossary : [],
    sourceFiles: (files || []).map((f) => f.name),
    extractedAt: new Date().toISOString(),
  };
  return window.saveExamKB(examId, kb);
}

Object.assign(window, {
  parseJSON, buildLearnerContext, brainComplete, brainCompleteJSON,
  aiTutorReply, aiGenerateQuiz, aiExplainDifferently, aiExtractCourse,
});
