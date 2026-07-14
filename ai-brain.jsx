// AI Exam Coach — the AI layer that sits on top of the brain.
//
// This is the single choke point every AI call goes through. It:
//   • injects buildLearnerContext() — who the learner is, what they know,
//     their uploaded materials — into every request
//   • provides robust JSON parsing
//   • exposes typed operations that write back INTO the brain
//   • tracks what topics the AI Coach discusses so mastery updates in real-time

// ─── robust JSON ─────────────────────────────────────────────────────────────

function parseJSON(raw, fallback = null) {
  if (typeof raw !== "string") return fallback;
  let s = raw.trim();
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

function buildLearnerContext(opts = {}) {
  if (!window.getBrain) return "";
  const b = window.getBrain();
  const p = b.profile || {};
  const lines = [];

  const name = p.fullName ? p.fullName.split(" ")[0] : null;
  lines.push(`You are this student's personal tutor.${name ? ` Their name is ${name}.` : ""}`);
  if (p.weeklyHours) lines.push(`They study about ${p.weeklyHours} hours/week.`);

  // Learning memory — what we've learned ABOUT this student across sessions
  const mem = b.memory || {};
  if (mem.learningStyle) lines.push(`Preferred learning style: ${mem.learningStyle}.`);
  if (mem.strengths && mem.strengths.length) lines.push(`Known strengths: ${mem.strengths.join(", ")}.`);
  if (mem.weaknesses && mem.weaknesses.length) lines.push(`Known weaknesses: ${mem.weaknesses.join(", ")}.`);
  if (mem.preferredExplanations && mem.preferredExplanations.length)
    lines.push(`They respond well to: ${mem.preferredExplanations.join(", ")}.`);
  if (mem.notes && mem.notes.length)
    lines.push(`Remember: ${mem.notes.slice(0, 8).join("; ")}.`);

  // Exams with per-topic mastery detail
  if (b.examViews && b.examViews.length) {
    lines.push("\n── THEIR EXAMS ──");
    b.examViews.forEach((e) => {
      const days = e.daysAway == null ? "" : e.daysAway < 0 ? " (passed)" : ` — exam in ${e.daysAway} days`;
      lines.push(`\n📘 ${e.name} (${e.examBoard || "unknown board"}), target ${e.targetGrade}, ${e.started ? `${e.readiness}% ready` : "not started yet"}${days}`);

      // Per-topic mastery breakdown — this is what makes the tutor KNOW the student
      const topicLines = [];
      e.topics.forEach((t) => {
        if (t.lastSeen) {
          const ret = Math.round(t.retention * 100);
          const status = ret >= 80 ? "solid" : ret >= 50 ? "fading" : "weak";
          topicLines.push(`  ${t.name}: ${ret}% retention (${status})`);
        } else {
          topicLines.push(`  ${t.name}: never studied`);
        }
      });
      if (topicLines.length <= 15) lines.push(...topicLines);
      else {
        // Too many topics — show weakest + unseen only
        const weak = e.topics.filter((t) => !t.lastSeen || t.retention < 0.5);
        lines.push(`  ${e.topics.length} topics total. Weakest/unseen:`);
        weak.slice(0, 10).forEach((t) => {
          lines.push(`  ${t.name}: ${t.lastSeen ? Math.round(t.retention * 100) + "% (weak)" : "never studied"}`);
        });
      }
    });
  }

  // Due reviews — topics actively being forgotten
  if (b.dueReviews && b.dueReviews.length) {
    lines.push("\n── DUE FOR REVIEW (memory fading) ──");
    b.dueReviews.slice(0, 6).forEach((t) =>
      lines.push(`• ${t.topicName} (${t.examName}) — ${Math.round(t.retention * 100)}% retention`));
  }

  // Recent mistakes
  if (b.mistakes && b.mistakes.length) {
    lines.push("\n── RECENT MISTAKES ──");
    b.mistakes.slice(0, 5).forEach((m) =>
      lines.push(`• ${m.topic}: got "${m.question}" wrong`));
  }

  // KB content injection — when discussing a specific topic, include the
  // student's own materials so the tutor can reference THEIR notes
  if (opts.topicContext) {
    const { examId, topicName } = opts.topicContext;
    const kb = examId && window.getExamKB ? window.getExamKB(examId) : null;
    if (kb && kb.status === "ready" && Array.isArray(kb.chapters)) {
      const norm = (x) => String(x || "").toLowerCase();
      const topicL = norm(topicName);
      const ch = kb.chapters.find((c) =>
        norm(c.title).includes(topicL) || topicL.includes(norm(c.title)) ||
        (Array.isArray(c.topics) && c.topics.some((tp) => norm(tp).includes(topicL) || topicL.includes(norm(tp)))));
      if (ch) {
        lines.push(`\n── FROM STUDENT'S OWN MATERIALS: ${ch.title} ──`);
        if (ch.objectives && ch.objectives.length) lines.push("Objectives: " + ch.objectives.join("; "));
        if (ch.keyFacts && ch.keyFacts.length) lines.push("Key facts:\n• " + ch.keyFacts.slice(0, 12).join("\n• "));
        if (ch.formulas && ch.formulas.length) lines.push("Formulas: " + ch.formulas.join("; "));
      }
      if (kb.glossary && kb.glossary.length) {
        const relevant = kb.glossary.filter((g) => topicL.includes(norm(g.term)) || norm(g.term).includes(topicL));
        if (relevant.length) {
          lines.push("Relevant glossary:");
          relevant.slice(0, 5).forEach((g) => lines.push(`• ${g.term}: ${g.def}`));
        }
      }
    }
  }

  return lines.join("\n");
}

// ─── central completion ───────────────────────────────────────────────────────

// Language names the AI is told to answer in when the student's UI isn't
// English — static UI strings already go through L()/window.LANGS per
// screen, but every AI-generated response (chat replies, quiz questions,
// flashcards, session recaps...) used to come back in English regardless,
// since nothing ever told Claude what language to use.
const AI_LANG_NAMES = { en: "English", uk: "Ukrainian", ru: "Russian", fr: "French", de: "German" };

// Shared by every AI call site in the app (not just brainComplete) so a
// direct window.claude.complete() caller — StudyHub.jsx, BurnoutAlert.jsx —
// can prepend the same directive without duplicating the language map.
function aiLangDirective() {
  const langCode = (window.getProfile ? window.getProfile().lang : null) || "en";
  return langCode !== "en"
    ? `Respond in ${AI_LANG_NAMES[langCode] || langCode}, not English — the student's app is set to that language.`
    : "";
}

async function brainComplete({ system, messages, prompt, includeContext = true, topicContext } = {}) {
  if (!window.claude) throw new Error("AI is not available");
  const ctx = includeContext ? buildLearnerContext({ topicContext }) : "";
  const fullSystem = [aiLangDirective(), ctx, system].filter(Boolean).join("\n\n");
  const msgs = messages || [{ role: "user", content: prompt || "" }];
  return window.claude.complete({ system: fullSystem || undefined, messages: msgs });
}

async function brainCompleteJSON(opts, fallback = null) {
  const raw = await brainComplete(opts);
  return parseJSON(raw, fallback);
}

// ─── coach session tracker ──────────────────────────────────────────────────
// Tracks what the AI Coach covers in a conversation so we can update mastery
// and generate a meaningful session summary.

function createCoachSession() {
  return {
    startedAt: Date.now(),
    topicsCovered: [],        // [{examId, topicIdx, topicName}]
    quizResults: [],          // [{correct, topicName, question}]
    conceptsTaught: 0,
    diagnosedWeaknesses: [],  // strings
    diagnosedStrengths: [],   // strings
  };
}

function coachSessionSummary(session) {
  if (!session) return null;
  const mins = Math.round((Date.now() - session.startedAt) / 60000);
  const quizCorrect = session.quizResults.filter((r) => r.correct).length;
  const quizTotal = session.quizResults.length;
  return {
    durationMinutes: mins,
    topicsCovered: session.topicsCovered,
    quizCorrect,
    quizTotal,
    quizAccuracy: quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : null,
    conceptsTaught: session.conceptsTaught,
    diagnosedWeaknesses: session.diagnosedWeaknesses,
    diagnosedStrengths: session.diagnosedStrengths,
  };
}

// Apply a coach session's learnings to the brain
function commitCoachSession(session) {
  if (!session) return;
  // Mark all discussed topics as "seen"
  const seen = new Set();
  session.topicsCovered.forEach((t) => {
    const key = `${t.examId}::${t.topicIdx}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (window.markTopicsStudied) {
      window.markTopicsStudied(t.examId, [t.topicIdx], [t.topicName]);
    }
  });
  // Save diagnosed insights to learner memory
  if (session.diagnosedWeaknesses.length && window.updateMemory) {
    const mem = window.getMemory ? window.getMemory() : {};
    const existing = new Set(mem.weaknesses || []);
    session.diagnosedWeaknesses.forEach((w) => existing.add(w));
    window.updateMemory({ weaknesses: [...existing].slice(0, 20) });
  }
  if (session.diagnosedStrengths.length && window.updateMemory) {
    const mem = window.getMemory ? window.getMemory() : {};
    const existing = new Set(mem.strengths || []);
    session.diagnosedStrengths.forEach((s) => existing.add(s));
    window.updateMemory({ strengths: [...existing].slice(0, 20) });
  }
}

// Resolve a topic name to an examId + topicIdx for brain write-back
function resolveTopicForBrain(topicName) {
  if (!topicName || !window.getBrain) return null;
  const b = window.getBrain();
  const norm = (s) => String(s || "").toLowerCase().trim();
  const target = norm(topicName);
  for (const ev of (b.examViews || [])) {
    for (const t of (ev.topics || [])) {
      if (norm(t.name) === target || norm(t.name).includes(target) || target.includes(norm(t.name))) {
        return { examId: ev.id, topicIdx: t.topicIdx, topicName: t.name, examName: ev.name };
      }
    }
  }
  return null;
}

// ─── typed operations ────────────────────────────────────────────────────────

async function aiTutorReply(history, userMessage) {
  const system =
    "You are a world-class personal tutor, not a chatbot. Teach ONE idea at a time, " +
    "then check understanding with a short question. Keep replies tight — a few sentences, " +
    "never a wall of text. Use the student's known weak topics and mistakes to steer. " +
    "Adapt difficulty to how they answer. Be warm, direct, and specific.";
  const messages = [...(history || []), { role: "user", content: userMessage }];
  return brainComplete({ system, messages });
}

async function aiGenerateQuiz(examId, topicIdx, topicName, n = 5) {
  const mastery = window.getMastery ? window.getMastery()[window.topicKey(examId, topicIdx)] : null;
  const level = !mastery ? "introductory" : mastery.mastery > 0.7 ? "challenging" : mastery.mastery > 0.4 ? "moderate" : "foundational";
  const system =
    `Generate exactly ${n} ${level} multiple-choice questions on the topic below. ` +
    `Output ONLY valid JSON, no markdown: {"questions":[{"q":"...","options":["a","b","c","d"],"correct":0,"why":"one-line explanation"}]}. ` +
    `Four options each, exactly one correct, "correct" is its 0-based index.`;
  const data = await brainCompleteJSON({ system, prompt: `Topic: ${topicName}`, topicContext: { examId, topicName } }, { questions: [] });
  return Array.isArray(data.questions) ? data.questions.slice(0, n) : [];
}

async function aiExplainDifferently(concept, priorExplanation) {
  const system =
    "The student did not understand the previous explanation. Explain the SAME concept a " +
    "genuinely different way — switch to a concrete analogy or worked example if you were abstract, " +
    "or vice versa. Keep it short.";
  const prompt = `Concept: ${concept}\n\nPrevious explanation they didn't get:\n${priorExplanation || "(none)"}`;
  return brainComplete({ system, prompt });
}

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
  parseJSON, buildLearnerContext, brainComplete, brainCompleteJSON, aiLangDirective,
  aiTutorReply, aiGenerateQuiz, aiExplainDifferently, aiExtractCourse,
  createCoachSession, coachSessionSummary, commitCoachSession, resolveTopicForBrain,
});
