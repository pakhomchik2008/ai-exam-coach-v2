// OpenAI fallback for api/complete.js — an emergency contingency for when
// the Anthropic account is out of credit or unreachable, not a second
// permanent vendor. Every prompt in this app (Socratic tone, JSON schemas,
// language directives in ai-brain.jsx) is tuned against Claude; GPT answers
// through this path may read slightly different. That trade is accepted on
// purpose — a lapsed balance degrading answer quality for a few requests
// beats the whole app going down.
//
// Model mapping mirrors _tier.js's Haiku/Sonnet split: gpt-4o-mini stands in
// for Haiku (Free/Sprint/Pro), gpt-4o stands in for Sonnet (Ultra).

export function openAiModelForTier(tier) {
  return tier === "ultra" ? "gpt-4o" : "gpt-4o-mini";
}

// Anthropic's `system` is a plain string or an array of cache-controlled
// text blocks; OpenAI just wants one system message string.
function systemText(system) {
  if (!system) return "";
  if (typeof system === "string") return system;
  if (Array.isArray(system)) return system.map((b) => (b && typeof b.text === "string" ? b.text : "")).join("\n\n");
  return "";
}

// Anthropic content blocks -> OpenAI content blocks. Anything neither text
// nor a base64 image is dropped rather than sent malformed — a slightly
// incomplete fallback answer beats a hard failure on both providers.
function convertBlock(block) {
  if (!block || typeof block !== "object") return null;
  if (block.type === "text") return { type: "text", text: block.text || "" };
  if (block.type === "image" && block.source && block.source.type === "base64") {
    return { type: "image_url", image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` } };
  }
  return null;
}

function convertContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map(convertBlock).filter(Boolean);
}

export function toOpenAiMessages(system, msgs) {
  const out = [];
  const sys = systemText(system);
  if (sys) out.push({ role: "system", content: sys });
  for (const m of msgs || []) out.push({ role: m.role, content: convertContent(m.content) });
  return out;
}

export function textFromOpenAiChoice(data) {
  const choice = data && Array.isArray(data.choices) && data.choices[0];
  return (choice && choice.message && choice.message.content) || "";
}

// Same shape recordUsage() already expects from Anthropic's usage object —
// mapped here so complete.js's billing call needs no provider branching.
export function usageFromOpenAi(data) {
  const u = data && data.usage;
  if (!u) return null;
  return { input_tokens: u.prompt_tokens || 0, output_tokens: u.completion_tokens || 0 };
}

export async function callOpenAi({ apiKey, model, system, msgs, timeoutMs }) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, max_tokens: 8192, messages: toOpenAiMessages(system, msgs) }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok) {
    const msg = (data && data.error && data.error.message) || `OpenAI upstream error (${resp.status})`;
    throw new Error(msg);
  }
  return { text: textFromOpenAiChoice(data), usage: usageFromOpenAi(data) };
}
