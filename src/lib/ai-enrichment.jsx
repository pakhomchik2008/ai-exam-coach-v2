// Examik — background AI enrichment for newly created exams.
// Used to be a blocking full-screen step inside onboarding (the user
// couldn't even click Finish until this resolved); now it's a store-level,
// fire-and-forget call kicked off right after commitExamWizard() — running
// it here instead of inside the wizard component means it keeps running
// even after the wizard unmounts and the user has already moved on to the
// Dashboard. Result patches back onto the exam record via the same
// saveExams() path everything else uses, so there's no parallel store.

import { extractStudyFile, toClaudeBlocks } from "./extract-study-file";

// Shared extractor — fails open so a single unreadable file cannot abort
// enrichment. window.fileToClaudeContent is still published for ai-brain.jsx.
async function fileToClaudeContent(file) {
  try {
    return toClaudeBlocks(await extractStudyFile(file));
  } catch {
    return [{ type: "text", text: `(could not read ${file.name || "file"})` }];
  }
}

function patchExamAi(examId, patch) {
  if (!window.getExams || !window.saveExams) return;
  const exams = window.getExams();
  window.saveExams(exams.map((e) => e.id === examId ? { ...e, ...patch } : e));
}

// context: { files: File[], subjects: [{name,current,target}], weeklyHours,
//            materials: string[], prefs: string[], examLabel }
async function requestAiEnrichment(examIds, context) {
  if (!examIds || !examIds.length || !window.claude) return;
  examIds.forEach((id) => patchExamAi(id, { aiPlanStatus: "pending" }));

  const { files = [], subjects = [], weeklyHours, materials = [], prefs = [], examLabel } = context || {};
  try {
    let analysisLines = null;
    try {
      let content;
      if (files.length > 0) {
        const blocks = [];
        for (const f of files.slice(0, 2)) blocks.push(...(await fileToClaudeContent(f)));
        blocks.push({ type: "text", text: "Identify what study topics (if any) are present in the above. If this is not study material — e.g. a personal document, ID, receipt, or unrelated photo — say so plainly instead of inventing topics." });
        content = blocks;
      } else {
        const subjList = subjects.filter((s) => s.name && s.name.trim()).map((s) => s.name).join(", ") || "no subjects specified";
        content = `No files were uploaded. Student is preparing to study: ${subjList}. They selected these material types they own: ${materials.join(", ") || "none"}.`;
      }
      const system = `You are reviewing material a student provided while setting up an exam-prep app. Output ONLY valid JSON, no markdown: {"lines":["short finding","short finding","short finding","short finding"]}. Each line under 8 words. Be honest — if the content isn't study material, say that plainly instead of inventing topics or numbers.${window.aiLangDirective ? ` ${window.aiLangDirective()}` : ""}`;
      const parsed = await window.brainCompleteJSON({ system, messages: [{ role: "user", content }], includeContext: false }, null);
      analysisLines = parsed && Array.isArray(parsed.lines) && parsed.lines.length ? parsed.lines : null;
    } catch { analysisLines = null; }

    const subjList = subjects.filter((s) => s.name && s.name.trim()).map((s) => `${s.name}: ${s.current} → ${s.target}`).join("; ") || "no subjects named";
    const prof = window.getProfile ? window.getProfile() : {};
    const profileCtx = [prof.country && `country: ${prof.country}`, prof.educationLevel && `education level: ${prof.educationLevel}`, prof.currentYear && `year/grade: ${prof.currentYear}`].filter(Boolean).join(", ");
    const prompt = `Write a short (3-4 sentence), encouraging, specific study plan opener for a student preparing for ${examLabel || "their exam"}.${profileCtx ? ` Student profile: ${profileCtx}.` : ""} Subjects and grade goals: ${subjList}. They can study ${weeklyHours} hours/week. Materials they have: ${materials.join(", ") || "none"}. Preferred study methods: ${prefs.join(", ") || "none"}. Be concrete about what to prioritise first. Do not invent specific percentages or exam dates — there's no study history yet.${window.aiLangDirective ? ` ${window.aiLangDirective()}` : ""}`;
    const summary = await window.brainComplete({ prompt });
    const finalSummary = analysisLines ? `${analysisLines.join(" · ")}\n\n${summary}` : summary;
    examIds.forEach((id) => patchExamAi(id, { aiPlanStatus: "ready", aiPlanSummary: finalSummary }));
  } catch {
    examIds.forEach((id) => patchExamAi(id, { aiPlanStatus: "failed" }));
  }
}

// AI-generated topic names — replaces the generic "Topic review N" labels
// schedule-store.jsx falls back to. Runs per-exam (unlike requestAiEnrichment,
// which batches examIds) since topicCount/name/examBoard differ per exam in a
// multi-subject wizard run. Same fire-and-forget, never-block-Finish shape.
async function requestTopicNames(examId, exam, files) {
  if (!examId || !exam || !window.claude) return;
  patchExamAi(examId, { topicsStatus: "pending" });

  const count = Math.max(1, exam.topicCount || 10);
  try {
    let content;
    if (files && files.length > 0) {
      const blocks = [];
      for (const f of files.slice(0, 2)) blocks.push(...(await fileToClaudeContent(f)));
      blocks.push({ type: "text", text: `Based on the material above, list exactly ${count} specific topics covered for "${exam.name}". Each a short topic name (2-5 words), most foundational first.` });
      content = blocks;
    } else {
      const prof = window.getProfile ? window.getProfile() : {};
      const profileCtx = [prof.country && `country: ${prof.country}`, prof.educationLevel && `education level: ${prof.educationLevel}`, prof.currentYear && `year/grade: ${prof.currentYear}`].filter(Boolean).join(", ");
      content = `List exactly ${count} specific topics typically covered in "${exam.name}" at "${exam.examBoard || "a standard"}" level.${profileCtx ? ` Student profile: ${profileCtx}.` : ""} Each a short topic name (2-5 words), most foundational first. Use your knowledge of this subject's real curriculum.`;
    }
    // difficulty/importance ride along in the same call — no extra latency —
    // and land in the sibling topicWeights field (exams-store.jsx) so the
    // hour-budget scheduler can weight study time per topic instead of
    // splitting it evenly.
    const system = `You are listing real syllabus topics for an exam-prep app. Output ONLY valid JSON, no markdown: {"topics":[{"name":"topic name","difficulty":N,"importance":N}]}. Exactly ${count} items, each name under 5 words, most foundational first. difficulty = how conceptually hard this topic typically is for students (1 easy – 10 hard). importance = how central this topic is to the overall exam / how often it's tested (1 minor – 10 core). Both integers.${window.aiLangDirective ? ` ${window.aiLangDirective()}` : ""}`;
    const parsed = await window.brainCompleteJSON({ system, messages: [{ role: "user", content }], includeContext: false }, null);
    if (!parsed) throw new Error("no topics returned");
    const items = (Array.isArray(parsed.topics) ? parsed.topics : [])
      .filter((t) => t && typeof t.name === "string" && t.name.trim())
      .slice(0, count);
    if (!items.length) throw new Error("no topics returned");
    const topics = items.map((t) => t.name.trim());
    const topicWeights = {};
    items.forEach((t, i) => {
      const d = Number(t.difficulty), imp = Number(t.importance);
      topicWeights[i] = {
        difficulty: Number.isFinite(d) && d >= 1 && d <= 10 ? Math.round(d) : 5,
        importance: Number.isFinite(imp) && imp >= 1 && imp <= 10 ? Math.round(imp) : 5,
      };
    });

    patchExamAi(examId, { topics, topicsStatus: "ready", topicWeights });
    if (window.relabelPendingSessions) window.relabelPendingSessions(examId, topics);
  } catch {
    patchExamAi(examId, { topicsStatus: "failed" });
  }
}

// The upload payoff, wired end-to-end. When a student uploads real materials we
// deep-extract them into a persistent knowledge base (aiExtractCourse → brain's
// saveExamKB: chapters, objectives, key facts, formulas, glossary) AND derive
// the exam's real topic list from that KB — so one extraction feeds the planner
// (topics/sessions), quizzes (grounded in their own notes) and CourseDetail.
// No files (or extraction fails / isn't study material) → fall back to the
// curriculum-knowledge topic names, so setup never dead-ends.
async function requestCourseExtraction(examId, exam, files) {
  if (!examId || !exam) return;
  if (!files || !files.length || !window.aiExtractCourse) {
    return requestTopicNames(examId, exam, files);
  }
  const count = Math.max(1, exam.topicCount || 10);
  try {
    const kb = await window.aiExtractCourse(examId, files); // persists KB to the brain
    // Derive topic names from the KB: prefer the granular chapter topics, fall
    // back to chapter titles. Keep to the exam's topicCount, foundational first.
    const chapters = Array.isArray(kb.chapters) ? kb.chapters : [];
    let topics = [];
    for (const ch of chapters) {
      if (Array.isArray(ch.topics) && ch.topics.length) topics.push(...ch.topics);
      else if (ch.title) topics.push(ch.title);
    }
    topics = topics.map((tp) => String(tp).trim()).filter(Boolean);
    if (topics.length > count) topics = topics.slice(0, count);
    if (!topics.length) throw new Error("KB produced no topics");

    patchExamAi(examId, { topics, topicsStatus: "ready" });
    if (window.relabelPendingSessions) window.relabelPendingSessions(examId, topics);
  } catch (err) {
    // Not study material, or extraction failed — still give the student a usable
    // topic list from curriculum knowledge rather than leaving generic labels.
    console.warn("Course extraction fell back to curriculum topics:", err && err.message);
    return requestTopicNames(examId, exam, files);
  }
}

// Reject nonsense manual topic entries ("asdf", "123123", "www") before they
// ever reach a Course. Only reachable from CurriculumStep's last-resort manual
// path (no curriculum match, user declined AI-generate and "no topic list").
// Fails OPEN at every layer — no window.claude, a network error, or a missing
// per-line result all default to ACCEPTING the line, so a transport hiccup
// never hard-blocks exam creation. Rejected lines get a reason; good lines are
// never held hostage by one bad line among them.
async function validateManualTopics(lines) {
  if (!Array.isArray(lines) || !lines.length) return { valid: [], rejected: [] };
  if (!window.claude) return { valid: lines, rejected: [] };
  const system = "You are checking whether each line is a plausible real study topic name (a subject/concept a student would revise) — not gibberish, a URL, a placeholder, or random characters. " +
    'Output ONLY valid JSON, no markdown: {"results":[{"valid":true|false,"reason":"short reason if invalid, else null"}]}. One result per input line, same order, no extra items.';
  const prompt = lines.map((l, i) => `${i + 1}. ${l}`).join("\n");
  try {
    const parsed = await window.brainCompleteJSON({ system, messages: [{ role: "user", content: prompt }], includeContext: false }, null);
    const results = parsed && Array.isArray(parsed.results) ? parsed.results : [];
    const valid = [], rejected = [];
    lines.forEach((line, i) => {
      const r = results[i];
      if (r && r.valid === false) rejected.push({ line, reason: (r.reason && String(r.reason)) || "Doesn't look like a real study topic" });
      else valid.push(line);
    });
    return { valid, rejected };
  } catch {
    return { valid: lines, rejected: [] };
  }
}

Object.assign(window, { requestAiEnrichment, requestTopicNames, requestCourseExtraction, fileToClaudeContent, patchExamAi, validateManualTopics });

// Module marker: these files carry no import/export of their own (they still
// communicate via `window` globals), and without one the JSX transform treats
// the file as a CommonJS script and emits a bare `require()` call that throws
// in the browser. Removed once this module uses real imports.
export {};
