#!/usr/bin/env python3
"""Rasterise EXAM COACH icons from brand/logo-master.png.

Master is a 1024 navy + gold book. We punch the white corner canvas
to alpha so the rounded square sits on cream or navy chrome, then
resize. iOS marketing icons stay opaque navy — App Store rejects
transparency on 1024.
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
BRAND_OUT = PUBLIC / "brand"
APPICON = BRAND_OUT / "appicon" / "AppIcon.appiconset"
MASTER = ROOT / "brand" / "logo-master.png"

NAVY = (20, 24, 34, 255)
CORNER_R = 180.0  # matches the drawn rounded square on the 1024 master


def save_pil(path: Path, im: Image.Image) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, format="PNG", optimize=True)


def rounded_rect_alpha(size: int, radius: float) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    px = mask.load()
    r = radius
    for y in range(size):
        for x in range(size):
            dx = min(x, size - 1 - x)
            dy = min(y, size - 1 - y)
            if dx >= r or dy >= r:
                px[x, y] = 255
                continue
            dist = math.hypot(r - dx, r - dy) - r
            if dist <= -0.75:
                px[x, y] = 255
            elif dist >= 0.75:
                px[x, y] = 0
            else:
                px[x, y] = int(round(255 * (0.75 - dist) / 1.5))
    return mask


def punch_corners(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    mask = rounded_rect_alpha(rgba.size[0], CORNER_R * (rgba.size[0] / 1024.0))
    rgba.putalpha(mask)
    return rgba


def opaque_navy(im: Image.Image) -> Image.Image:
    bg = Image.new("RGBA", im.size, NAVY)
    return Image.alpha_composite(bg, im.convert("RGBA")).convert("RGB")


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


def scaled(im: Image.Image, size: int) -> Image.Image:
    return im.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    copy_svgs()
    master = punch_corners(Image.open(MASTER))
    cache: dict[int, Image.Image] = {}

    def png_for(size: int) -> Image.Image:
        if size not in cache:
            print(f"  render {size}×{size}")
            cache[size] = scaled(master, size)
        return cache[size]

    for size in (32, 64, 128, 256, 512, 1024):
        save_pil(BRAND_OUT / f"logo-{size}.png", png_for(size))

    save_pil(PUBLIC / "apple-touch-icon.png", opaque_navy(png_for(180) if 180 in cache else scaled(master, 180)))
    cache[180] = scaled(master, 180)

    APPICON.mkdir(parents=True, exist_ok=True)
    (APPICON / "Contents.json").write_text(CONTENTS)
    needed = sorted({s for _, s in IOS_ICONS})
    for size in needed:
        png_for(size)
    for filename, size in IOS_ICONS:
        save_pil(APPICON / filename, opaque_navy(cache[size]))

    print(f"wrote icons → {BRAND_OUT}")


if __name__ == "__main__":
    main()
