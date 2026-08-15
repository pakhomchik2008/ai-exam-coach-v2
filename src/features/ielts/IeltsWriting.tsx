/**
 * IELTS Writing studio. Student writes; Claude marks four criteria
 * and snaps an overall band. Exam Sim runs Task 1 then Task 2.
 */
import React from "react";
import { WaitPress } from "../../components/WaitPress";
import { sanitizeSvg } from "../../lib/svg-sanitize";
import {
  IELTS_WRITING,
  snapBand,
  wordCount,
  writingScorePrompt,
  writingTaskPrompt,
  type IeltsModule,
  type IeltsRunMode,
} from "../../lib/ielts-paper";

type TaskPaper = {
  task: 1 | 2;
  title: string;
  instructions: string;
  minWords: number;
  svg?: string;
};

type Band = {
  overall: number;
  task: number;
  cohesion: number;
  lexical: number;
  grammar: number;
  why: string;
  improve: string[];
};

function L(t: { code?: string } | undefined, en: string, uk: string, ru: string, fr: string, de: string): string {
  return ({ en, uk, ru, fr, de } as Record<string, string>)[t?.code || "en"] || en;
}

type Win = Window & {
  brainCompleteJSON: (a: unknown) => Promise<unknown>;
};

async function completeJson(system: string, user: string, ms = 45000): Promise<unknown> {
  const to = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));
  return Promise.race([
    (window as unknown as Win).brainCompleteJSON({
      system, messages: [{ role: "user", content: user }], paperQual: "ielts",
    }),
    to,
  ]);
}

export function IeltsWriting({
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
  const minutes = mode === "exam" ? IELTS_WRITING.exam.minutes : IELTS_WRITING.practice.minutes;
  const [phase, setPhase] = React.useState<"load" | "write" | "mark" | "done">("load");
  const [error, setError] = React.useState<string | null>(null);
  const [papers, setPapers] = React.useState<TaskPaper[]>([]);
  const [idx, setIdx] = React.useState(0);
  const [drafts, setDrafts] = React.useState<string[]>([""]);
  const [bands, setBands] = React.useState<(Band | null)[]>([]);
  const [practiceTask, setPracticeTask] = React.useState<1 | 2>(1);
  const [timeLeft, setTimeLeft] = React.useState(minutes * 60);

  React.useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const tasks = mode === "exam" ? [1, 2] as const : [practiceTask];
        const got: TaskPaper[] = [];
        for (const task of tasks) {
          const p = await completeJson(writingTaskPrompt({ module, task }), `Task ${task}`) as TaskPaper;
          if (!p || !p.instructions) throw new Error("bad task");
          got.push({
            task: p.task || task,
            title: p.title || `Task ${task}`,
            instructions: p.instructions,
            minWords: p.minWords || (task === 2 ? 250 : 150),
            ...(p.svg ? { svg: p.svg } : {}),
          });
        }
        if (dead) return;
        setPapers(got);
        setDrafts(got.map(() => ""));
        setBands(got.map(() => null));
        setTimeLeft(minutes * 60);
        setPhase("write");
      } catch (e) {
        if (!dead) {
          setError((e as Error).message || "fail");
          setPhase("write");
        }
      }
    })();
    return () => { dead = true; };
  }, [mode, module, practiceTask, minutes]);

  React.useEffect(() => {
    if (phase !== "write") return undefined;
    const id = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) { setPhase("done"); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const paper = papers[idx];
  const draft = drafts[idx] || "";
  const words = wordCount(draft);
  const svg = paper?.svg ? sanitizeSvg(paper.svg) : null;

  const submit = async () => {
    if (!paper) return;
    setPhase("mark");
    try {
      const raw = await completeJson(writingScorePrompt({
        module, task: paper.task, instructions: paper.instructions, essay: draft, words, minWords: paper.minWords,
      }), "Score this script.") as Band;
      const band: Band = {
        overall: snapBand(Number(raw.overall)),
        task: snapBand(Number(raw.task)),
        cohesion: snapBand(Number(raw.cohesion)),
        lexical: snapBand(Number(raw.lexical)),
        grammar: snapBand(Number(raw.grammar)),
        why: raw.why || "",
        improve: Array.isArray(raw.improve) ? raw.improve.slice(0, 4) : [],
      };
      setBands((b) => { const n = b.slice(); n[idx] = band; return n; });
      if (idx + 1 < papers.length) {
        setIdx(idx + 1);
        setPhase("write");
      } else {
        setPhase("done");
      }
    } catch {
      setError("mark-fail");
      setPhase("write");
    }
  };

  if (phase === "load") {
    return (
      <WaitPress
        title={L(t, "Setting the writing task...", "Готуємо writing...", "Готовим writing...", "Préparation du writing...", "Writing wird vorbereitet...")}
        lang={t?.code ?? "en"}
      />
    );
  }

  if (phase === "mark") {
    return (
      <WaitPress
        title={L(t, "Examiner is marking...", "Екзаменатор перевіряє...", "Экзаменатор проверяет...", "Correction en cours...", "Wird bewertet...")}
        lang={t?.code ?? "en"}
      />
    );
  }

  if (error && !paper) {
    return (
      <div className="ielts-paper">
        <p>{L(t, "Couldn't set the task.", "Не вдалося поставити тему.", "Не удалось поставить тему.", "Impossible de créer la tâche.", "Aufgabe fehlgeschlagen.")}</p>
        <button type="button" className="ielts-paper-btn" onClick={onExit}>←</button>
      </div>
    );
  }

  if (phase === "done") {
    const shown = bands.filter(Boolean) as Band[];
    const mean = shown.length ? snapBand(shown.reduce((s, b) => s + b.overall, 0) / shown.length) : 0;
    return (
      <div className="ielts-paper ielts-paper--done">
        <p className="ielts-band-kicker">Writing · {module === "gt" ? "GT" : "Academic"}</p>
        <h2 className="ielts-band">{mean.toFixed(1)}</h2>
        <p>{L(t, "Overall band", "Загальний банд", "Общий балл", "Bande globale", "Gesamtband")}</p>
        {shown.map((b, i) => (
          <div key={i} className="ielts-band-card">
            <p className="ielts-band-task">Task {papers[i]?.task} · {b.overall.toFixed(1)}</p>
            <ul className="ielts-band-grid">
              <li>Task {b.task.toFixed(1)}</li>
              <li>Cohesion {b.cohesion.toFixed(1)}</li>
              <li>Lexical {b.lexical.toFixed(1)}</li>
              <li>Grammar {b.grammar.toFixed(1)}</li>
            </ul>
            <p>{b.why}</p>
            {b.improve.length > 0 && (
              <ul>{b.improve.map((x) => <li key={x}>{x}</li>)}</ul>
            )}
          </div>
        ))}
        <button type="button" className="ielts-paper-btn" onClick={onExit}>{L(t, "Done", "Готово", "Готово", "Terminé", "Fertig")}</button>
      </div>
    );
  }

  return (
    <div className="ielts-paper">
      <header className="ielts-paper-bar">
        <button type="button" className="ielts-paper-back" onClick={onExit}>←</button>
        <span>Writing Task {paper?.task} · {module === "gt" ? "GT" : "Academic"}</span>
        <span className="ielts-paper-clock">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}</span>
        <span>{words}/{paper?.minWords || 0} {L(t, "words", "слів", "слов", "mots", "Wörter")}</span>
      </header>
      {mode !== "exam" && (
        <div className="ielts-task-switch">
          {([1, 2] as const).map((n) => (
            <button key={n} type="button" className={practiceTask === n ? "is-on" : ""} onClick={() => { setPracticeTask(n); setPhase("load"); }}>
              Task {n}
            </button>
          ))}
        </div>
      )}
      <div className="ielts-write">
        <aside className="ielts-prompt">
          <p className="ielts-passage-kicker">{paper?.title}</p>
          {svg && <div className="ielts-chart" dangerouslySetInnerHTML={{ __html: svg }} />}
          <p>{paper?.instructions}</p>
        </aside>
        <textarea
          className="ielts-essay"
          value={draft}
          onChange={(e) => setDrafts((d) => { const n = d.slice(); n[idx] = e.target.value; return n; })}
          placeholder={L(t, "Write here…", "Пиши тут…", "Пиши здесь…", "Écris ici…", "Schreib hier…")}
        />
      </div>
      <button
        type="button"
        className="ielts-paper-btn"
        disabled={words < 20}
        onClick={submit}
      >
        {L(t, "Submit for a band →", "Здати на банд →", "Сдать на балл →", "Envoyer pour la bande →", "Abgeben →")}
      </button>
    </div>
  );
}
