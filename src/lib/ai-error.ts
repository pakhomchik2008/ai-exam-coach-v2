/**
 * Turns an error thrown by `window.claude.complete` into a message worth
 * showing a student, instead of a single generic "try again" for every cause.
 *
 * Before this, StudyHub and AIChat each had a catch block that discarded the
 * real error entirely — a 400 "Payload too large" (attachments over the size
 * cap), a 429 quota message, and a genuine network failure all rendered as the
 * same "Analysis failed" / "Connection hiccup", so a student whose photo was
 * simply too big had no way to know that was the problem.
 *
 * `src/lib/claude-proxy.ts` already carries the real message on `err.message`
 * for every case except a bare network failure (fetch itself rejecting, e.g.
 * offline), which has no `.status` at all — that is the one genuinely unknown
 * case, and is the only one that falls back to a generic phrase here.
 */

interface AiError {
  message?: unknown;
  status?: unknown;
}

type Lang = "en" | "uk" | "ru" | "fr" | "de";

const GENERIC: Record<Lang, string> = {
  en: "Connection hiccup — try again in a moment.",
  uk: "Тимчасовий збій зв'язку — спробуйте за хвилину.",
  ru: "Временный сбой связи — попробуйте через минуту.",
  fr: "Petit souci de connexion — réessayez dans un instant.",
  de: "Kurzer Verbindungsaussetzer — versuch es gleich noch einmal.",
};

function resolveLang(lang: string): Lang {
  return (["en", "uk", "ru", "fr", "de"] as const).includes(lang as Lang) ? (lang as Lang) : "en";
}

/**
 * `err.status` is only ever set by claude-proxy.ts after a real HTTP response
 * came back — so its presence, not its value, is what distinguishes "the
 * server told us something specific" from "the request never completed".
 */
export function describeAiError(err: unknown, lang: string = "en"): string {
  const e = (err ?? {}) as AiError;
  const hasServerMessage = typeof e.status === "number" && typeof e.message === "string" && e.message.length > 0;
  if (hasServerMessage) return e.message as string;
  return GENERIC[resolveLang(lang)];
}
