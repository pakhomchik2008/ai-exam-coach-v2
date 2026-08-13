// Free vs Pro split for Learn trees.
//
// Coach used to list exam.topics (default 10). The skill tree has the
// real syllabus (47 for NMT math). Same list everywhere; first half free,
// the rest visible but locked. Billing is not live — isProUser() reads
// profile.pro so Hlib can flip it without Stripe.

export function freeTopicLimit(total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.floor(total / 2);
}

export function isPremiumIndex(index: number, total: number): boolean {
  return index >= freeTopicLimit(total);
}

export function isProUser(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & { getProfile?: () => { pro?: boolean } };
  return w.getProfile?.().pro === true;
}

export function topicIsLocked(index: number, total: number): boolean {
  return isPremiumIndex(index, total) && !isProUser();
}
