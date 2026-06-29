// AI Exam Coach — Mission briefing screen shown before the study timer.
// Replaces the "jump straight to a timer" pattern: the student sees WHAT
// they're about to study, WHY today, and HOW long — then chooses to begin.

function TodaysMission({ session, course, onBegin, onSkip, t }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const { Button } = window.AIExamCoachDesignSystem_99e467;

  const difficultyLabel = [null, L("Easy","Легко","Легко","Facile","Leicht"), L("Medium","Середньо","Средне","Moyen","Mittel"), L("Hard","Складно","Сложно","Difficile","Schwer")][session.difficulty || 2] || "Medium";
  const difficultyColor = session.difficulty <= 1 ? "var(--emerald-600)" : session.difficulty >= 3 ? "var(--red-500)" : "var(--amber-600)";

  const estMinutes = session.est || 45;
  const mastery = course ? course.readinessPct : 50;
  const probability = course ? course.gradeProbability : 50;

  // "Why today?" reasoning — picks the most relevant reason
  const whyToday = React.useMemo(() => {
    if (!course) return L("This topic is scheduled for today in your AI plan.","Ця тема запланована на сьогодні.","Эта тема запланирована на сегодня.","Ce sujet est prévu pour aujourd'hui.","Dieses Thema ist für heute geplant.");
    if (course.riskLevel === "high") return L(
      `${course.name} has high risk — studying today keeps you on track to reach your ${course.targetGrade} target.`,
      `${course.name} має високий ризик — заняття сьогодні допоможе досягти ${course.targetGrade}.`,
      `${course.name} имеет высокий риск — занятие сегодня поможет достичь ${course.targetGrade}.`,
      `${course.name} est à haut risque — étudier aujourd'hui vous rapproche de votre objectif ${course.targetGrade}.`,
      `${course.name} hat hohes Risiko — heute lernen hält Sie auf Kurs für ${course.targetGrade}.`
    );
    if (course.paceStatus === "slightly_behind" || course.paceStatus === "very_behind") return L(
      `You're slightly behind schedule on ${course.name}. This session helps close the gap before your exam in ${course.daysAway} days.`,
      `Ви трохи відстаєте з ${course.name}. Ця сесія допоможе наздогнати.`,
      `Вы немного отстаёте по ${course.name}. Эта сессия поможет наверстать.`,
      `Vous êtes légèrement en retard sur ${course.name}. Cette séance comblera l'écart.`,
      `Sie liegen bei ${course.name} leicht zurück. Diese Sitzung hilft aufzuholen.`
    );
    return L(
      `Spaced repetition scheduled this topic today to strengthen long-term retention of ${course.name}.`,
      `Інтервальне повторення запланувало цю тему для зміцнення запам'ятовування.`,
      `Интервальное повторение запланировало эту тему для укрепления запоминания.`,
      `La répétition espacée a planifié ce sujet pour renforcer la rétention à long terme.`,
      `Verteilte Wiederholung hat dieses Thema geplant, um die Langzeitretention zu stärken.`
    );
  }, [course]);

  const objectives = [
    L("Review key concepts","Повторити ключові концепції","Повторить ключевые концепции","Revoir les concepts clés","Schlüsselkonzepte wiederholen"),
    L("Practice active recall","Тренувати активне пригадування","Тренировать активное вспоминание","Pratiquer le rappel actif","Aktives Erinnern üben"),
    L("Self-assess understanding","Самооцінка розуміння","Самооценка понимания","Auto-évaluer la compréhension","Verständnis selbst bewerten"),
  ];

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", fontFamily: "var(--font-sans)" }}>
      {/* Mission header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          {window.CoachIcon ? <window.CoachIcon size={28} /> : null}
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--indigo-600)" }}>
            {L("Today's Mission","Місія на сьогодні","Миссия на сегодня","Mission du jour","Heutige Mission")}
          </span>
        </div>
        <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, color: "var(--text-strong)" }}>{session.topic}</h1>
        <p style={{ margin: 0, fontSize: 15, color: session.color || "var(--text-muted)", fontWeight: 600 }}>{session.subject}</p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        <div style={{ textAlign: "center", padding: "12px 8px", borderRadius: "var(--radius-lg)", background: "var(--surface-card)", border: "1px solid var(--border-default)" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-strong)", fontFamily: "var(--font-mono)" }}>{estMinutes}m</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase" }}>{L("Est. time","Час","Время","Durée","Dauer")}</div>
        </div>
        <div style={{ textAlign: "center", padding: "12px 8px", borderRadius: "var(--radius-lg)", background: "var(--surface-card)", border: "1px solid var(--border-default)" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-strong)", fontFamily: "var(--font-mono)" }}>{mastery}%</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase" }}>{L("Mastery","Майстерність","Мастерство","Maîtrise","Meisterung")}</div>
        </div>
        <div style={{ textAlign: "center", padding: "12px 8px", borderRadius: "var(--radius-lg)", background: "var(--surface-card)", border: "1px solid var(--border-default)" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: difficultyColor }}>{difficultyLabel}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase" }}>{L("Difficulty","Складність","Сложность","Difficulté","Schwierigkeit")}</div>
        </div>
        <div style={{ textAlign: "center", padding: "12px 8px", borderRadius: "var(--radius-lg)", background: "var(--surface-card)", border: "1px solid var(--border-default)" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: probability >= 60 ? "var(--emerald-600)" : "var(--amber-600)", fontFamily: "var(--font-mono)" }}>{probability}%</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase" }}>{L("Target prob.","Ймов.","Вероятн.","Probabilité","Wahrscheinl.")}</div>
        </div>
      </div>

      {/* Objectives */}
      <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", background: "var(--surface-card)", padding: 16, marginBottom: 20 }}>
        <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-faint)" }}>
          {L("Session objectives","Цілі сесії","Цели сессии","Objectifs de la séance","Sitzungsziele")}
        </p>
        {objectives.map((obj, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none" }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--indigo-50)", color: "var(--indigo-600)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontSize: 13, color: "var(--text-body)" }}>{obj}</span>
          </div>
        ))}
      </div>

      {/* Why today */}
      <div style={{ borderRadius: "var(--radius-xl)", background: "linear-gradient(135deg, var(--indigo-50), #FAF5FF)", border: "1px solid var(--border-subtle)", padding: 16, marginBottom: 28 }}>
        <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "var(--indigo-600)" }}>
          💡 {L("Why today?","Чому сьогодні?","Почему сегодня?","Pourquoi aujourd'hui ?","Warum heute?")}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-body)", lineHeight: 1.5 }}>{whyToday}</p>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={onSkip} style={{
          flex: "0 0 auto", padding: "14px 24px", borderRadius: "var(--radius-xl)",
          border: "1px solid var(--border-default)", background: "var(--surface-card)",
          color: "var(--text-muted)", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)",
        }}>
          {L("Skip","Пропустити","Пропустить","Passer","Überspringen")}
        </button>
        <button onClick={onBegin} style={{
          flex: 1, padding: "14px 24px", borderRadius: "var(--radius-xl)",
          border: "none", background: "linear-gradient(135deg, var(--indigo-600), #7c3aed)",
          color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)",
          boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
        }}>
          {L("Begin Session","Розпочати сесію","Начать сессию","Commencer la séance","Sitzung beginnen")} →
        </button>
      </div>
    </div>
  );
}
window.TodaysMission = TodaysMission;
