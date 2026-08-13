/**
 * IELTS Listening is an audio paper. Quick Check must not serve silent
 * reading items for that section. Speaking is out of scope (no mic / no
 * Whisper) — hide it so we don't pretend we can coach it.
 */

export function isIeltsQual(qualificationId: string | null | undefined): boolean {
  return (qualificationId || "").toLowerCase() === "ielts";
}

export function isIeltsListeningTopic(
  topic: string | null | undefined,
  qualificationId?: string | null,
): boolean {
  if (!isIeltsQual(qualificationId)) return false;
  return /(listen|ауді|аудир)/i.test(topic || "");
}

export function isIeltsSpeakingTopic(
  topic: string | null | undefined,
  qualificationId?: string | null,
): boolean {
  if (!isIeltsQual(qualificationId)) return false;
  return /(speaking|говоріння|говорение|cue[- ]card)/i.test(topic || "");
}

export function dropIeltsSpeakingTopics<T>(
  items: readonly T[],
  nameOf: (item: T) => string,
  qualificationId?: string | null,
): T[] {
  if (!isIeltsQual(qualificationId)) return items.slice();
  return items.filter((item) => !isIeltsSpeakingTopic(nameOf(item), qualificationId));
}
