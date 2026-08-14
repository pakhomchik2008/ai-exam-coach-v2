/**
 * Phase 4 sound kit. One play path so autoplay policy, the Settings
 * default-off flag, and Capacitor haptics stay in the same function.
 *
 * Files live in /public/sounds (wav + mp3). MP3 preferred; wav is the
 * fallback when ffmpeg wasn't around at generate time.
 */
export const SOUND_NAMES = [
  "tap",
  "select",
  "correct",
  "wrong",
  "complete",
  "level",
] as const;

export type SoundName = (typeof SOUND_NAMES)[number];

type ProfileReader = {
  getProfile?: () => { soundsEnabled?: boolean; soundVolume?: number; hapticEnabled?: boolean };
};

const cache: Partial<Record<SoundName, HTMLAudioElement>> = {};

function profileSoundsOn(): boolean {
  try {
    return (window as unknown as ProfileReader).getProfile?.()?.soundsEnabled === true;
  } catch {
    return false;
  }
}

function profileVolume(): number {
  try {
    const v = (window as unknown as ProfileReader).getProfile?.()?.soundVolume;
    return typeof v === "number" && v >= 0 && v <= 1 ? v : 0.7;
  } catch {
    return 0.7;
  }
}

function profileHaptic(): boolean {
  try {
    return (window as unknown as ProfileReader).getProfile?.()?.hapticEnabled !== false;
  } catch {
    return true;
  }
}

function srcFor(name: SoundName): string {
  // WAV is the source of truth. MP3 is generated when ffmpeg is present;
  // browsers play WAV fine and the files are tiny (tap is 1 KB).
  return `/sounds/${name}.wav`;
}

function elementFor(name: SoundName): HTMLAudioElement {
  const hit = cache[name];
  if (hit) return hit;
  const audio = new Audio(srcFor(name));
  audio.preload = "auto";
  audio.addEventListener("error", () => {
    audio.src = `/sounds/${name}.wav`;
  }, { once: true });
  cache[name] = audio;
  return audio;
}

function haptic(name: SoundName): void {
  if (!profileHaptic()) return;
  try {
    const cap = (window as unknown as {
      Capacitor?: { Plugins?: { Haptics?: { impact?: (opts: { style: string }) => void } } };
    }).Capacitor;
    const style = name === "wrong" || name === "complete" || name === "level" ? "Medium" : "Light";
    cap?.Plugins?.Haptics?.impact?.({ style });
  } catch {
    // web, or Capacitor not installed yet (Phase 5)
  }
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      const ms = name === "wrong" || name === "level" ? 24 : 10;
      navigator.vibrate(ms);
    }
  } catch {
    // desktop Safari has no vibrate
  }
}

function play(name: SoundName): void {
  try {
    const audio = elementFor(name);
    audio.volume = profileVolume();
    audio.currentTime = 0;
    const maybe = audio.play();
    if (maybe && typeof maybe.catch === "function") {
      void maybe.catch(() => {
        // autoplay blocked or missing file — never block the UI
      });
    }
  } catch {
    // jsdom implements play() as a sync throw ("Not implemented")
  }
  haptic(name);
}

/** Honours Settings. Default off. */
export function playSound(name: SoundName): void {
  if (!profileSoundsOn()) return;
  play(name);
}

/** Settings preview — ignores the toggle so you can hear the kit before enabling. */
export function previewSound(name: SoundName): void {
  play(name);
}

export function soundsEnabled(): boolean {
  return profileSoundsOn();
}

Object.assign(window, { playSound, previewSound, SOUND_NAMES, soundsEnabled });
