# Phase 4 asset map

## Logo

Source (edit these, then re-run generators):

- `brand/logo.svg` — app icon (teal square + book + bars + arrow)
- `brand/mark.svg` — mark only, no square (nav / wordmark lockups)
- `brand/wordmark.svg` — Examik / SINCE 2026 lockup (placeholder)
- `brand/generate-icons.py` — rasterises PNG + AppIcon.appiconset
- `brand/generate-sounds.py` — writes WAV, ffmpeg → MP3 + loudnorm

Built (served):

- `public/favicon.svg` — same as logo.svg
- `public/apple-touch-icon.png` — 180×180
- `public/brand/logo.svg`
- `public/brand/mark.svg`
- `public/brand/wordmark.svg`
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
