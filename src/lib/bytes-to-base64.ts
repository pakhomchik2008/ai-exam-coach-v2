/**
 * Chunked Uint8Array → base64.
 *
 * `btoa(String.fromCharCode(...bytes))` throws RangeError once the file is
 * bigger than ~64 KB (the spread hits the JS argument-count ceiling). That is
 * why almost every real PDF in Study Tools / chat attach failed as
 * "could not be read" — the drop itself worked, the encode did not.
 *
 * Chunk size is a multiple of 3 so only the last slice is padded. Concatenating
 * padded chunks (the 8192 size enrichment used) produces invalid base64 that
 * `atob` and Anthropic both reject.
 */

const CHUNK = 8190; // 2730 * 3 — under the spread ceiling, no mid-stream padding

export function bytesToBase64(bytes: Uint8Array): string {
  let b64 = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    b64 += btoa(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
  }
  return b64;
}
