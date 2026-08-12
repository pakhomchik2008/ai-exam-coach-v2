#!/usr/bin/env python3
"""Rasterise the exam.coach mark into PNG + iOS AppIcon.appiconset.

Why a stdlib PNG writer: we refuse a new dependency for one utility
(see CLAUDE.md). The geometry matches brand/logo.svg exactly.
"""
from __future__ import annotations

import math
import os
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
BRAND_OUT = PUBLIC / "brand"
APPICON = BRAND_OUT / "appicon" / "AppIcon.appiconset"

TEAL = (0x1B, 0x4D, 0x4A, 0xFF)
LINE = (0xF5, 0xF5, 0xF4, 0xFF)
AMBER = (0xF3, 0xD0, 0x62, 0xFF)
CLEAR = (0, 0, 0, 0)

# ViewBox 64 coordinates from brand/logo.svg
POINTS = [(10, 48), (18, 40), (28, 42), (36, 28), (46, 24), (54, 14)]
STROKE = 3.2
DIAMOND_C = (54.3, 13.5)
DIAMOND_HALF = 4.4  # diagonal of 6.2 square / √2 ≈ 4.38
CORNER_R = 14.0


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def dist2(ax: float, ay: float, bx: float, by: float) -> float:
    dx, dy = ax - bx, ay - by
    return dx * dx + dy * dy


def dist_to_segment(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    vx, vy = bx - ax, by - ay
    len2 = vx * vx + vy * vy
    if len2 == 0:
        return math.sqrt(dist2(px, py, ax, ay))
    t = max(0.0, min(1.0, ((px - ax) * vx + (py - ay) * vy) / len2))
    return math.sqrt(dist2(px, py, ax + t * vx, ay + t * vy))


def inside_round_rect(x: float, y: float, size: float) -> bool:
    r = CORNER_R / 64.0 * size
    # clamp point into the inner rectangle, then measure leftover
    ix = min(max(x, r), size - r)
    iy = min(max(y, r), size - r)
    # if the clamped point is the pixel itself, we're in the body
    if abs(ix - x) < 1e-6 and abs(iy - y) < 1e-6:
        return True
    return dist2(x, y, ix, iy) <= r * r


def inside_diamond(x: float, y: float, size: float) -> bool:
    s = size / 64.0
    cx, cy = DIAMOND_C[0] * s, DIAMOND_C[1] * s
    h = DIAMOND_HALF * s
    return abs(x - cx) + abs(y - cy) <= h


def near_polyline(x: float, y: float, size: float) -> bool:
    s = size / 64.0
    half = (STROKE / 2.0) * s
    pts = [(p[0] * s, p[1] * s) for p in POINTS]
    for i in range(len(pts) - 1):
        if dist_to_segment(x, y, *pts[i], *pts[i + 1]) <= half:
            return True
    return False


def render(size: int, background: bool) -> list[list[tuple[int, int, int, int]]]:
    rows = []
    for y in range(size):
        row = []
        cy = y + 0.5
        for x in range(size):
            cx = x + 0.5
            if background:
                if not inside_round_rect(cx, cy, size):
                    row.append(CLEAR)
                    continue
                if inside_diamond(cx, cy, size):
                    row.append(AMBER)
                elif near_polyline(cx, cy, size):
                    row.append(LINE)
                else:
                    row.append(TEAL)
            else:
                if inside_diamond(cx, cy, size):
                    row.append(AMBER)
                elif near_polyline(cx, cy, size):
                    row.append(TEAL)
                else:
                    row.append(CLEAR)
        rows.append(row)
    return rows


def write_png(path: Path, rows: list[list[tuple[int, int, int, int]]]) -> None:
    h = len(rows)
    w = len(rows[0])
    raw = bytearray()
    for row in rows:
        raw.append(0)
        for r, g, b, a in row:
            raw.extend((r, g, b, a))

    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


IOS_ICONS = [
    ("Icon-20.png", 20),
    ("Icon-20@2x.png", 40),
    ("Icon-20@3x.png", 60),
    ("Icon-29.png", 29),
    ("Icon-29@2x.png", 58),
    ("Icon-29@3x.png", 87),
    ("Icon-40.png", 40),
    ("Icon-40@2x.png", 80),
    ("Icon-40@3x.png", 120),
    ("Icon-60@2x.png", 120),
    ("Icon-60@3x.png", 180),
    ("Icon-76.png", 76),
    ("Icon-76@2x.png", 152),
    ("Icon-83.5@2x.png", 167),
    ("Icon-1024.png", 1024),
]

CONTENTS = """{
  "images": [
    {"idiom": "iphone", "size": "20x20", "scale": "2x", "filename": "Icon-20@2x.png"},
    {"idiom": "iphone", "size": "20x20", "scale": "3x", "filename": "Icon-20@3x.png"},
    {"idiom": "iphone", "size": "29x29", "scale": "2x", "filename": "Icon-29@2x.png"},
    {"idiom": "iphone", "size": "29x29", "scale": "3x", "filename": "Icon-29@3x.png"},
    {"idiom": "iphone", "size": "40x40", "scale": "2x", "filename": "Icon-40@2x.png"},
    {"idiom": "iphone", "size": "40x40", "scale": "3x", "filename": "Icon-40@3x.png"},
    {"idiom": "iphone", "size": "60x60", "scale": "2x", "filename": "Icon-60@2x.png"},
    {"idiom": "iphone", "size": "60x60", "scale": "3x", "filename": "Icon-60@3x.png"},
    {"idiom": "ipad", "size": "20x20", "scale": "1x", "filename": "Icon-20.png"},
    {"idiom": "ipad", "size": "20x20", "scale": "2x", "filename": "Icon-20@2x.png"},
    {"idiom": "ipad", "size": "29x29", "scale": "1x", "filename": "Icon-29.png"},
    {"idiom": "ipad", "size": "29x29", "scale": "2x", "filename": "Icon-29@2x.png"},
    {"idiom": "ipad", "size": "40x40", "scale": "1x", "filename": "Icon-40.png"},
    {"idiom": "ipad", "size": "40x40", "scale": "2x", "filename": "Icon-40@2x.png"},
    {"idiom": "ipad", "size": "76x76", "scale": "1x", "filename": "Icon-76.png"},
    {"idiom": "ipad", "size": "76x76", "scale": "2x", "filename": "Icon-76@2x.png"},
    {"idiom": "ipad", "size": "83.5x83.5", "scale": "2x", "filename": "Icon-83.5@2x.png"},
    {"idiom": "ios-marketing", "size": "1024x1024", "scale": "1x", "filename": "Icon-1024.png"}
  ],
  "info": {"version": 1, "author": "exam.coach"}
}
"""


def copy_svgs() -> None:
    src = ROOT / "brand"
    BRAND_OUT.mkdir(parents=True, exist_ok=True)
    for name in ("logo.svg", "mark.svg", "wordmark.svg"):
        (BRAND_OUT / name).write_bytes((src / name).read_bytes())
    (PUBLIC / "favicon.svg").write_bytes((src / "logo.svg").read_bytes())


def main() -> None:
    copy_svgs()
    cache: dict[int, list] = {}

    def png_for(size: int):
        if size not in cache:
            print(f"  render {size}×{size}")
            cache[size] = render(size, background=True)
        return cache[size]

    for size in (32, 64, 128, 256, 512, 1024):
        write_png(BRAND_OUT / f"logo-{size}.png", png_for(size))

    write_png(PUBLIC / "apple-touch-icon.png", png_for(180) if 180 in cache else render(180, True))

    APPICON.mkdir(parents=True, exist_ok=True)
    (APPICON / "Contents.json").write_text(CONTENTS)
    needed = sorted({s for _, s in IOS_ICONS})
    for size in needed:
        png_for(size)
    for filename, size in IOS_ICONS:
        write_png(APPICON / filename, cache[size])

    print(f"wrote icons → {BRAND_OUT}")


if __name__ == "__main__":
    main()
