/**
 * IELTS Listening is an audio paper. Quick Check must not serve silent
 * reading items for that section. Speaking used to be hidden (no mic).
 * 3.7g un-hid it — dropIeltsSpeakingTopics is now a no-op so old callers
 * keep compiling.
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
  void nameOf;
  void qualificationId;
  return items.slice();
}
