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
    const prompt = `Write a short (3-4 sentence), encouraging, specific study plan opener for a student preparing for ${examLabel || "their exam"}. Subjects and grade goals: ${subjList}. They can study ${weeklyHours} hours/week. Materials they have: ${materials.join(", ") || "none"}. Preferred study methods: ${prefs.join(", ") || "none"}. Be concrete about what to prioritise first. Do not invent specific percentages or exam dates — there's no study history yet.`;
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
      content = `List exactly ${count} specific topics typically covered in "${exam.name}" at "${exam.examBoard || "a standard"}" level. Each a short topic name (2-5 words), most foundational first. Use your knowledge of this subject's real curriculum.`;
    }
    const system = `You are listing real syllabus topics for an exam-prep app. Output ONLY valid JSON, no markdown: {"topics":["topic name","topic name",...]}. Exactly ${count} items, each under 5 words.`;
    const raw = await window.claude.complete({ system, messages: [{ role: "user", content }] });
    const clean = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(clean);
    const topics = (Array.isArray(parsed.topics) ? parsed.topics : [])
      .filter((t) => typeof t === "string" && t.trim())
      .slice(0, count);
    if (!topics.length) throw new Error("no topics returned");

    patchExamAi(examId, { topics, topicsStatus: "ready" });
    if (window.relabelPendingSessions) window.relabelPendingSessions(examId, topics);
  } catch {
    patchExamAi(examId, { topicsStatus: "failed" });
  }
}

Object.assign(window, { requestAiEnrichment, requestTopicNames, fileToClaudeContent });
