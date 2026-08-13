// Whisper proxy. OPENAI_API_KEY stays on Vercel — the browser only sends
// a short recording and a Supabase token. Same guard as /api/complete so
// a leaked preview URL cannot drain the OpenAI balance.

import { guard, recordUsage } from "./_guard.js";

export const config = { maxDuration: 60 };

// Vercel Node body cap is ~4.5 MB. Base64 inflates ~4/3, so keep the
// decoded audio under ~2.6 MB — a 90s phone memo is well under that.
const MAX_B64_CHARS = 3_500_000;

export default async function handler(req, res) {
  const gate = await guard(req, res, "transcribe");
  if (!gate) return;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY is not set in this Vercel project's environment variables." });
    return;
  }

  const { audio, mime, language } = req.body || {};
  if (!audio || typeof audio !== "string") {
    res.status(400).json({ error: "Missing audio" });
    return;
  }
  if (audio.length > MAX_B64_CHARS) {
    res.status(400).json({ error: "Recording too long. Keep it under 90 seconds." });
    return;
  }

  let bytes;
  try {
    bytes = Buffer.from(audio, "base64");
  } catch {
    res.status(400).json({ error: "Audio was not valid base64." });
    return;
  }
  if (!bytes.length) {
    res.status(400).json({ error: "Empty recording." });
    return;
  }

  const ext = (mime || "").includes("mp4") ? "mp4" : "webm";
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mime || "audio/webm" }), `speech.${ext}`);
  form.append("model", "whisper-1");
  form.append("language", typeof language === "string" && language ? language : "en");

  try {
    const upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const msg = typeof data.error === "string"
        ? data.error
        : (data.error && data.error.message) || "Whisper failed";
      res.status(upstream.status === 401 ? 500 : upstream.status).json({ error: msg });
      return;
    }
    const text = typeof data.text === "string" ? data.text.trim() : "";
    await recordUsage(
      gate.user,
      "transcribe",
      { input_tokens: 0, output_tokens: Math.ceil(text.length / 4) },
      gate.usage && gate.usage.day,
    );
    res.status(200).json({ text });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
