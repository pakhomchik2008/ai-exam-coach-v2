import { describe, expect, it, vi, afterEach } from "vitest";
import {
  callOpenAi,
  openAiModelForTier,
  textFromOpenAiChoice,
  toOpenAiMessages,
  usageFromOpenAi,
} from "../../api/_openai.js";

describe("openAiModelForTier", () => {
  it("routes ultra to gpt-4o, everything else to gpt-4o-mini", () => {
    expect(openAiModelForTier("ultra")).toBe("gpt-4o");
    for (const tier of ["free", "sprint", "pro", undefined, null]) {
      expect(openAiModelForTier(tier)).toBe("gpt-4o-mini");
    }
  });
});

describe("toOpenAiMessages", () => {
  it("collapses a string system into a system message", () => {
    const out = toOpenAiMessages("Be terse.", [{ role: "user", content: "hi" }]);
    expect(out[0]).toEqual({ role: "system", content: "Be terse." });
    expect(out[1]).toEqual({ role: "user", content: "hi" });
  });

  it("joins an Anthropic cache-controlled system array into one string", () => {
    const system = [
      { type: "text", text: "Part one." },
      { type: "text", text: "Part two.", cache_control: { type: "ephemeral" } },
    ];
    const out = toOpenAiMessages(system, []);
    expect(out[0]).toEqual({ role: "system", content: "Part one.\n\nPart two." });
  });

  it("omits the system message entirely when there is none", () => {
    const out = toOpenAiMessages(undefined, [{ role: "user", content: "hi" }]);
    expect(out).toEqual([{ role: "user", content: "hi" }]);
  });

  it("converts an Anthropic base64 image block to OpenAI's image_url shape", () => {
    const msgs = [{
      role: "user",
      content: [
        { type: "text", text: "What is this?" },
        { type: "image", source: { type: "base64", media_type: "image/png", data: "AAA=" } },
      ],
    }];
    const out = toOpenAiMessages(null, msgs);
    expect(out[0]?.content).toEqual([
      { type: "text", text: "What is this?" },
      { type: "image_url", image_url: { url: "data:image/png;base64,AAA=" } },
    ]);
  });

  it("drops a block type it doesn't recognize rather than sending it malformed", () => {
    const msgs = [{ role: "user", content: [{ type: "tool_use", id: "x" }, { type: "text", text: "kept" }] }];
    const out = toOpenAiMessages(null, msgs);
    expect(out[0]?.content).toEqual([{ type: "text", text: "kept" }]);
  });
});

describe("textFromOpenAiChoice / usageFromOpenAi", () => {
  it("extracts the assistant reply text", () => {
    const data = { choices: [{ message: { content: "hello" } }] };
    expect(textFromOpenAiChoice(data)).toBe("hello");
  });

  it("returns an empty string for a malformed response, never throws", () => {
    expect(textFromOpenAiChoice({})).toBe("");
    expect(textFromOpenAiChoice(null)).toBe("");
  });

  it("maps OpenAI's usage field names to the shape recordUsage expects", () => {
    const data = { usage: { prompt_tokens: 12, completion_tokens: 34 } };
    expect(usageFromOpenAi(data)).toEqual({ input_tokens: 12, output_tokens: 34 });
  });

  it("returns null usage when the response has none", () => {
    expect(usageFromOpenAi({})).toBeNull();
  });
});

describe("callOpenAi", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns text + mapped usage on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "answer" } }],
        usage: { prompt_tokens: 5, completion_tokens: 7 },
      }),
    }));
    const result = await callOpenAi({ apiKey: "k", model: "gpt-4o-mini", system: null, msgs: [{ role: "user", content: "hi" }], timeoutMs: 1000 });
    expect(result).toEqual({ text: "answer", usage: { input_tokens: 5, output_tokens: 7 } });
  });

  it("throws with OpenAI's own error message on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: "Rate limit exceeded" } }),
    }));
    await expect(callOpenAi({ apiKey: "k", model: "gpt-4o-mini", system: null, msgs: [], timeoutMs: 1000 }))
      .rejects.toThrow("Rate limit exceeded");
  });

  it("throws a generic message when the error body itself is unparseable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error("not json"); },
    }));
    await expect(callOpenAi({ apiKey: "k", model: "gpt-4o-mini", system: null, msgs: [], timeoutMs: 1000 }))
      .rejects.toThrow("OpenAI upstream error (500)");
  });
});
