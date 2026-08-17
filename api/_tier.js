// Phase 5 slice A — which model a request gets, by paid tier.
//
// Decision #113 (docs/phase-5-billing-tiers-plan.md): Ultra gets Sonnet on
// every request, no per-task allowlist, no daily cap. Free/Sprint/Pro always
// get Haiku. Deliberately this simple — do not reintroduce a task param or a
// Sonnet counter unless a future decision reverses #113.

const HAIKU = "claude-haiku-4-5-20251001";
const SONNET = "claude-sonnet-5";

export function modelForTier(tier) {
  return tier === "ultra" ? SONNET : HAIKU;
}

// Sonnet 5 turns adaptive thinking ON unless we say otherwise (Anthropic
// docs, Aug 2026). Thinking tokens count against max_tokens AND wall-clock;
// on Vercel Hobby (hard 60s) that blanks Theory / Exam Sim for Ultra.
// Haiku 4.5 rejects `thinking: {disabled}` with 400 — only attach on Sonnet.
export function thinkingConfigFor(model) {
  return model === SONNET ? { type: "disabled" } : undefined;
}

// Same SUPABASE_URL default used across every api/ function.
const SUPABASE_URL = process.env.SUPABASE_URL || "https://cyftpdiabopydwytyudt.supabase.co";

// Missing table, missing row, or a network hiccup all degrade to 'free' —
// same "never blocks, never crashes" rule as every other graceful-degradation
// path in this app (see CLAUDE.md). Worst case a paying user's request goes
// out on Haiku instead of Sonnet for one call; it never fails the call.
export async function resolveUserTier(user, serviceHeaders) {
  if (!serviceHeaders || !user || !user.id) return "free";
  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${user.id}&select=tier&limit=1`,
      { headers: serviceHeaders },
    );
    if (!resp.ok) return "free";
    const rows = await resp.json();
    const tier = rows[0] && rows[0].tier;
    return tier === "sprint" || tier === "pro" || tier === "ultra" ? tier : "free";
  } catch {
    return "free";
  }
}
