// Vercel serverless function — replaces the local AI proxy (localhost:8745)
// that index.html used during development. Reads the API key from a Vercel
// environment variable so it's never present in any file you upload.
//
// Setup on Vercel: Project Settings → Environment Variables →
//   ANTHROPIC_API_KEY = <your key>
// Redeploy after adding it.
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

  const { system, messages } = req.body || {};
  if (!messages) {
    res.status(400).json({ error: "Missing messages" });
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
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        system,
        messages,
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
