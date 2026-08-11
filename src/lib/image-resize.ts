/**
 * Client-side image downscaling before it becomes a base64 attachment.
 *
 * Root cause of "Analysis failed" / "Connection hiccup" on 2+ file uploads: a
 * raw phone photo is 2-5 MB, which is 3-7 MB once base64-encoded. Two of those
 * in one JSON request blew past two stacked ceilings at once —
 * `MAX_PAYLOAD_CHARS` in `api/complete.js` (a leftover from when the largest
 * prompt in the app was 12 KB of scraped page text) and, in production,
 * Vercel's hard ~4.5 MB request-body limit on Node serverless functions, which
 * cannot be raised by changing our own code.
 *
 * The fix is not "send less" as a workaround — it is the behavior Anthropic's
 * own docs recommend: Claude downsamples any image to at most 1568px on its
 * longest edge before looking at it, so sending more pixels than that never
 * improves what the model sees and only spends bandwidth, memory, and tokens
 * getting the file there. Resizing client-side down to that ceiling is
 * strictly better for every party.
 */

/** Anthropic's own recommended ceiling — sending more never improves accuracy. */
export const MAX_IMAGE_EDGE_PX = 1568;

const JPEG_QUALITY = 0.82;

export interface ResizedImage {
  readonly base64: string;
  readonly mimeType: string;
  readonly dataUrl: string;
  readonly width: number;
  readonly height: number;
}

/**
 * Resizes a File (assumed to be an image) so neither dimension exceeds
 * `maxEdge`, re-encoding as JPEG. A file already smaller than the ceiling is
 * still re-encoded — that is deliberate: a PNG screenshot can be 5x the bytes
 * of an equivalent JPEG at a quality no human can tell apart in a chat
 * attachment, and the size reduction matters more here than pixel-perfect
 * fidelity.
 */
export async function resizeImageFile(
  file: Blob,
  maxEdge: number = MAX_IMAGE_EDGE_PX,
): Promise<ResizedImage> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });

  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, width, height);

  const outUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return {
    base64: outUrl.split(",")[1] ?? "",
    mimeType: "image/jpeg",
    dataUrl: outUrl,
    width,
    height,
  };
}
