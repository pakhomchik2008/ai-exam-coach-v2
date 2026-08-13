/**
 * Play control for IELTS Listening items. The script is spoken, never
 * shown, so the check is actually a listen — SpeechSynthesis, no vendor.
 */
import React from "react";
import { isSpeechSupported, speak, type SpeechController } from "../lib/speech";

export function ListenClip({
  script,
  locale = "en-GB",
  playLabel = "Play audio",
  stopLabel = "Stop",
  replayLabel = "Play again",
  fallbackHint = "Your browser can't play speech. Read the recording below.",
}: {
  script: string;
  locale?: string;
  playLabel?: string;
  stopLabel?: string;
  replayLabel?: string;
  fallbackHint?: string;
}) {
  const [playing, setPlaying] = React.useState(false);
  const [played, setPlayed] = React.useState(false);
  const ctrlRef = React.useRef<SpeechController | null>(null);

  const stop = () => {
    ctrlRef.current?.stop();
    ctrlRef.current = null;
    setPlaying(false);
  };

  React.useEffect(() => () => {
    ctrlRef.current?.stop();
    ctrlRef.current = null;
  }, [script]);

  if (!isSpeechSupported()) {
    return (
      <div className="listen-clip listen-clip--fallback" role="note">
        <p>{fallbackHint}</p>
        <p className="listen-clip-script">{script}</p>
      </div>
    );
  }

  const play = () => {
    ctrlRef.current?.stop();
    if (!script) return;
    setPlaying(true);
    ctrlRef.current = speak([script], locale, () => {
      setPlaying(false);
      setPlayed(true);
    });
  };

  return (
    <div className="listen-clip">
      <button type="button" className="listen-clip-btn" onClick={playing ? stop : play} aria-pressed={playing}>
        <span aria-hidden="true">{playing ? "■" : "▶"}</span>
        {playing ? stopLabel : played ? replayLabel : playLabel}
      </button>
    </div>
  );
}
