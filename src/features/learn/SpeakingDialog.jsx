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
  const [marked, setMarked] = React.useState(false);
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

  React.useEffect(() => {
    const complete = window.brainComplete || ((a) => window.claude.complete(a));
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 45000));
    Promise.race([
      complete({
        system: buildSpeakingCueSystem(topic, qual),
        messages: [{ role: "user", content: `Cue card for: ${topic}` }],
        paperQual: qual,
      }),
      timeout,
    ]).then((raw) => {
      const parsed = window.parseJSON ? window.parseJSON(raw) : raw;
      setCue(parseSpeakingCue(parsed ?? raw));
    }).catch((e) => {
      setCueError(e && e.status ? describeAiError(e, t?.code) : L(
        "Could not load a cue card.",
        "Не вдалося завантажити картку.",
        "Не удалось загрузить карточку.",
        "Carte impossible à charger.",
        "Karte konnte nicht geladen werden.",
      ));
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

  async function gradeBlob(blob) {
    setBusy(true); setError(null);
    const complete = window.brainComplete || ((a) => window.claude.complete(a));
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 45000));
    try {
      const text = await transcribeAudio(blob, "en");
      setTranscript(text);
      const raw = await Promise.race([
        complete({
          system: buildSpeakingGradeSystem(topic, qual),
          messages: [{ role: "user", content: text }],
          paperQual: qual,
        }),
        timeout,
      ]);
      const parsed = window.parseJSON ? window.parseJSON(raw) : raw;
      setBand(parseSpeakingBand(parsed ?? raw));
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

  function markAsRead() {
    if (grantedRef.current || marked || !band) return;
    grantedRef.current = true;
    setMarked(true);
    if (window.addXp) window.addXp(50);
    if (resolved && window.recordReview) {
      window.recordReview({ examId: resolved.examId, topicIdx: resolved.topicIdx, topicName: resolved.topicName, correct: band.overall >= 6 });
    }
    if (band.overall >= 6 && onPassed) onPassed(band);
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
    transcript && React.createElement("div", { key: "tr", style: { marginTop: 16, padding: 12, background: "var(--surface-muted)", borderRadius: 10, fontSize: 14, lineHeight: 1.55 } },
      React.createElement("div", { style: { fontSize: 11, textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 6 } }, L("Transcript", "Транскрипт", "Транскрипт", "Transcription", "Transkript")),
      transcript),
    band && React.createElement("div", { key: "g", style: { marginTop: 18, padding: 16, borderRadius: 14, border: "1px solid var(--border-default)", background: "var(--surface-card)" } },
      React.createElement("div", { style: { fontWeight: 700, marginBottom: 8, fontFamily: "var(--font-mono)" } },
        `${band.overall} · F ${band.fluency} · L ${band.lexical} · G ${band.grammar} · P ${band.pronunciation}`),
      React.createElement("div", { dangerouslySetInnerHTML: { __html: md(band.feedback) } }),
      band.gaps.length > 0 && React.createElement("ul", { style: { margin: "10px 0 0", paddingLeft: 18 } },
        ...band.gaps.map((g, i) => React.createElement("li", { key: i, dangerouslySetInnerHTML: { __html: md(g) } }))),
      marked
        ? React.createElement("div", { style: { marginTop: 14, color: "var(--emerald-600)", fontWeight: 600 } }, "+50 XP")
        : React.createElement("button", {
          type: "button",
          onClick: markAsRead,
          style: { marginTop: 14, padding: "12px 24px", borderRadius: 999, background: "var(--indigo-600)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)" },
        }, L("Got it · +50 XP", "Зрозумів · +50 XP", "Понял · +50 XP", "Compris · +50 XP", "Verstanden · +50 XP"))),
  ]);
}
