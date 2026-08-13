// AI Exam Coach — Web Speech API narration for the Learn theory reader
// (Phase 3.7d). SpeechSynthesis is a built-in browser API — no vendor, no
// server round-trip, no per-play cost. Voice quality varies by OS (native
// voices on macOS/iOS/Windows sound decent, Chrome-on-Linux is rougher),
// but it's the only zero-cost option that works offline in every locale
// the app supports.
//
// The Learn tab picks the utterance language from the profile ui code:
// mapUiLangToLocale() turns the app's "en"/"uk"/"ru"/"fr"/"de" into the
// BCP-47 tag the browser uses to pick a voice ("en-US", "uk-UA", etc.),
// then chooseVoice() prefers a voice that matches that tag exactly, then
// same-language different-region, and finally the browser default.
//
// Cancellation is important: SpeechSynthesis is a single-track global on
// window.speechSynthesis, so a reader that leaves without calling stop()
// keeps talking on the next page. Every start() call cancels the current
// queue first, and the returned stop() lets the component unmount tear
// the utterance down synchronously.

const UI_TO_BCP47: Record<string, string> = {
  en: "en-US",
  uk: "uk-UA",
  ru: "ru-RU",
  fr: "fr-FR",
  de: "de-DE",
};

export function mapUiLangToLocale(uiLang: string | null | undefined): string {
  if (!uiLang) return UI_TO_BCP47.en!;
  return UI_TO_BCP47[uiLang] || UI_TO_BCP47.en!;
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance !== "undefined";
}

function chooseVoice(locale: string): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;
  const localeLower = locale.toLowerCase();
  const langOnly = localeLower.split("-")[0];
  // 1. Exact BCP-47 match ("uk-UA")
  const exact = voices.find((v) => v.lang.toLowerCase() === localeLower);
  if (exact) return exact;
  // 2. Same base language, any region ("uk", "uk-*")
  const sameLang = voices.find((v) => v.lang.toLowerCase().startsWith(langOnly + "-") || v.lang.toLowerCase() === langOnly);
  if (sameLang) return sameLang;
  // 3. Browser default
  return voices[0] || null;
}

// Strip LaTeX / markdown / HTML from the text handed to the TTS engine —
// otherwise it literally reads "dollar sign x caret two dollar sign"
// instead of "x squared". Cheap-and-cheerful sweep; a proper LaTeX→speech
// pass would need a real parser and isn't worth it for a listen-along
// nice-to-have.
export function textForSpeech(input: string): string {
  if (!input) return "";
  let s = String(input);
  // KaTeX $$block$$ and $inline$ — drop the delimiters, then strip common
  // TeX commands to their argument.
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, " $1 ");
  s = s.replace(/\$([^$\n]+?)\$/g, " $1 ");
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1 over $2");
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, "square root of $1");
  s = s.replace(/\\[a-zA-Z]+\{([^{}]*)\}/g, "$1");
  s = s.replace(/\\[a-zA-Z]+/g, " ");
  s = s.replace(/[{}^_]/g, " ");
  // HTML tags (in case the reader passes rendered prose in)
  s = s.replace(/<[^>]+>/g, " ");
  // Markdown bold/italic/code stars
  s = s.replace(/[*_`]/g, "");
  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export interface SpeechController {
  stop: () => void;
}

// Kicks off narration for a chunked list of text pieces so the utterance
// queue naturally pauses between sections (browsers insert a small silence
// between successive utterances). `onEnd` fires ONCE, after the last
// utterance completes or the whole queue is cancelled — the caller uses it
// to reset the "Play" button.
export function speak(chunks: string[], uiLang: string, onEnd: () => void): SpeechController {
  if (!isSpeechSupported() || chunks.length === 0) {
    // Nothing to say — fire the end callback synchronously so the UI still
    // resets rather than pinning a Stop button that never releases.
    setTimeout(onEnd, 0);
    return { stop: () => {} };
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  // IELTS Listening passes a real BCP-47 tag ("en-GB") so the clip stays
  // English even when the UI is uk/ru. Short ui codes still go through the map.
  const locale = uiLang.includes("-") ? uiLang : mapUiLangToLocale(uiLang);
  const voice = chooseVoice(locale);
  let cancelled = false;
  const utterances = chunks.map((c) => {
    const u = new SpeechSynthesisUtterance(textForSpeech(c));
    u.lang = locale;
    if (voice) u.voice = voice;
    u.rate = 1;
    u.pitch = 1;
    return u;
  });
  const last = utterances[utterances.length - 1]!;
  last.onend = () => { if (!cancelled) onEnd(); };
  utterances.forEach((u) => synth.speak(u));
  return {
    stop: () => {
      cancelled = true;
      try { synth.cancel(); } catch { /* some browsers throw when nothing is queued */ }
      onEnd();
    },
  };
}
