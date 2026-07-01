// AI Exam Coach — Session Recap: shown immediately after a study session.
// Two phases:
//   1. COVERAGE — the user tells us which of the exam's topics they actually
//      covered this session (the session's topic is pre-selected). This is the
//      real signal that moves mastery/readiness and auto-updates the exam's
//      "topics covered" — no more free progress from a slider you never earned.
//   2. CELEBRATION — the before/after summary, computed live from the coverage
//      the user just confirmed (readiness change, streak, achievements, XP).
function SessionRecap({ data, onClose, t }) {
  const { Button } = window.AIExamCoachDesignSystem_99e467;
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[(t && t.code) || "en"] || en);
  const d = data;
  const topics = Array.isArray(d.topics) ? d.topics : [];

  const mm = String(Math.floor(d.seconds / 60)).padStart(2, "0");
  const ss = String(d.seconds % 60).padStart(2, "0");

  // Pre-select the topic this session was actually about.
  const [selected, setSelected] = React.useState(() => {
    const init = {};
    if (d.sessionTopicIdx >= 0) init[d.sessionTopicIdx] = true;
    return init;
  });
  const [result, setResult] = React.useState(null); // set once coverage is committed → phase 2

  // AI chat summary — generated async from the session chat history
  const [chatSummary, setChatSummary] = React.useState(null);
  const [summaryLoading, setSummaryLoading] = React.useState(false);
  const chatMsgs = Array.isArray(d.chatMessages) ? d.chatMessages : [];
  const hadChat = chatMsgs.filter((m) => m.role === "user").length > 0;

  // Kick off summary generation as soon as coverage is committed (phase 2)
  const generateSummary = React.useCallback(async () => {
    if (!hadChat || chatSummary || summaryLoading) return;
    setSummaryLoading(true);
    try {
      const transcript = chatMsgs
        .filter((m) => m.role === "user" || m._real)
        .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
        .join("\n");
      const complete = window.brainComplete
        ? (a) => window.brainComplete(a)
        : (a) => window.claude.complete(a);
      const reply = await complete({
        system: "You summarise a study tutoring session in exactly 3 bullet points (each starting with •). Cover: what the student demonstrated they understand, what gaps or misconceptions were revealed, and one specific thing to review next time. Be concrete, max 15 words per bullet. Output ONLY the 3 bullets, nothing else.",
        messages: [{ role: "user", content: `Topic: ${d.topic}\nSubject: ${d.subject}\n\nConversation:\n${transcript}\n\nSummarise:` }],
      });
      setChatSummary(reply.trim());
    } catch {
      setChatSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [hadChat, chatSummary, summaryLoading]);

  const selectedIdxs = topics.filter((tp) => selected[tp.idx]).map((tp) => tp.idx);
  const toggle = (idx) => setSelected((m) => ({ ...m, [idx]: !m[idx] }));

  const commit = () => {
    const res = d.commitCoverage ? d.commitCoverage(selectedIdxs) : null;
    setResult(res || {});
    // Start generating the chat summary as soon as the user commits coverage
    generateSummary();
  };

  const wrap = { maxWidth: "var(--container-read)", margin: "0 auto", textAlign: "center", animation: "revealUp 0.4s ease-out" };
  const card = { borderRadius: "var(--radius-2xl)", background: "linear-gradient(135deg, var(--indigo-50), #FAF5FF)", border: "1px solid var(--border-subtle)", padding: "var(--space-8) var(--space-6)" };

  // ── PHASE 1: coverage ─────────────────────────────────────────────────────
  if (!result) {
    return (
      <div style={wrap}>
        <div style={card}>
          <p style={{ fontSize: 40, margin: "0 0 var(--space-2)" }}>✅</p>
          <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>
            {L("Nice work — what did you cover?", "Гарна робота — що ви пройшли?", "Отлично — что вы прошли?", "Bravo — qu'avez-vous couvert ?", "Gut gemacht — was hast du behandelt?")}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            {d.subject} · ⏱ {mm}:{ss}
          </p>

          <p style={{ margin: "var(--space-5) 0 var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text-body)", lineHeight: 1.5 }}>
            {L(
              `Tick every topic you actually studied. This updates your progress — ${selectedIdxs.length}/${topics.length} selected.`,
              `Позначте кожну тему, яку ви вивчали. Це оновить прогрес — обрано ${selectedIdxs.length}/${topics.length}.`,
              `Отметьте каждую тему, которую вы изучили. Это обновит прогресс — выбрано ${selectedIdxs.length}/${topics.length}.`,
              `Cochez chaque sujet étudié. Cela met à jour votre progression — ${selectedIdxs.length}/${topics.length} sélectionnés.`,
              `Markiere jedes gelernte Thema. Das aktualisiert deinen Fortschritt — ${selectedIdxs.length}/${topics.length} ausgewählt.`
            )}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", justifyContent: "center", marginBottom: "var(--space-3)" }}>
            {topics.map((tp) => {
              const on = !!selected[tp.idx];
              const isSession = tp.idx === d.sessionTopicIdx;
              return (
                <button
                  key={tp.idx}
                  onClick={() => toggle(tp.idx)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 13px", borderRadius: "var(--radius-full)", cursor: "pointer",
                    fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)",
                    border: on ? "2px solid var(--indigo-600)" : "1.5px solid var(--border-default)",
                    background: on ? "var(--indigo-600)" : "var(--surface-card)",
                    color: on ? "#fff" : "var(--text-body)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: 13 }}>{on ? "✓" : "＋"}</span>
                  {tp.name}
                  {isSession && <span style={{ fontSize: 10, opacity: 0.75 }}>· {L("this session", "ця сесія", "эта сессия", "cette séance", "diese Einheit")}</span>}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <Button variant="primary" size="lg" fullWidth onClick={commit} disabled={selectedIdxs.length === 0}>
              {selectedIdxs.length === 0
                ? L("Select at least one topic", "Оберіть хоча б одну тему", "Выберите хотя бы одну тему", "Sélectionnez au moins un sujet", "Wähle mindestens ein Thema")
                : `${L("Save what I covered", "Зберегти пройдене", "Сохранить пройденное", "Enregistrer", "Speichern")} (${selectedIdxs.length}) →`}
            </Button>
            <button onClick={onClose} style={{ border: "none", background: "transparent", color: "var(--text-faint)", fontSize: "var(--text-xs)", cursor: "pointer", fontFamily: "var(--font-sans)", padding: "var(--space-2)" }}>
              {L("Skip for now", "Пропустити", "Пропустить", "Ignorer", "Überspringen")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PHASE 2: celebration ──────────────────────────────────────────────────
  const r = result;
  // "Readiness change" is the honest, motivating number: how far this exam's
  // readiness actually moved from the coverage the user just confirmed. (The
  // target-probability delta is far harsher near zero and reads as "0%" even
  // when real learning happened, which is demoralising.)
  const readinessDelta = Math.round((r.readinessAfter || 0) - (r.readinessBefore || 0));
  const deltaSign = readinessDelta > 0 ? "+" : "";
  const deltaColor = readinessDelta > 0 ? "var(--emerald-600)" : readinessDelta < 0 ? "var(--red-500)" : "var(--text-muted)";
  const coveredNames = topics.filter((tp) => selected[tp.idx]).map((tp) => tp.name);

  const stats = [
    { label: L("Time studied", "Час", "Время", "Temps", "Zeit"), value: `${mm}:${ss}` },
    ...(d.quizTotal > 0 ? [{ label: L("Quiz accuracy", "Тест", "Тест", "Quiz", "Quiz"), value: `${d.quizCorrect}/${d.quizTotal}` }] : []),
    { label: L("Readiness", "Готовність", "Готовность", "Préparation", "Bereitschaft"), value: `${deltaSign}${readinessDelta}%`, color: deltaColor },
    { label: L("XP earned", "XP", "XP", "XP", "XP"), value: `+${r.xp}` },
  ];

  return (
    <div style={wrap}>
      <div style={card}>
        <p style={{ fontSize: 40, margin: "0 0 var(--space-2)" }}>🎉</p>
        <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", color: "var(--text-strong)" }}>{L("Session Complete!", "Сесію завершено!", "Сессия завершена!", "Séance terminée !", "Einheit fertig!")}</h1>
        <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          {coveredNames.length} {coveredNames.length === 1 ? L("topic", "тема", "тема", "sujet", "Thema") : L("topics", "тем", "тем", "sujets", "Themen")} · {d.subject}
        </p>

        <div style={{ marginTop: "var(--space-6)", display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: "var(--space-3)" }}>
          {stats.map((stat, i) => (
            <div key={i} style={{ borderRadius: "var(--radius-xl)", background: "#fff", border: "1px solid var(--border-subtle)", padding: "var(--space-3)" }}>
              <div style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)", fontFamily: "var(--font-mono)", color: stat.color || "var(--text-strong)" }}>{stat.value}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Topics covered — the auto-updated coverage the user just confirmed */}
        {coveredNames.length > 0 && (
          <div style={{ marginTop: "var(--space-4)", borderRadius: "var(--radius-xl)", background: "#fff", border: "1px solid var(--border-subtle)", padding: "var(--space-4)", textAlign: "left" }}>
            <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--indigo-600)" }}>
              {L("Marked as covered", "Позначено пройденим", "Отмечено пройденным", "Marqué comme couvert", "Als behandelt markiert")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {coveredNames.map((n, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: "var(--radius-full)", background: "var(--emerald-50, #ecfdf5)", color: "var(--emerald-700)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)" }}>✓ {n}</span>
              ))}
            </div>
          </div>
        )}

        {/* AI chat summary — shown if the student used the tutor chat */}
        {hadChat && (
          <div style={{ marginTop: "var(--space-4)", borderRadius: "var(--radius-xl)", background: "linear-gradient(135deg,#eef2ff,#f5f3ff)", border: "1px solid #c7d2fe", padding: "var(--space-4)", textAlign: "left" }}>
            <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--indigo-600)", display: "flex", alignItems: "center", gap: 6 }}>
              <span>🤖</span> AI Tutor Summary
            </p>
            {summaryLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                <span style={{ display: "flex", gap: 3 }}>
                  {[0,1,2].map((j) => <span key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: "#a5b4fc", display: "inline-block", animation: `loadDot 1.2s ${j*0.2}s ease-in-out infinite` }} />)}
                </span>
                Summarising your session...
              </div>
            )}
            {chatSummary && (
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-body)", lineHeight: 1.75, whiteSpace: "pre-line" }}>
                {chatSummary}
              </div>
            )}
            {!summaryLoading && !chatSummary && (
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                You had {chatMsgs.filter((m) => m.role === "user").length} exchanges with the AI tutor — summary unavailable offline.
              </p>
            )}
          </div>
        )}

        {r.streakAfter > r.streakBefore && (
          <div style={{ marginTop: "var(--space-4)", borderRadius: "var(--radius-xl)", background: "#fff7ed", border: "1px solid #fed7aa", padding: "var(--space-3) var(--space-4)", fontSize: "var(--text-sm)", color: "#9a3412", fontWeight: "var(--weight-semibold)" }}>
            🔥 {r.streakAfter}-{L("day streak — keep it going!", "денна серія — не зупиняйся!", "дневная серия — не останавливайся!", "jours d'affilée — continue !", "Tage-Serie — weiter so!")}
          </div>
        )}

        {(r.newAchievements || []).length > 0 && (
          <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {r.newAchievements.map((a) => (
              <div key={a.id} style={{ borderRadius: "var(--radius-xl)", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", padding: "var(--space-3) var(--space-4)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ fontSize: 20 }}>{a.emoji}</span>
                {L("Achievement unlocked", "Досягнення", "Достижение", "Succès débloqué", "Erfolg freigeschaltet")} — {a.label}
              </div>
            ))}
          </div>
        )}

        {d.nextFocus && (
          <div style={{ marginTop: "var(--space-4)", borderRadius: "var(--radius-xl)", background: "#fff", border: "1px solid var(--border-subtle)", padding: "var(--space-4)", textAlign: "left" }}>
            <p style={{ margin: "0 0 4px", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--indigo-600)" }}>{L("Next up", "Далі", "Далее", "Ensuite", "Als Nächstes")}</p>
            <p style={{ margin: 0, fontSize: "var(--text-base)", color: "var(--text-strong)" }}>{d.nextFocus.topic} · {d.nextFocus.subject}</p>
          </div>
        )}

        <div style={{ marginTop: "var(--space-6)" }}>
          <Button variant="primary" size="lg" fullWidth onClick={onClose}>{L("Back to Dashboard", "На головну", "На главную", "Retour au tableau", "Zurück")} →</Button>
        </div>
      </div>
    </div>
  );
}
window.SessionRecap = SessionRecap;
