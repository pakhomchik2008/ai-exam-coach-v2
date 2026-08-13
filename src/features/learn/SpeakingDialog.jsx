// IELTS / TOEFL Speaking — cue card, mic, Whisper, band grade.
// Mic audio goes to /api/transcribe. The OpenAI key never ships to the client.

import { renderCoachMarkdown } from "../../lib/math-render";
import { WaitPress } from "../../components/WaitPress";
import { ListenClip } from "../../components/ListenClip";
import { describeAiError } from "../../lib/ai-error";
import { transcribeAudio, pickRecorderMime } from "../../lib/transcribe";
import {
  buildSpeakingCueSystem,
  buildSpeakingGradeSystem,
  buildSpeakingGradeUser,
  fallbackSpeakingBand,
  parseSpeakingBand,
  parseSpeakingCue,
} from "./speaking";

function md(text) {
  return renderCoachMarkdown(text);
}

function examQual(resolved) {
  if (!resolved || !window.getExams) return "ielts";
  const exam = window.getExams().find((e) => e.id === resolved.examId);
  return (window.examQualificationId && window.examQualificationId(exam)) || (exam && exam.qualificationId) || "ielts";
}

export function SpeakingDialog({ topic, onExit, t, onPassed }) {
  const L = (en, uk, ru, fr, de) => ({ en, uk, ru, fr, de }[t?.code] || en);
  const [cue, setCue] = React.useState(null);
  const [cueError, setCueError] = React.useState(null);
  const [recording, setRecording] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [transcript, setTranscript] = React.useState("");
  const [band, setBand] = React.useState(null);
  const recRef = React.useRef(null);
  const chunksRef = React.useRef([]);
  const tickRef = React.useRef(null);
  const grantedRef = React.useRef(false);
  const aliveRef = React.useRef(true);
  const resolved = React.useMemo(
    () => (window.resolveTopicForBrain ? window.resolveTopicForBrain(topic) : null),
    [topic],
  );
  const qual = examQual(resolved);
  const canRecord = typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;

  async function loadCue() {
    const complete = window.brainComplete || ((a) => window.claude.complete(a));
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 45000));
    const raw = await Promise.race([
      complete({
        system: buildSpeakingCueSystem(topic, qual),
        messages: [{ role: "user", content: `Cue card for: ${topic}` }],
        paperQual: qual,
        includeContext: false,
      }),
      timeout,
    ]);
    const parsed = window.parseJSON ? window.parseJSON(raw) : raw;
    return parseSpeakingCue(parsed ?? raw);
  }

  function cueFailMessage(e) {
    return e && e.status ? describeAiError(e, t?.code) : L(
      "Could not load a cue card.",
      "Не вдалося завантажити картку.",
      "Не удалось загрузить карточку.",
      "Carte impossible à charger.",
      "Karte konnte nicht geladen werden.",
    );
  }

  React.useEffect(() => {
    loadCue().then((next) => {
      if (aliveRef.current) setCue(next);
    }).catch((e) => {
      if (aliveRef.current) setCueError(cueFailMessage(e));
    });
    return () => { aliveRef.current = false; stopRecorder(true); };
  }, [topic]);

  function stopRecorder(silent) {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    const rec = recRef.current;
    recRef.current = null;
    if (rec && rec.state !== "inactive") rec.stop();
    if (!silent) setRecording(false);
  }

  async function toggleRecord() {
    if (recording) {
      stopRecorder(false);
      return;
    }
    setError(null); setBand(null); setTranscript("");
    const mime = pickRecorderMime();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunksRef.current.push(ev.data); };
    rec.onstop = () => {
      stream.getTracks().forEach((tr) => tr.stop());
      if (!aliveRef.current) return;
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
      if (!blob.size) return;
      gradeBlob(blob);
    };
    rec.start();
    recRef.current = rec;
    setRecording(true);
    setSeconds(0);
    tickRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= 90) { stopRecorder(false); return 90; }
        return s + 1;
      });
    }, 1000);
  }

  async function gradeOnce(text, cueTitle) {
    const complete = window.brainComplete || ((a) => window.claude.complete(a));
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 45000));
    const raw = await Promise.race([
      complete({
        system: buildSpeakingGradeSystem(topic, qual),
        messages: [{ role: "user", content: buildSpeakingGradeUser(text, cueTitle) }],
        paperQual: qual,
        includeContext: false,
      }),
      timeout,
    ]);
    const parsed = window.parseJSON ? window.parseJSON(raw) : raw;
    return parseSpeakingBand(parsed ?? raw);
  }

  async function gradeBlob(blob) {
    setBusy(true); setError(null);
    try {
      const text = await transcribeAudio(blob, "en");
      setTranscript(text);
      let next;
      try {
        next = await gradeOnce(text, cue.title);
      } catch {
        try {
          next = await gradeOnce(text, cue.title);
        } catch {
          next = fallbackSpeakingBand("");
        }
      }
      setBand(next);
      if (!grantedRef.current) {
        grantedRef.current = true;
        if (window.addXp) window.addXp(50);
        if (resolved && window.recordReview) {
          window.recordReview({
            examId: resolved.examId, topicIdx: resolved.topicIdx,
            topicName: resolved.topicName, correct: next.overall >= 6,
          });
        }
        if (next.overall >= 6 && onPassed) onPassed(next);
      }
    } catch (e) {
      const timedOut = e && e.message === "timeout";
      const fromServer = e && typeof e.status === "number" ? describeAiError(e, t?.code) : null;
      setError(fromServer || (timedOut
        ? L("Took too long — try again.", "Це тривало занадто довго — спробуйте ще.", "Это длилось слишком долго — попробуйте ещё.", "Trop long — réessayez.", "Zu lange — nochmal.")
        : (e && e.message) || L("Could not grade that — try again.", "Не вдалося оцінити — спробуйте ще.", "Не удалось оценить — попробуйте ещё.", "Notation impossible — réessayez.", "Bewertung fehlgeschlagen — nochmal.")));
    } finally {
      setBusy(false);
    }
  }

  async function newExercise() {
    setBusy(true); setError(null); setBand(null); setTranscript(""); setCue(null); setCueError(null);
    try {
      const next = await loadCue();
      if (aliveRef.current) setCue(next);
    } catch (e) {
      if (aliveRef.current) setCueError(cueFailMessage(e));
    } finally {
      if (aliveRef.current) setBusy(false);
    }
  }

  const wrap = (children) => React.createElement("div", {
    style: { maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px", fontFamily: "var(--font-sans)", color: "var(--text-body)" },
  }, children);
  const header = React.createElement("div", { key: "hdr", style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 } },
    React.createElement("button", { onClick: onExit, style: { background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)", padding: 0 } }, "←"),
    React.createElement("span", { style: { fontSize: 11, textTransform: "uppercase", color: "var(--text-faint)", letterSpacing: "0.08em", fontWeight: 600 } },
      L("Speaking", "Говоріння", "Говорение", "Expression orale", "Sprechen")),
  );

  if (cueError) return wrap([header, React.createElement("p", { key: "e", style: { color: "var(--red-600)" } }, cueError)]);
  if (!cue) return wrap([header, React.createElement(WaitPress, { key: "w", title: L("Preparing a cue card…", "Готуємо картку…", "Готовим карточку…", "Préparation…", "Karte…"), lang: t?.code })]);

  if (band) {
    return wrap([
      header,
      React.createElement("div", { key: "g", style: { padding: 16, borderRadius: 14, border: "1px solid var(--border-default)", background: "var(--surface-card)" } },
        React.createElement("div", { style: { fontSize: 11, textTransform: "uppercase", color: "var(--text-faint)", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 } },
          L("You said", "Ти сказав", "Ты сказал", "Tu as dit", "Du sagtest")),
        React.createElement("div", { style: { fontSize: 16, lineHeight: 1.55, color: "var(--text-strong)", marginBottom: 18 } },
          transcript.trim() || L("(silence)", "(тиша)", "(тишина)", "(silence)", "(Stille)")),
        React.createElement("div", { style: { fontSize: 11, textTransform: "uppercase", color: "var(--text-faint)", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 } },
          L("Band", "Бал", "Балл", "Note", "Note")),
        React.createElement("div", { style: { fontSize: 36, fontWeight: 800, lineHeight: 1, marginBottom: 14, color: "var(--text-strong)", fontFamily: "var(--font-mono)" } },
          Number(band.overall).toFixed(1)),
        React.createElement("div", { style: { fontSize: 16, lineHeight: 1.55 }, dangerouslySetInnerHTML: { __html: md(band.feedback) } }),
        React.createElement("button", {
          type: "button",
          disabled: busy,
          onClick: newExercise,
          style: { marginTop: 18, padding: "12px 24px", borderRadius: 999, background: "var(--indigo-600)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" },
        }, L("New exercise", "Нова вправа", "Новое упражнение", "Nouvel exercice", "Neue Übung"))),
    ]);
  }

  return wrap([
    header,
    React.createElement("h1", { key: "t", style: { margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "var(--text-strong)" } }, cue.title),
    React.createElement("p", { key: "p", style: { margin: "0 0 12px", fontSize: 16, lineHeight: 1.55 }, dangerouslySetInnerHTML: { __html: md(cue.prompt) } }),
    cue.bullets.length > 0 && React.createElement("ul", { key: "b", style: { margin: "0 0 16px", paddingLeft: 20 } },
      ...cue.bullets.map((line, i) => React.createElement("li", { key: i, style: { marginBottom: 4 } }, line))),
    React.createElement(ListenClip, {
      key: "listen",
      script: [cue.prompt, ...cue.bullets].join(". "),
      locale: "en-GB",
      playLabel: L("Hear the cue", "Прослухати картку", "Прослушать карточку", "Écouter la carte", "Karte hören"),
      stopLabel: L("Stop", "Стоп", "Стоп", "Stop", "Stop"),
      replayLabel: L("Play again", "Ще раз", "Ещё раз", "Encore", "Nochmal"),
    }),
    React.createElement("p", { key: "hint", style: { fontSize: 12, color: "var(--text-faint)", margin: "12px 0" } },
      L("Speak 45–90 seconds. Whisper writes what you said. Pronunciation is inferred from the transcript, not the sound wave.",
        "Говоріть 45–90 секунд. Whisper запише текст. Вимова — з транскрипту, не з хвилі.",
        "Говорите 45–90 секунд. Whisper запишет текст. Произношение — из транскрипта, не из волны.",
        "Parle 45–90 s. Whisper transcrit. La prononciation est déduite du texte.",
        "Sprich 45–90 s. Whisper schreibt mit. Aussprache nur aus dem Text.")),
    canRecord
      ? React.createElement("button", {
        key: "mic",
        type: "button",
        disabled: busy,
        onClick: toggleRecord,
        style: { padding: "12px 20px", borderRadius: 12, border: "none", background: recording ? "var(--red-500)" : "var(--indigo-600)", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" },
      }, recording
        ? L(`Stop · ${seconds}s`, `Стоп · ${seconds}с`, `Стоп · ${seconds}с`, `Stop · ${seconds}s`, `Stop · ${seconds}s`)
        : L("Record answer", "Записати відповідь", "Записать ответ", "Enregistrer", "Antwort aufnehmen"))
      : React.createElement("p", { key: "nomics", style: { color: "var(--red-600)" } },
        L("This browser has no microphone access.", "Цей браузер не дає мікрофон.", "Этот браузер не даёт микрофон.", "Pas de micro.", "Kein Mikrofon.")),
    busy && React.createElement(WaitPress, { key: "w2", title: L("Transcribing and grading…", "Розпізнаємо й оцінюємо…", "Распознаём и оцениваем…", "Пароль…", "Transkript…"), lang: t?.code, compact: true }),
    error && React.createElement("p", { key: "err", style: { color: "var(--red-600)" } }, error),
  ]);
}
