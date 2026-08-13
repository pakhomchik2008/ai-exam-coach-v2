/**
 * IELTS Reading paper: passage stays on screen, questions sit beside it.
 * Practice = one passage. Exam Sim = three passages, 40 items, 60 minutes.
 */
import React from "react";
import { WaitPress } from "../../components/WaitPress";
import {
  answersMatch,
  IELTS_READING,
  normalizeTfng,
  readingPrompt,
  type IeltsModule,
  type IeltsRunMode,
  type TfngValue,
} from "../../lib/ielts-paper";

type ReadingQ = {
  type: "tfng" | "mcq" | "fill";
  question: string;
  options?: string[];
  correct?: number | string;
  answer?: string;
  accept?: string[];
  explanation?: string;
};

type Passage = { title: string; text: string; questions: ReadingQ[] };

function parseJson(raw: string): unknown {
  const w = window as unknown as { parseJSON?: (s: string) => unknown };
  if (w.parseJSON) return w.parseJSON(raw);
  return JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
}

function L(t: { code?: string } | undefined, en: string, uk: string, ru: string, fr: string, de: string): string {
  return ({ en, uk, ru, fr, de } as Record<string, string>)[t?.code || "en"] || en;
}

export function IeltsReading({
  mode,
  module,
  onExit,
  t,
}: {
  mode: IeltsRunMode;
  module: IeltsModule;
  onExit: () => void;
  t?: { code?: string };
}) {
  const spec = IELTS_READING[mode === "quick" ? "quick" : mode === "exam" ? "exam" : "practice"];
  const [phase, setPhase] = React.useState<"load" | "run" | "done">("load");
  const [error, setError] = React.useState<string | null>(null);
  const [passages, setPassages] = React.useState<Passage[]>([]);
  const [qIdx, setQIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<(string | number | null)[]>([]);
  const [revealed, setRevealed] = React.useState(false);
  const [fill, setFill] = React.useState("");
  const [timeLeft, setTimeLeft] = React.useState(spec.minutes * 60);
  const revealEach = mode !== "exam";

  React.useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const complete = (window as unknown as { brainComplete: (a: unknown) => Promise<string> }).brainComplete;
        const per = mode === "exam" ? [13, 13, 14] : [spec.questions];
        const jobs = per.map((n, i) => {
          const system = readingPrompt({
            mode, module, passageIndex: i + 1, passageCount: per.length, questionCount: n,
          });
          const to = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 45000));
          return Promise.race([
            complete({ system, messages: [{ role: "user", content: `Write passage ${i + 1}.` }] }),
            to,
          ]).then((raw) => {
            const p = parseJson(raw) as Passage;
            if (!p || !p.text || !Array.isArray(p.questions) || !p.questions.length) throw new Error("bad passage");
            return p;
          });
        });
        const got = (await Promise.all(jobs)).filter(Boolean);
        if (dead) return;
        if (!got.length) throw new Error("empty");
        setPassages(got);
        setAnswers(got.flatMap((p) => p.questions.map(() => null)));
        setPhase("run");
      } catch (e) {
        if (!dead) {
          setError((e as Error).message || "fail");
          setPhase("run");
        }
      }
    })();
    return () => { dead = true; };
  }, [mode, module, spec.questions]);

  React.useEffect(() => {
    if (phase !== "run" || spec.minutes <= 0) return undefined;
    const id = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) { setPhase("done"); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, spec.minutes]);

  const flat = passages.flatMap((p, pi) => p.questions.map((q, qi) => ({ p, pi, q, qi })));
  const cur = flat[qIdx];
  const globalOffset = (pi: number) => passages.slice(0, pi).reduce((n, p) => n + p.questions.length, 0);

  const mark = (value: string | number) => {
    if (!cur || revealed) return;
    const gi = globalOffset(cur.pi) + cur.qi;
    setAnswers((a) => { const n = a.slice(); n[gi] = value; return n; });
    if (revealEach) setRevealed(true);
  };

  const isCorrect = (item: typeof cur, value: string | number | null): boolean => {
    if (!item || value == null) return false;
    if (item.q.type === "tfng") return normalizeTfng(value) === normalizeTfng(item.q.correct);
    if (item.q.type === "fill") return answersMatch(String(value), item.q.answer || "", item.q.accept);
    return Number(value) === Number(item.q.correct);
  };

  const advanceFrom = (gi: number, value?: string | number) => {
    const nextVal = value !== undefined ? value : answers[gi];
    if (nextVal == null && cur?.q.type === "fill" && fill.trim()) {
      setAnswers((a) => { const n = a.slice(); n[gi] = fill.trim(); return n; });
    }
    setRevealed(false);
    setFill("");
    if (qIdx + 1 >= flat.length) setPhase("done");
    else {
      setQIdx(qIdx + 1);
    }
  };

  if (phase === "load") {
    return (
      <WaitPress
        title={L(t, "Printing the reading paper...", "Друкуємо reading...", "Печатаем reading...", "Préparation du reading...", "Reading wird gesetzt...")}
        lang={t?.code ?? "en"}
      />
    );
  }

  if (error || !cur) {
    return (
      <div className="ielts-paper">
        <p>{L(t, "Couldn't build the passage.", "Не вдалося зібрати текст.", "Не удалось собрать текст.", "Impossible de générer le texte.", "Text konnte nicht erzeugt werden")}</p>
        <button type="button" className="ielts-paper-btn" onClick={onExit}>{L(t, "Back", "Назад", "Назад", "Retour", "Zurück")}</button>
      </div>
    );
  }

  if (phase === "done") {
    const total = flat.length;
    const correct = flat.filter((item, i) => isCorrect(item, answers[i] ?? null)).length;
    return (
      <div className="ielts-paper ielts-paper--done">
        <h2>{correct}/{total}</h2>
        <p>{L(t, "Reading section done.", "Reading секцію здано.", "Reading секцию сдали.", "Reading terminé.", "Reading fertig.")}</p>
        <button type="button" className="ielts-paper-btn" onClick={onExit}>{L(t, "Done", "Готово", "Готово", "Terminé", "Fertig")}</button>
      </div>
    );
  }

  const gi = globalOffset(cur.pi) + cur.qi;
  const mmss = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`;
  const paras = cur.p.text.split(/\n\s*\n/);

  return (
    <div className="ielts-paper">
      <header className="ielts-paper-bar">
        <button type="button" className="ielts-paper-back" onClick={onExit}>←</button>
        <span>Reading · {module === "gt" ? "GT" : "Academic"} · {qIdx + 1}/{flat.length}</span>
        {spec.minutes > 0 && <span className="ielts-paper-clock">{mmss}</span>}
      </header>
      <div className="ielts-read">
        <article className="ielts-passage">
          <p className="ielts-passage-kicker">Passage {cur.pi + 1}{passages.length > 1 ? ` / ${passages.length}` : ""}</p>
          <h3>{cur.p.title}</h3>
          {paras.map((para, i) => <p key={i}>{para}</p>)}
        </article>
        <section className="ielts-q">
          <p className="ielts-q-label">{L(t, "Questions", "Питання", "Вопросы", "Questions", "Fragen")}</p>
          <p className="ielts-q-stem">{cur.q.question}</p>
          {cur.q.type === "tfng" && (
            <div className="ielts-tfng">
              {(["true", "false", "ng"] as TfngValue[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={revealed}
                  className="ielts-tfng-btn"
                  onClick={() => mark(v)}
                >
                  {v === "ng" ? "Not Given" : v === "true" ? "True" : "False"}
                </button>
              ))}
            </div>
          )}
          {cur.q.type === "mcq" && (cur.q.options || []).map((opt, i) => (
            <button key={i} type="button" disabled={revealed} className="ielts-opt" onClick={() => mark(i)}>
              {["A", "B", "C", "D"][i]} · {opt}
            </button>
          ))}
          {cur.q.type === "fill" && (
            <div className="ielts-fill">
              <input value={fill} onChange={(e) => setFill(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && fill.trim()) mark(fill.trim()); }} />
              <button type="button" className="ielts-paper-btn" disabled={!fill.trim() || revealed} onClick={() => mark(fill.trim())}>
                {L(t, "Check", "Перевірити", "Проверить", "Vérifier", "Prüfen")}
              </button>
            </div>
          )}
          {revealed && (
            <p className="ielts-explain">
              {isCorrect(cur, answers[gi] ?? null) ? "✓ " : "✗ "}
              {cur.q.explanation}
            </p>
          )}
          {(revealed || (!revealEach && answers[gi] != null)) && (
            <button type="button" className="ielts-paper-btn" onClick={() => advanceFrom(gi)}>
              {qIdx + 1 >= flat.length ? L(t, "Finish", "Завершити", "Завершить", "Terminer", "Fertig") : L(t, "Next →", "Далі →", "Дальше →", "Suivant →", "Weiter →")}
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
