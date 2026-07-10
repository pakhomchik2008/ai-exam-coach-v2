// Vercel serverless function — replaces the local AI proxy (localhost:8745)
// that index.html used during development. Reads the API key from a Vercel
// environment variable so it's never present in any file you upload.
//
// Setup on Vercel: Project Settings → Environment Variables →
//   ANTHROPIC_API_KEY = <your key>
// Redeploy after adding it.

// Extend to 60 s so lesson generation (8-12 structured steps) doesn't time out
// on Vercel Hobby. Pro plan supports up to 300 s.
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not set in this Vercel project's environment variables." });
    return;
  }

  const { system, messages, prompt } = req.body || {};
  // Accept either {messages} (from brainComplete) or {prompt} (legacy fallback)
  const msgs = messages || (prompt ? [{ role: "user", content: prompt }] : null);
  if (!msgs) {
    res.status(400).json({ error: "Missing messages or prompt" });
    return;
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8192,
        system,
        messages: msgs,
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data });
      return;
    }
    const text = (data.content || []).map((b) => b.text || "").join("");
    res.status(200).json({ text });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
