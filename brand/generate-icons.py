#!/usr/bin/env python3
"""Rasterise the EXAM COACH mark into PNG + iOS AppIcon.appiconset.

Why a stdlib PNG writer: we refuse a new dependency for one utility
(see CLAUDE.md). Geometry matches brand/logo.svg: open book, three
rising bars, forecast arrow.
"""
from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
BRAND_OUT = PUBLIC / "brand"
APPICON = BRAND_OUT / "appicon" / "AppIcon.appiconset"

TEAL = (0x1B, 0x4D, 0x4A, 0xFF)
GOLD = (0xD4, 0xB3, 0x6A, 0xFF)
CLEAR = (0, 0, 0, 0)

STROKE = 2.3
CORNER_R = 14.0

BOOK = [(9, 22), (32, 16), (55, 22), (55, 46), (32, 52), (9, 46), (9, 22)]
SPINE = [(32, 16), (32, 52)]
ARROW = [(15, 43), (22, 40), (28, 34), (35, 28), (42, 23), (51, 19)]
HEAD = [(51, 19), (45.6, 17.4), (47.8, 23.2)]
BARS = [
    (19.2, 36.5, 5.6, 9.2),
    (29.2, 30.2, 5.6, 15.5),
    (39.2, 24.2, 5.6, 21.5),
]


def dist2(ax: float, ay: float, bx: float, by: float) -> float:
    dx, dy = ax - bx, ay - by
    return dx * dx + dy * dy


def dist_to_segment(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    vx, vy = bx - ax, by - ay
    length = vx * vx + vy * vy
    if length == 0:
        return math.sqrt(dist2(px, py, ax, ay))
    t = max(0.0, min(1.0, ((px - ax) * vx + (py - ay) * vy) / length))
    return math.sqrt(dist2(px, py, ax + t * vx, ay + t * vy))


def near_poly(px: float, py: float, pts: list[tuple[float, float]], half: float) -> bool:
    for i in range(len(pts) - 1):
        if dist_to_segment(px, py, *pts[i], *pts[i + 1]) <= half:
            return True
    return False


def inside_round_rect(x: float, y: float, size: float) -> bool:
    r = CORNER_R / 64.0 * size
    ix = min(max(x, r), size - r)
    iy = min(max(y, r), size - r)
    if abs(ix - x) < 1e-6 and abs(iy - y) < 1e-6:
        return True
    return dist2(x, y, ix, iy) <= r * r


def inside_rect(px: float, py: float, x: float, y: float, w: float, h: float) -> bool:
    return x <= px <= x + w and y <= py <= y + h


def inside_triangle(px: float, py: float, pts: list[tuple[float, float]]) -> bool:
    (x1, y1), (x2, y2), (x3, y3) = pts
    den = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3)
    if abs(den) < 1e-9:
        return False
    a = ((y2 - y3) * (px - x3) + (x3 - x2) * (py - y3)) / den
    b = ((y3 - y1) * (px - x3) + (x1 - x3) * (py - y3)) / den
    c = 1 - a - b
    return a >= 0 and b >= 0 and c >= 0


def paint(px: float, py: float) -> bool:
    half = STROKE / 2.0
    if near_poly(px, py, BOOK, half) or near_poly(px, py, SPINE, half) or near_poly(px, py, ARROW, half):
        return True
    if inside_triangle(px, py, HEAD):
        return True
    for x, y, w, h in BARS:
        if inside_rect(px, py, x, y, w, h):
            return True
    return False


def render(size: int, background: bool) -> list[list[tuple[int, int, int, int]]]:
    rows = []
    scale = size / 64.0
    for y in range(size):
        row = []
        cy = (y + 0.5) / scale
        for x in range(size):
            cx = (x + 0.5) / scale
            marked = paint(cx, cy)
            if background:
                if not inside_round_rect(x + 0.5, y + 0.5, size):
                    row.append(CLEAR)
                elif marked:
                    row.append(GOLD)
                else:
                    row.append(TEAL)
            else:
                row.append(GOLD if marked else CLEAR)
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
