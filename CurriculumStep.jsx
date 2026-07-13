// AI Exam Coach — the ONE shared "pick subject -> resolve syllabus" flow.
//
// Used by both the first-run exam-wizard.jsx (compact=false) and the fast
// Exams.jsx add-exam modal (compact=true) — this is what actually kills the
// old duplicated subject/topics logic, not just routing between two flows.
//
// Produces a Course DRAFT via onCourseChange (nothing is written to
// course-store.jsx here — the caller creates the real Course at commit time,
// exactly like the rest of this app's "nothing persists until Finish"
// pattern). AI-sourced topics are NEVER auto-accepted: they sit in an
// awaiting-confirmation state until the user clicks "Looks correct" (or
// edits first) — see stage "awaiting-confirmation" below.
//
// Lookup order, exactly per the curriculum-store.jsx contract:
// official seed -> cache -> AI generation. Official (and any cache row a
// user already verified once) skips the confirm step entirely; everything
// else always show it.

function CurriculumStep({
  countryId, qualificationId, board, specVersion,
  subject, onSubjectChange,
  course, onCourseChange,          // controlled Course draft, or null until resolved
  noTopicList, onNoTopicListChange,
  files, onFilesChange,
  compact,
  onValidationChange,
}) {
  const [query, setQuery] = React.useState(subject || "");
  const [stage, setStage] = React.useState(course ? "loaded" : "idle"); // idle|loaded|awaiting-confirmation|fetching|not-found|manual|upload
  const [draftTopics, setDraftTopics] = React.useState(null); // working copy while awaiting-confirmation: [{name,difficulty,importance,subtopics}]
  const [pendingRow, setPendingRow] = React.useState(null);    // the curriculum-store row behind the current confirmation
  const [manualText, setManualText] = React.useState("");
  const [manualRejected, setManualRejected] = React.useState([]); // [{line, reason}]
  const [manualChecking, setManualChecking] = React.useState(false);
  const [fetchFailed, setFetchFailed] = React.useState(false);
  const [addTopicText, setAddTopicText] = React.useState("");
  // Tracks the subject name a resolution is IN PROGRESS for — read here
  // instead of the `subject` prop, since onSubjectChange(name) is an async
  // state update on the parent and buildCourseDraft/confirmDraft must not
  // race a stale prop value from before that update propagates.
  const [resolvedName, setResolvedName] = React.useState(subject || "");

  // Reset whenever qualification context changes — never leave stale topics
  // attached to a different qualification/board.
  React.useEffect(() => {
    setStage(course ? "loaded" : "idle");
    setDraftTopics(null);
    setPendingRow(null);
    setFetchFailed(false);
  }, [countryId, qualificationId, board]);

  const reportValidity = (course2, noTopicList2, manualValid) => {
    const ok = !!(course2 && course2.topics && course2.topics.length) || !!noTopicList2 || (Array.isArray(manualValid) && manualValid.length > 0);
    if (onValidationChange) onValidationChange(ok);
  };

  // name is always an explicit parameter here, never read from `subject`
  // (prop) or `resolvedName` (state) — both are async and would be stale
  // read back inside the very handler that just set them.
  const buildCourseDraft = (name, row, verifiedByUser) => ({
    title: name, subject: name,
    curriculumRef: row.countryId ? { countryId: row.countryId, educationSystemId: row.educationSystemId || null, qualificationId: row.qualificationId, board: row.board || null, specVersion: row.specVersion || null } : null,
    topics: row.topics,
    knowledgeBase: { status: "empty", chapters: [], glossary: [], sourceFiles: [], extractedAt: null, updatedAt: null },
    source: row.source === "ai" ? "ai" : "official",
    verifiedByUser: !!verifiedByUser,
  });

  const searchOptions = React.useMemo(() => {
    if (!qualificationId || !query.trim()) return [];
    return (window.searchCurriculumSubjects ? window.searchCurriculumSubjects(countryId, qualificationId, board, query) : [])
      .map((r) => ({ label: r.subject, sublabel: r.source === "official" ? "Verified curriculum" : (r.verifiedByUser ? "Community-verified" : "AI-generated"), value: r.subject }));
  }, [countryId, qualificationId, board, query]);

  const resolveSubject = (name) => {
    onSubjectChange(name);
    setResolvedName(name);
    const row = window.getCurriculum ? window.getCurriculum(countryId, qualificationId, board, name) : null;
    if (row && (row.source === "official" || row.verifiedByUser)) {
      const draft = buildCourseDraft(name, row, true);
      onCourseChange(draft);
      setStage("loaded");
      reportValidity(draft, noTopicList, null);
    } else if (row) {
      setPendingRow(row);
      setDraftTopics(row.topics.map((t) => ({ ...t })));
      setStage("awaiting-confirmation");
      onCourseChange(null);
      reportValidity(null, noTopicList, null);
    } else {
      setStage("not-found");
      onCourseChange(null);
      reportValidity(null, noTopicList, null);
    }
  };

  const generateForMe = async () => {
    const name = resolvedName;
    setStage("fetching");
    setFetchFailed(false);
    const row = window.fetchAndCacheCurriculum ? await window.fetchAndCacheCurriculum(countryId, qualificationId, board, name, specVersion) : null;
    if (!row) {
      setStage("not-found");
      setFetchFailed(true);
      return;
    }
    setPendingRow(row);
    setDraftTopics(row.topics.map((t) => ({ ...t })));
    setStage("awaiting-confirmation");
  };

  const confirmDraft = () => {
    const row = { ...pendingRow, topics: draftTopics };
    const draft = buildCourseDraft(resolvedName, row, true);
    if (pendingRow && pendingRow.source === "ai" && window.markCurriculumVerified) {
      window.markCurriculumVerified(countryId, qualificationId, board, resolvedName, specVersion);
    }
    onCourseChange(draft);
    setStage("loaded");
    reportValidity(draft, noTopicList, null);
  };

  const removeDraftTopic = (i) => setDraftTopics((ts) => ts.filter((_, idx) => idx !== i));
  const addDraftTopic = () => {
    const name = addTopicText.trim();
    if (!name) return;
    setDraftTopics((ts) => [...ts, { name, difficulty: 5, importance: 5, subtopics: [] }]);
    setAddTopicText("");
  };

  const checkManualTopics = async () => {
    const lines = manualText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { setManualRejected([]); reportValidity(null, noTopicList, []); return; }
    setManualChecking(true);
    const { valid, rejected } = window.validateManualTopics ? await window.validateManualTopics(lines) : { valid: lines, rejected: [] };
    setManualChecking(false);
    setManualRejected(rejected);
    if (valid.length) {
      const draft = {
        title: query, subject: query, curriculumRef: null,
        topics: valid.map((name) => ({ name, difficulty: 5, importance: 5, subtopics: [] })),
        knowledgeBase: { status: "empty", chapters: [], glossary: [], sourceFiles: [], extractedAt: null, updatedAt: null },
        source: "ai", verifiedByUser: true,
      };
      onCourseChange(draft);
    } else {
      onCourseChange(null);
    }
    reportValidity(null, noTopicList, valid);
  };

  const toggleNoTopicList = (v) => {
    onNoTopicListChange(v);
    if (v) onCourseChange(null);
    reportValidity(course, v, null);
  };

  const pad = compact ? "var(--space-3)" : "var(--space-4)";
  const label = { fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)", margin: "0 0 var(--space-2)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div>
        <p style={label}>Subject</p>
        <window.Combobox
          value={query} placeholder="e.g. Chemistry"
          onChange={(v) => { setQuery(v); onSubjectChange(v); }}
          onSelect={(opt) => { setQuery(opt.value); resolveSubject(opt.value); }}
          options={searchOptions}
          loading={false}
          noMatchSlot={query.trim().length >= 2 ? (
            <div style={{ padding: "10px 12px" }}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); resolveSubject(query.trim()); }}
                style={{ border: "none", background: "transparent", color: "var(--indigo-600)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: "pointer", padding: 0, fontFamily: "var(--font-sans)" }}>
                Use "{query.trim()}" — I'll look for its syllabus →
              </button>
            </div>
          ) : null}
        />
      </div>

      {stage === "fetching" && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: pad, borderRadius: "var(--radius-xl)", background: "var(--indigo-50)" }}>
          <span aria-hidden="true" style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--indigo-200)", borderTopColor: "var(--indigo-600)", animation: "onb-spin 0.7s linear infinite" }} />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--indigo-700)" }}>Looking up the syllabus for {resolvedName}…</span>
        </div>
      )}

      {stage === "loaded" && course && (
        <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-subtle)", background: "var(--surface-card)", padding: pad }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>
              ✓ {course.topics.length} topics loaded {course.source === "official" ? "(verified curriculum)" : "(AI-generated)"}
            </span>
            <button type="button" onClick={() => { setStage("not-found"); onCourseChange(null); reportValidity(null, noTopicList, null); }}
              style={{ border: "none", background: "transparent", color: "var(--indigo-600)", fontSize: "var(--text-xs)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              Change source
            </button>
          </div>
          {!compact && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {course.topics.slice(0, 12).map((t, i) => (
                <span key={i} style={{ fontSize: "var(--text-xs)", padding: "4px 10px", borderRadius: "var(--radius-full)", background: "var(--surface-muted)", color: "var(--text-body)" }}>{t.name}</span>
              ))}
              {course.topics.length > 12 && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", padding: "4px 2px" }}>+{course.topics.length - 12} more</span>}
            </div>
          )}
        </div>
      )}

      {stage === "awaiting-confirmation" && draftTopics && (
        <div style={{ borderRadius: "var(--radius-xl)", border: "1.5px solid var(--indigo-200)", background: "var(--indigo-50)", padding: pad }}>
          <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--indigo-800)" }}>
            I found {draftTopics.length} topics for {resolvedName}. Take a look before I build your plan:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto", marginBottom: "var(--space-3)" }}>
            {draftTopics.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: "var(--radius-md)", background: "var(--surface-card)" }}>
                <span style={{ flex: 1, fontSize: "var(--text-sm)", color: "var(--text-body)" }}>{t.name}</span>
                <button type="button" onClick={() => removeDraftTopic(i)} aria-label="Remove topic"
                  style={{ border: "none", background: "transparent", color: "var(--text-faint)", cursor: "pointer", fontSize: 14, padding: 2 }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: "var(--space-3)" }}>
            <input type="text" value={addTopicText} onChange={(e) => setAddTopicText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDraftTopic(); } }}
              placeholder="+ Add a topic" style={{ flex: 1, padding: "8px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)" }} />
            <button type="button" onClick={addDraftTopic} style={{ padding: "8px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--surface-card)", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)" }}>Add</button>
          </div>
          <button type="button" onClick={confirmDraft} disabled={!draftTopics.length}
            style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-lg)", border: "none", background: draftTopics.length ? "var(--emerald-600)" : "var(--slate-300)", color: "white", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: draftTopics.length ? "pointer" : "default", fontFamily: "var(--font-sans)" }}>
            ✓ Looks correct — use this
          </button>
        </div>
      )}

      {stage === "not-found" && (
        <div style={{ borderRadius: "var(--radius-xl)", border: "1px dashed var(--border-default)", background: "var(--surface-muted)", padding: pad, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            {fetchFailed ? "Couldn't reach AI just now — try again, or use one of these:" : "My course isn't listed yet."}
          </p>
          <button type="button" onClick={generateForMe}
            style={{ textAlign: "left", padding: "10px 12px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", background: "var(--surface-card)", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)" }}>
            ✨ Generate it for me
          </button>
          <button type="button" onClick={() => setStage("upload")}
            style={{ textAlign: "left", padding: "10px 12px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", background: "var(--surface-card)", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)" }}>
            📤 Upload syllabus / paste topics
          </button>
          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: "var(--radius-lg)", cursor: "pointer", fontSize: "var(--text-sm)", color: "var(--text-body)" }}>
            <input type="checkbox" checked={!!noTopicList} onChange={(e) => toggleNoTopicList(e.target.checked)} />
            I don't have a topic list — build it automatically after I create this exam
          </label>
        </div>
      )}

      {stage === "upload" && (
        <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-subtle)", background: "var(--surface-card)", padding: pad, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <window.UploadZone files={files || []} copy={{ s4_upload: "Drop a syllabus/spec, or a photo of it", s4_upload_sub: "PDF, DOCX, PPTX, images — or use your camera below" }}
            onAdd={(fs) => onFilesChange([...(files || []), ...fs])}
            onRemove={(i) => onFilesChange((files || []).filter((_, j) => j !== i))} />
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--text-sm)", color: "var(--indigo-600)", cursor: "pointer", fontWeight: "var(--weight-medium)" }}>
            📷 Take a photo instead
            <input type="file" accept="image/*" capture="environment" style={{ display: "none" }}
              onChange={(e) => { if (e.target.files && e.target.files.length) onFilesChange([...(files || []), ...Array.from(e.target.files)]); e.target.value = ""; }} />
          </label>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>Or paste/type topics, one per line — I'll check each one is real</p>
            <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} rows={4}
              placeholder={"e.g.\nCell Biology\nGenetics\nEvolution"}
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", resize: "vertical" }} />
            {manualRejected.length > 0 && (
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                {manualRejected.map((r, i) => (
                  <p key={i} style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--red-600)" }}>"{r.line}" — {r.reason}</p>
                ))}
              </div>
            )}
            <button type="button" onClick={checkManualTopics} disabled={manualChecking || !manualText.trim()}
              style={{ marginTop: 8, padding: "8px 14px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", background: "var(--surface-muted)", cursor: manualChecking ? "default" : "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)" }}>
              {manualChecking ? "Checking…" : "Check topics"}
            </button>
          </div>
          {course && course.topics && course.topics.length > 0 && (
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--emerald-700)", fontWeight: "var(--weight-medium)" }}>✓ {course.topics.length} topics ready</p>
          )}
          <button type="button" onClick={() => setStage("not-found")}
            style={{ alignSelf: "flex-start", border: "none", background: "transparent", color: "var(--text-faint)", fontSize: "var(--text-xs)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}

window.CurriculumStep = CurriculumStep;
