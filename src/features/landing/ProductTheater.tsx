/**
 * 30-second product theater. Three CSS scenes (predictor / practice / chat)
 * because we do not have a filmed trailer yet (Decision Log #49).
 */
import React from "react";

type ProductTheaterProps = {
  labels: { predictor: string; practice: string; chat: string };
};

export function ProductTheater({ labels }: ProductTheaterProps) {
  const [scene, setScene] = React.useState(0);
  const scenes = [
    { id: "predictor", label: labels.predictor },
    { id: "practice", label: labels.practice },
    { id: "chat", label: labels.chat },
  ] as const;

  React.useEffect(() => {
    const id = window.setInterval(() => setScene((s) => (s + 1) % 3), 4200);
    return () => window.clearInterval(id);
  }, []);

  const current = scenes[scene] ?? scenes[0];

  return (
    <div className="land-theater">
      <div className="land-theater-frame" data-scene={current.id}>
        {scene === 0 && (
          <div className="land-scene land-scene-predictor">
            <p className="land-scene-kicker">NMT · 47d</p>
            <p className="land-scene-score">176</p>
            <svg viewBox="0 0 240 64" aria-hidden="true">
              <path d="M4 52 C 40 50, 80 46, 120 32 S 200 14, 236 10" fill="none" stroke="#F3D062" strokeWidth="2" />
            </svg>
          </div>
        )}
        {scene === 1 && (
          <div className="land-scene land-scene-practice">
            <p className="land-scene-q">f(x) = x² − 4x + 3. Roots?</p>
            <ul>
              <li>1 and 3</li>
              <li className="is-on">1 and 4</li>
              <li>−1 and 3</li>
            </ul>
          </div>
        )}
        {scene === 2 && (
          <div className="land-scene land-scene-chat">
            <p className="land-bubble land-bubble-ai">The vertex is at x = 2. Complete the square, don’t expand again.</p>
            <p className="land-bubble land-bubble-me">Show the step after −4x.</p>
          </div>
        )}
      </div>
      <div className="land-theater-dots" role="tablist" aria-label="demo">
        {scenes.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === scene}
            className={i === scene ? "is-on" : ""}
            onClick={() => {
              setScene(i);
              window.playSound?.("select");
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
