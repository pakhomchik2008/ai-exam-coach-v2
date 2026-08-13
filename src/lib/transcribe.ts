// Client for /api/transcribe. The OpenAI key never leaves Vercel.

const MAX_B64_CHARS = 3_500_000;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the recording"));
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

export async function transcribeAudio(blob: Blob, language = "en"): Promise<string> {
  const audio = await blobToBase64(blob);
  if (audio.length > MAX_B64_CHARS) {
    throw new Error("Recording too long. Keep it under 90 seconds.");
  }
  const getHeaders = (window as unknown as { apiHeaders?: () => Promise<Record<string, string>> }).apiHeaders;
  const headers = getHeaders ? await getHeaders() : { "Content-Type": "application/json" };
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers,
    body: JSON.stringify({ audio, mime: blob.type || "audio/webm", language }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(typeof data.error === "string" ? data.error : "Transcription failed") as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const text = typeof data.text === "string" ? data.text.trim() : "";
  if (!text) throw new Error("Whisper heard nothing. Try again closer to the mic.");
  return text;
}

export function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}
