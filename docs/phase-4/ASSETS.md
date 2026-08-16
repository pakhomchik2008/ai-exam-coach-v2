# Phase 4 asset map

## Logo

Source (edit these, then re-run generators):

- `brand/logo.svg` — app icon only (cream rounded-rect + E). Never a header.
- `brand/mark.svg` — unframed E, tight crop (nav / email / lockup)
- `brand/wordmark.svg` / `brand/lockup.svg` — horizontal E + Examik
- `brand/generate-icons.py` — rasterises PNG + AppIcon.appiconset
- `brand/generate-lockup.swift` — 1200×630 OG PNG
- `brand/generate-sounds.py` — writes WAV, ffmpeg → MP3 + loudnorm

Built (served):

- `public/favicon.svg` — same as logo.svg (framed)
- `public/apple-touch-icon.png` — 180×180
- `public/brand/logo.svg`
- `public/brand/mark.svg`
- `public/brand/mark-48.png` — unframed E for email (Gmail drops SVG)
- `public/brand/wordmark.svg`
- `public/brand/lockup.svg`
- `public/brand/lockup-og.png` — Open Graph / Twitter
- `public/brand/logo-{32,64,128,256,512,1024}.png`
- `public/brand/appicon/AppIcon.appiconset/` — iOS sizes for Phase 5

Palettes (mega-prompt 4.1):

| Role | Light | Dark |
|---|---|---|
| Background | `#FAFAF9` | `#0B0C0D` |
| Ink | `#0E0F10` | `#F5F5F4` |
| Accent | Deep Teal `#1B4D4A` | Warm Amber `#F3D062` |

## Sounds

Mixed near -18 LUFS. Default off in Settings.

| File | Length | Use |
|---|---|---|
| `tap` | ~12ms | button press |
| `select` | ~40ms | option selected |
| `correct` | ~220ms | right answer |
| `wrong` | ~180ms | wrong answer (muted, never harsh) |
| `complete` | ~500ms | exam / prove finished |
| `level` | ~700ms | tier change |

Play only through `src/lib/sounds.ts` (`playSound` / `previewSound`).
