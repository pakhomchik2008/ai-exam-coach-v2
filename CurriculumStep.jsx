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
  lang,
}) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[lang] || en);
  const [query, setQuery] = React.useState(subject || "");
  const [stage, setStage] = React.useState(course ? "loaded" : "idle"); // idle|loaded|awaiting-confirmation|fetching|not-found|manual|upload
  const [draftTopics, setDraftTopics] = React.useState(null); // working copy while awaiting-confirmation: [{name,difficulty,importance,subtopics}]
  const [pendingRow, setPendingRow] = React.useState(null);    // the curriculum-store row behind the current confirmation
  const [manualText, setManualText] = React.useState("");
  const [manualRejected, setManualRejected] = React.useState([]); // [{line, reason}]
  const [manualChecking, setManualChecking] = React.useState(false);
  const [fetchFailed, setFetchFailed] = React.useState(false);
  const [addTopicText, setAddTopicText] = React.useState("");
  const [urlInput, setUrlInput] = React.useState("");
  const [urlFetching, setUrlFetching] = React.useState(false);
  const [urlError, setUrlError] = React.useState(null);
  // Freeform, user-typed context for university-level modules (e.g.
  // "University of Warwick, Computer Systems Engineering, Year 1") — sharpens
  // the AI-generate prompt for a qualificationId ("uni") that on its own
  // carries none of the useful context a GCSE/A-Level board id does. NOT a
  // lookup against any institution database — we don't have one.
  const [uniContext, setUniContext] = React.useState("");
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
      .map((r) => ({
        label: r.subject, value: r.subject, known: r.source === "known",
        sublabel: r.source === "official" ? L("Verified curriculum", "Перевірена програма", "Проверенная программа", "Programme vérifié", "Verifizierter Lehrplan")
          : r.source === "known" ? L("Tap to build syllabus", "Натисніть, щоб скласти програму", "Нажмите, чтобы составить программу", "Appuyez pour créer le programme", "Tippen, um den Lehrplan zu erstellen")
          : (r.verifiedByUser ? L("Community-verified", "Перевірено спільнотою", "Проверено сообществом", "Vérifié par la communauté", "Von der Community verifiziert") : L("AI-generated", "Згенеровано AI", "Сгенерировано AI", "Généré par l'IA", "KI-generiert")),
      }));
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

  // Picking a KNOWN_SUBJECTS option (a real, ordinary subject name we don't
  // have cached topics for yet) skips the "not found" screen entirely and
  // goes straight to AI-generate — the whole point is that a completely
  // normal subject like Biology or Sociology should never look like a dead
  // end. Still checks the cache first in case someone already generated and
  // confirmed this exact combo, so it doesn't regenerate needlessly.
  const selectKnownSubject = (name) => {
    onSubjectChange(name);
    setResolvedName(name);
    const row = window.getCurriculum ? window.getCurriculum(countryId, qualificationId, board, name) : null;
    if (row && (row.source === "official" || row.verifiedByUser)) {
      const draft = buildCourseDraft(name, row, true);
      onCourseChange(draft);
      setStage("loaded");
      reportValidity(draft, noTopicList, null);
      return;
    }
    if (row) {
      setPendingRow(row);
      setDraftTopics(row.topics.map((t) => ({ ...t })));
      setStage("awaiting-confirmation");
      onCourseChange(null);
      reportValidity(null, noTopicList, null);
      return;
    }
    generateForMe(name);
  };

  // name is an explicit param (not read from resolvedName state) so this can
  // be called immediately after selecting a KNOWN_SUBJECTS option, before
  // resolvedName's setState from that same click has actually landed.
  const generateForMe = async (nameArg) => {
    const name = nameArg || resolvedName;
    setStage("fetching");
    setFetchFailed(false);
    const row = window.fetchAndCacheCurriculum ? await window.fetchAndCacheCurriculum(countryId, qualificationId, board, name, specVersion, uniContext) : null;
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

  // URL import (Phase 6) — fetches the page server-side (api/fetch-url.js,
  // SSRF-guarded) then extracts topics the same way an AI-generated syllabus
  // is extracted. Lands in the SAME awaiting-confirmation panel as
  // generateForMe — a fetched page is never written into a Course without
  // the user clicking "Looks correct" first.
  const importFromUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;
    setUrlFetching(true);
    setUrlError(null);
    const text = window.fetchUrlText ? await window.fetchUrlText(url) : null;
    if (!text || !text.trim()) {
      setUrlFetching(false);
      setUrlError(L("Couldn't fetch that page — check the link and try again.", "Не вдалося завантажити сторінку — перевірте посилання і спробуйте ще раз.", "Не удалось загрузить страницу — проверьте ссылку и попробуйте снова.", "Impossible de charger cette page — vérifiez le lien et réessayez.", "Diese Seite konnte nicht geladen werden — Link prüfen und erneut versuchen."));
      return;
    }
    const name = resolvedName || query;
    const topics = window.extractTopicsFromText ? await window.extractTopicsFromText(name, text) : null;
    setUrlFetching(false);
    if (!topics) {
      setUrlError(L("Couldn't find a topic list on that page.", "Не вдалося знайти список тем на цій сторінці.", "Не удалось найти список тем на этой странице.", "Impossible de trouver une liste de sujets sur cette page.", "Auf dieser Seite konnte keine Themenliste gefunden werden."));
      return;
    }
    setPendingRow({ source: "ai" });
    setDraftTopics(topics.map((t) => ({ ...t })));
    setStage("awaiting-confirmation");
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
        <p style={label}>{L("Subject", "Предмет", "Предмет", "Matière", "Fach")}</p>
        <window.Combobox
          value={query} placeholder={L("e.g. Chemistry", "напр. Хімія", "напр. Химия", "ex. Chimie", "z. B. Chemie")}
          onChange={(v) => {
            setQuery(v);
            onSubjectChange(v);
            // Any manual retype invalidates whatever we last resolved (or
            // failed to resolve) — otherwise a stale "not found" panel from
            // an earlier attempt stays visible underneath the open dropdown
            // while the user is still typing a different subject.
            if (stage !== "idle") {
              setStage("idle");
              setDraftTopics(null);
              setPendingRow(null);
              setFetchFailed(false);
              onCourseChange(null);
              reportValidity(null, noTopicList, null);
            }
          }}
          onSelect={(opt) => { setQuery(opt.value); if (opt.known) selectKnownSubject(opt.value); else resolveSubject(opt.value); }}
          options={searchOptions}
          loading={false}
          noMatchSlot={stage === "idle" && query.trim().length >= 2 ? (
            <div style={{ padding: "10px 12px" }}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); resolveSubject(query.trim()); }}
                style={{ border: "none", background: "transparent", color: "var(--indigo-600)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: "pointer", padding: 0, fontFamily: "var(--font-sans)" }}>
                {L(`Use "${query.trim()}" — I'll look for its syllabus →`, `Використати «${query.trim()}» — я знайду його програму →`, `Использовать «${query.trim()}» — я найду его программу →`, `Utiliser « ${query.trim()} » — je vais chercher son programme →`, `„${query.trim()}" verwenden — ich suche den Lehrplan →`)}
              </button>
            </div>
          ) : null}
        />
      </div>

      {stage === "fetching" && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: pad, borderRadius: "var(--radius-xl)", background: "var(--indigo-50)" }}>
          <span aria-hidden="true" style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--indigo-200)", borderTopColor: "var(--indigo-600)", animation: "onb-spin 0.7s linear infinite" }} />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--indigo-700)" }}>{L(`Looking up the syllabus for ${resolvedName}…`, `Шукаю програму для ${resolvedName}…`, `Ищу программу для ${resolvedName}…`, `Recherche du programme pour ${resolvedName}…`, `Suche den Lehrplan für ${resolvedName}…`)}</span>
        </div>
      )}

      {stage === "loaded" && course && (
        <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-subtle)", background: "var(--surface-card)", padding: pad }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--text-strong)" }}>
              ✓ {L(`${course.topics.length} topics loaded`, `${course.topics.length} тем завантажено`, `${course.topics.length} тем загружено`, `${course.topics.length} sujets chargés`, `${course.topics.length} Themen geladen`)} {course.source === "official" ? L("(verified curriculum)", "(перевірена програма)", "(проверенная программа)", "(programme vérifié)", "(verifizierter Lehrplan)") : L("(AI-generated)", "(згенеровано AI)", "(сгенерировано AI)", "(généré par l'IA)", "(KI-generiert)")}
            </span>
            <button type="button" onClick={() => { setStage("not-found"); onCourseChange(null); reportValidity(null, noTopicList, null); }}
              style={{ border: "none", background: "transparent", color: "var(--indigo-600)", fontSize: "var(--text-xs)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
              {L("Change source", "Змінити джерело", "Изменить источник", "Changer de source", "Quelle ändern")}
            </button>
          </div>
          {!compact && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {course.topics.slice(0, 12).map((t, i) => (
                <span key={i} style={{ fontSize: "var(--text-xs)", padding: "4px 10px", borderRadius: "var(--radius-full)", background: "var(--surface-muted)", color: "var(--text-body)" }}>{t.name}</span>
              ))}
              {course.topics.length > 12 && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", padding: "4px 2px" }}>{L(`+${course.topics.length - 12} more`, `+${course.topics.length - 12} ще`, `+${course.topics.length - 12} ещё`, `+${course.topics.length - 12} de plus`, `+${course.topics.length - 12} weitere`)}</span>}
            </div>
          )}
        </div>
      )}

      {stage === "awaiting-confirmation" && draftTopics && (
        <div style={{ borderRadius: "var(--radius-xl)", border: "1.5px solid var(--indigo-200)", background: "var(--indigo-50)", padding: pad }}>
          <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--indigo-800)" }}>
            {L(`I found ${draftTopics.length} topics for ${resolvedName}. Take a look before I build your plan:`,
              `Я знайшов ${draftTopics.length} тем для ${resolvedName}. Перегляньте перед тим, як я складу план:`,
              `Я нашёл ${draftTopics.length} тем для ${resolvedName}. Просмотрите перед тем, как я составлю план:`,
              `J'ai trouvé ${draftTopics.length} sujets pour ${resolvedName}. Jetez un œil avant que je crée votre plan :`,
              `Ich habe ${draftTopics.length} Themen für ${resolvedName} gefunden. Schau sie dir an, bevor ich deinen Plan erstelle:`)}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto", marginBottom: "var(--space-3)" }}>
            {draftTopics.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: "var(--radius-md)", background: "var(--surface-card)" }}>
                <span style={{ flex: 1, fontSize: "var(--text-sm)", color: "var(--text-body)" }}>{t.name}</span>
                <button type="button" onClick={() => removeDraftTopic(i)} aria-label={L("Remove topic", "Видалити тему", "Удалить тему", "Supprimer le sujet", "Thema entfernen")}
                  style={{ border: "none", background: "transparent", color: "var(--text-faint)", cursor: "pointer", fontSize: 14, padding: 2 }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: "var(--space-3)" }}>
            <input type="text" value={addTopicText} onChange={(e) => setAddTopicText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDraftTopic(); } }}
              placeholder={L("+ Add a topic", "+ Додати тему", "+ Добавить тему", "+ Ajouter un sujet", "+ Thema hinzufügen")} style={{ flex: 1, padding: "8px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)" }} />
            <button type="button" onClick={addDraftTopic} style={{ padding: "8px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "var(--surface-card)", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)" }}>{L("Add", "Додати", "Добавить", "Ajouter", "Hinzufügen")}</button>
          </div>
          <button type="button" onClick={confirmDraft} disabled={!draftTopics.length}
            style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-lg)", border: "none", background: draftTopics.length ? "var(--emerald-600)" : "var(--slate-300)", color: "white", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)", cursor: draftTopics.length ? "pointer" : "default", fontFamily: "var(--font-sans)" }}>
            ✓ {L("Looks correct — use this", "Виглядає правильно — використати", "Выглядит правильно — использовать", "C'est correct — utiliser ceci", "Sieht richtig aus — das verwenden")}
          </button>
        </div>
      )}

      {stage === "not-found" && (
        <div style={{ borderRadius: "var(--radius-xl)", border: "1px dashed var(--border-default)", background: "var(--surface-muted)", padding: pad, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            {fetchFailed ? L("Couldn't reach AI just now — try again, or use one of these:", "Не вдалося зв'язатися з AI — спробуйте ще раз або оберіть один із варіантів:", "Не удалось связаться с AI — попробуйте снова или выберите один из вариантов:", "Impossible de contacter l'IA — réessayez ou utilisez l'une de ces options :", "Die KI konnte gerade nicht erreicht werden — versuche es erneut oder nutze eine dieser Optionen:")
              : L("My course isn't listed yet.", "Мого курсу ще немає в списку.", "Моего курса ещё нет в списке.", "Mon cours n'est pas encore répertorié.", "Mein Kurs ist noch nicht gelistet.")}
          </p>
          {qualificationId === "uni" && (
            <div>
              <input type="text" value={uniContext} onChange={(e) => setUniContext(e.target.value)}
                placeholder={L("University / programme (optional) — e.g. Warwick, Computer Systems Engineering, Year 1", "Університет / програма (необов'язково) — напр. Warwick, Computer Systems Engineering, 1 курс", "Университет / программа (необязательно) — напр. Warwick, Computer Systems Engineering, 1 курс", "Université / programme (facultatif) — ex. Warwick, Computer Systems Engineering, 1ère année", "Universität / Programm (optional) — z. B. Warwick, Computer Systems Engineering, 1. Jahr")}
                style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)" }} />
              <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{L("Helps the AI guess get closer — still needs your confirmation either way.", "Допомагає AI вгадати точніше — все одно потрібне ваше підтвердження.", "Помогает AI угадать точнее — всё равно нужно ваше подтверждение.", "Aide l'IA à mieux deviner — votre confirmation reste nécessaire.", "Hilft der KI, näher zu raten — deine Bestätigung ist trotzdem nötig.")}</p>
            </div>
          )}
          <button type="button" onClick={generateForMe}
            style={{ textAlign: "left", padding: "10px 12px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", background: "var(--surface-card)", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)" }}>
            ✨ {L("Generate it for me", "Згенерувати для мене", "Сгенерировать для меня", "Générer pour moi", "Für mich generieren")}
          </button>
          <button type="button" onClick={() => setStage("upload")}
            style={{ textAlign: "left", padding: "10px 12px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", background: "var(--surface-card)", cursor: "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", color: "var(--text-strong)" }}>
            📤 {L("Upload syllabus / paste topics", "Завантажити програму / вставити теми", "Загрузить программу / вставить темы", "Importer le programme / coller les sujets", "Lehrplan hochladen / Themen einfügen")}
          </button>
          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: "var(--radius-lg)", cursor: "pointer", fontSize: "var(--text-sm)", color: "var(--text-body)" }}>
            <input type="checkbox" checked={!!noTopicList} onChange={(e) => toggleNoTopicList(e.target.checked)} />
            {L("I don't have a topic list — build it automatically after I create this exam", "У мене немає списку тем — складіть його автоматично після створення іспиту", "У меня нет списка тем — составьте его автоматически после создания экзамена", "Je n'ai pas de liste de sujets — créez-la automatiquement après la création de cet examen", "Ich habe keine Themenliste — erstelle sie automatisch, nachdem ich diese Prüfung angelegt habe")}
          </label>
        </div>
      )}

      {stage === "upload" && (
        <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-subtle)", background: "var(--surface-card)", padding: pad, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <window.UploadZone files={files || []} copy={{
              s4_upload: L("Drop a syllabus/spec, or a photo of it", "Перетягніть програму/специфікацію або її фото", "Перетащите программу/спецификацию или её фото", "Déposez un programme/une spécification, ou une photo de celui-ci", "Lehrplan/Spezifikation ablegen, oder ein Foto davon"),
              s4_upload_sub: L("PDF, DOCX, PPTX, images — or use your camera below", "PDF, DOCX, PPTX, зображення — або скористайтеся камерою нижче", "PDF, DOCX, PPTX, изображения — или используйте камеру ниже", "PDF, DOCX, PPTX, images — ou utilisez votre appareil photo ci-dessous", "PDF, DOCX, PPTX, Bilder — oder nutze unten deine Kamera"),
            }}
            onAdd={(fs) => onFilesChange([...(files || []), ...fs])}
            onRemove={(i) => onFilesChange((files || []).filter((_, j) => j !== i))} />
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--text-sm)", color: "var(--indigo-600)", cursor: "pointer", fontWeight: "var(--weight-medium)" }}>
            📷 {L("Take a photo instead", "Зробити фото натомість", "Сделать фото вместо этого", "Prendre une photo à la place", "Stattdessen ein Foto machen")}
            <input type="file" accept="image/*" capture="environment" style={{ display: "none" }}
              onChange={(e) => { if (e.target.files && e.target.files.length) onFilesChange([...(files || []), ...Array.from(e.target.files)]); e.target.value = ""; }} />
          </label>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{L("Or paste a link to the official specification/syllabus page", "Або вставте посилання на офіційну сторінку специфікації/програми", "Или вставьте ссылку на официальную страницу спецификации/программы", "Ou collez un lien vers la page officielle de spécification/programme", "Oder füge einen Link zur offiziellen Spezifikations-/Lehrplanseite ein")}</p>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://..." style={{ flex: 1, padding: "8px 10px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)" }} />
              <button type="button" onClick={importFromUrl} disabled={urlFetching || !urlInput.trim()}
                style={{ padding: "8px 14px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", background: "var(--surface-muted)", cursor: urlFetching ? "default" : "pointer", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}>
                {urlFetching ? L("Fetching…", "Завантаження…", "Загрузка…", "Récupération…", "Wird geladen…") : L("Import", "Імпортувати", "Импортировать", "Importer", "Importieren")}
              </button>
            </div>
            {urlError && <p style={{ margin: "6px 0 0", fontSize: "var(--text-xs)", color: "var(--red-600)" }}>{urlError}</p>}
          </div>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{L("Or paste/type topics, one per line — I'll check each one is real", "Або вставте/введіть теми, по одній на рядок — я перевірю кожну", "Или вставьте/введите темы, по одной на строку — я проверю каждую", "Ou collez/tapez les sujets, un par ligne — je vérifierai chacun", "Oder füge Themen ein/tippe sie, eins pro Zeile — ich prüfe jedes")}</p>
            <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} rows={4}
              placeholder={L("e.g.\nCell Biology\nGenetics\nEvolution", "напр.\nКлітинна біологія\nГенетика\nЕволюція", "напр.\nКлеточная биология\nГенетика\nЭволюция", "ex.\nBiologie cellulaire\nGénétique\nÉvolution", "z. B.\nZellbiologie\nGenetik\nEvolution")}
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
              {manualChecking ? L("Checking…", "Перевірка…", "Проверка…", "Vérification…", "Wird geprüft…") : L("Check topics", "Перевірити теми", "Проверить темы", "Vérifier les sujets", "Themen prüfen")}
            </button>
          </div>
          {course && course.topics && course.topics.length > 0 && (
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--emerald-700)", fontWeight: "var(--weight-medium)" }}>✓ {L(`${course.topics.length} topics ready`, `${course.topics.length} тем готово`, `${course.topics.length} тем готово`, `${course.topics.length} sujets prêts`, `${course.topics.length} Themen bereit`)}</p>
          )}
          <button type="button" onClick={() => setStage("not-found")}
            style={{ alignSelf: "flex-start", border: "none", background: "transparent", color: "var(--text-faint)", fontSize: "var(--text-xs)", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
            ← {L("Back", "Назад", "Назад", "Retour", "Zurück")}
          </button>
        </div>
      )}
    </div>
  );
}

window.CurriculumStep = CurriculumStep;
