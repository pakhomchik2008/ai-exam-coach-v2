import { describe, it, expect } from "vitest";
import { bytesToBase64 } from "./bytes-to-base64";

function roundtrip(bytes: Uint8Array): Uint8Array {
  const bin = atob(bytesToBase64(bytes));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

describe("bytesToBase64", () => {
  it("round-trips a small buffer", () => {
    const src = new Uint8Array([0, 1, 2, 254, 255]);
    expect([...roundtrip(src)]).toEqual([...src]);
  });

  // The bug this exists to kill: spreading ~70k bytes into fromCharCode throws
  // RangeError, so a 70 KB PDF never made it to Claude.
  it("encodes a buffer larger than the spread argument ceiling", () => {
    const src = new Uint8Array(70_000);
    src[0] = 37; // '%'
    src[1] = 80; // 'P'
    src[src.length - 1] = 10;
    const out = roundtrip(src);
    expect(out.length).toBe(70_000);
    expect(out[0]).toBe(37);
    expect(out[1]).toBe(80);
    expect(out[out.length - 1]).toBe(10);
  });

  it("returns an empty string for an empty buffer", () => {
    expect(bytesToBase64(new Uint8Array())).toBe("");
  });
});
