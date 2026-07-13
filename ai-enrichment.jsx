// AI Exam Coach — background AI enrichment for newly created exams.
// Used to be a blocking full-screen step inside onboarding (the user
// couldn't even click Finish until this resolved); now it's a store-level,
// fire-and-forget call kicked off right after commitExamWizard() — running
// it here instead of inside the wizard component means it keeps running
// even after the wizard unmounts and the user has already moved on to the
// Dashboard. Result patches back onto the exam record via the same
// saveExams() path everything else uses, so there's no parallel store.

// Reads a real uploaded File into Claude-ready content blocks (image/PDF/
// PPTX/DOCX/TXT) — moved here from Onboarding.jsx so it has no UI dependency.
async function fileToClaudeContent(file) {
  const name = file.name || "file";
  const ext = name.split(".").pop().toLowerCase();
  const mime = file.type;
  if (mime.startsWith("image/")) {
    const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = (e) => res(e.target.result); r.onerror = rej; r.readAsDataURL(file); });
    return [{ type: "image", source: { type: "base64", media_type: mime, data: dataUrl.split(",")[1] } }];
  }
  if (ext === "pdf" || mime === "application/pdf") {
    const ab = await file.arrayBuffer();
    const bytes = new Uint8Array(ab);
    let b64 = "";
    for (let i = 0; i < bytes.length; i += 8192) b64 += btoa(String.fromCharCode(...bytes.subarray(i, i + 8192)));
    return [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }];
  }
  if (["pptx", "ppt", "docx", "doc"].includes(ext) || mime.includes("presentationml") || mime.includes("wordprocessingml") || mime.includes("powerpoint") || mime.includes("msword")) {
    const JSZip = window.JSZip;
    if (!JSZip) return [{ type: "text", text: "(could not read this file format — JSZip unavailable)" }];
    const ab = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(ab);
    let text = "";
    if (["pptx", "ppt"].includes(ext) || mime.includes("presentationml") || mime.includes("powerpoint")) {
      const slides = Object.keys(zip.files).filter((f) => /ppt\/slides\/slide\d+\.xml$/.test(f)).sort((a, b) => { const na = parseInt(a.match(/\d+/g).pop()), nb = parseInt(b.match(/\d+/g).pop()); return na - nb; });
      for (const s of slides.slice(0, 25)) { const xml = await zip.files[s].async("string"); const d = document.createElement("div"); d.innerHTML = xml.replace(/<\/a:t>/g, " ").replace(/<[^>]+>/g, ""); text += d.textContent.replace(/\s+/g, " ").trim() + "\n"; }
    } else {
      const doc = zip.files["word/document.xml"];
      if (doc) { const xml = await doc.async("string"); const d = document.createElement("div"); d.innerHTML = xml.replace(/<\/w:t>/g, " ").replace(/<[^>]+>/g, ""); text = d.textContent.replace(/\s+/g, " ").trim(); }
    }
    return [{ type: "text", text: (text.substring(0, 4000) || "(no extractable text found in this file)") }];
  }
  if (mime === "text/plain" || ext === "txt") {
    const text = await file.text();
    return [{ type: "text", text: text.substring(0, 4000) }];
  }
  return [{ type: "text", text: `(unsupported file type: ${name})` }];
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
      const system = `You are reviewing material a student provided while setting up an exam-prep app. Output ONLY valid JSON, no markdown: {"lines":["short finding","short finding","short finding","short finding"]}. Each line under 8 words. Be honest — if the content isn't study material, say that plainly instead of inventing topics or numbers.`;
      const raw = await window.claude.complete({ system, messages: [{ role: "user", content }] });
      const clean = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      const parsed = JSON.parse(clean);
      analysisLines = Array.isArray(parsed.lines) && parsed.lines.length ? parsed.lines : null;
    } catch { analysisLines = null; }

    const subjList = subjects.filter((s) => s.name && s.name.trim()).map((s) => `${s.name}: ${s.current} → ${s.target}`).join("; ") || "no subjects named";
    const prof = window.getProfile ? window.getProfile() : {};
    const profileCtx = [prof.country && `country: ${prof.country}`, prof.educationLevel && `education level: ${prof.educationLevel}`, prof.currentYear && `year/grade: ${prof.currentYear}`].filter(Boolean).join(", ");
    const prompt = `Write a short (3-4 sentence), encouraging, specific study plan opener for a student preparing for ${examLabel || "their exam"}.${profileCtx ? ` Student profile: ${profileCtx}.` : ""} Subjects and grade goals: ${subjList}. They can study ${weeklyHours} hours/week. Materials they have: ${materials.join(", ") || "none"}. Preferred study methods: ${prefs.join(", ") || "none"}. Be concrete about what to prioritise first. Do not invent specific percentages or exam dates — there's no study history yet.`;
    const summary = await window.claude.complete(prompt);
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
    const system = `You are listing real syllabus topics for an exam-prep app. Output ONLY valid JSON, no markdown: {"topics":[{"name":"topic name","difficulty":N,"importance":N}]}. Exactly ${count} items, each name under 5 words, most foundational first. difficulty = how conceptually hard this topic typically is for students (1 easy – 10 hard). importance = how central this topic is to the overall exam / how often it's tested (1 minor – 10 core). Both integers.`;
    const raw = await window.claude.complete({ system, messages: [{ role: "user", content }] });
    const clean = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(clean);
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
    const raw = await window.claude.complete({ system, messages: [{ role: "user", content: prompt }] });
    const clean = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(clean);
    const results = Array.isArray(parsed.results) ? parsed.results : [];
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
