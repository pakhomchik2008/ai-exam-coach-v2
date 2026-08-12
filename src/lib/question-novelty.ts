/**
 * Novelty engine, phase one (audit/Phase 3 §3.1 in docs/phase-3-plan.md):
 * exact/near-exact dedup via a normalized hash, not the embeddings +
 * pgvector cosine-similarity pipeline the original mega-prompt spec
 * describes — Anthropic has no embeddings endpoint (a spec error), and
 * adding OpenAI as a second AI vendor for one feature isn't an autonomous
 * call. See Decision Log #39.
 *
 * This catches the actual failure mode observed today: every question
 * generator in AIChat.jsx relies entirely on in-prompt instructions like
 * "no duplicate concepts" — a single LLM call trusting itself, with zero
 * memory of anything served in a PREVIOUS session. A shared, hash-keyed
 * table gives that memory back without an embeddings dependency.
 *
 * Split the same way as sync-reconcile.ts / data-sync.ts: pure, testable
 * logic here; the Supabase round-trip is the thin glue in checkAndRecordQuestion.
 */

const TABLE_BANK = "ai_question_bank";
const TABLE_SEEN = "user_seen_questions";

/**
 * Strips whitespace/punctuation/case differences so two questions that are
 * the same concept phrased slightly differently still hash identically.
 * Deliberately aggressive (drops all non-alphanumeric separators) — a false
 * "duplicate" just costs one retry; a missed duplicate is the actual bug
 * this module exists to fix, so this errs toward over-matching.
 */
export function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** SHA-256 of the normalized text, hex-encoded. Deterministic, no salt — two
 * identical questions from two different generation calls must hash equal. */
export async function hashQuestionText(text: string): Promise<string> {
  const normalized = normalizeQuestionText(text);
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface NoveltyResult {
  /** True if this exact question (by normalized hash) already exists in the
   * shared bank for this exam — the caller should retry generation. */
  readonly duplicate: boolean;
}

interface SupabaseLike {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> };
      };
    };
    insert: (row: Record<string, unknown>) => {
      select: (cols: string) => { single: () => Promise<{ data: unknown; error: unknown }> };
    } & Promise<{ error: unknown }>;
    upsert: (
      row: Record<string, unknown>,
      opts?: { onConflict?: string; ignoreDuplicates?: boolean },
    ) => Promise<{ error: unknown }>;
  };
}

/**
 * Checks whether a just-generated question is a duplicate of one already in
 * the shared bank for this exam, and records it either way (as a bank entry
 * if new, or as "this student has now seen it" if not).
 *
 * Degrades to `{ duplicate: false }` on any Supabase error — including the
 * table not existing yet (same PGRST205 pattern as Phase 2c's sync layer:
 * the migration is written but Hlib hasn't run it) — so a novelty-engine
 * outage or a not-yet-applied migration never blocks question generation,
 * only loses the dedup benefit.
 */
export async function checkAndRecordQuestion(
  sb: SupabaseLike,
  userId: string,
  examTaxonomy: string,
  topic: string | null,
  questionText: string,
): Promise<NoveltyResult> {
  let hash: string;
  try {
    hash = await hashQuestionText(questionText);
  } catch {
    return { duplicate: false }; // no Web Crypto available — never block on it
  }

  try {
    const existing = await sb.from(TABLE_BANK).select("id").eq("exam_taxonomy", examTaxonomy).eq("question_hash", hash).maybeSingle();
    if (existing.error) return { duplicate: false };

    const existingRow = existing.data as { id: string } | null;
    if (existingRow) {
      await sb.from(TABLE_SEEN).upsert(
        { user_id: userId, question_id: existingRow.id },
        { onConflict: "user_id,question_id", ignoreDuplicates: true },
      );
      return { duplicate: true };
    }

    const inserted = await sb
      .from(TABLE_BANK)
      .insert({ exam_taxonomy: examTaxonomy, topic, question_hash: hash, question_text: questionText })
      .select("id")
      .single();
    if (inserted.error) {
      // Most likely a race — another concurrent call inserted the same hash
      // between our SELECT and this INSERT. Treat as "not proven duplicate"
      // rather than retrying again on a second round-trip; the far more
      // common case (a genuinely new question) must not pay this cost.
      return { duplicate: false };
    }
    const insertedRow = inserted.data as { id: string };
    await sb.from(TABLE_SEEN).insert({ user_id: userId, question_id: insertedRow.id });
    return { duplicate: false };
  } catch {
    return { duplicate: false };
  }
}
